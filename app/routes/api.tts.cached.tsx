import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createSupabaseServerClient } from "../lib/supabase";
import { cleanTextForTTS } from "../utils/htmlUtils";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Google Cloud TTS 클라이언트 초기화
let ttsClient: TextToSpeechClient;
try {
  // 서버리스 환경에서는 JSON 환경변수 사용, 로컬에서는 파일 사용
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    : undefined;
    
  ttsClient = new TextToSpeechClient({
    ...(credentials ? { credentials } : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
} catch (error) {
  console.error('Google Cloud TTS 초기화 실패:', error);
}

// UTF-8 바이트 길이 계산
const getByteLength = (str: string): number => {
  return Buffer.byteLength(str, 'utf8');
};

// 텍스트를 청크로 분할 (5000 바이트 제한)
const splitTextIntoChunks = (text: string, maxBytes: number = 4500): string[] => {
  if (getByteLength(text) <= maxBytes) {
    return [text];
  }

  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let chunkEnd = currentIndex + Math.floor(maxBytes / 3); // 한글 기준 대략적 초기값
    
    // 바이트 기준으로 조정
    let chunk = text.slice(currentIndex, Math.min(chunkEnd, text.length));
    while (getByteLength(chunk) > maxBytes && chunk.length > 1) {
      chunk = chunk.slice(0, -1);
    }
    chunkEnd = currentIndex + chunk.length;
    
    // 마지막 청크가 아니라면 문장 경계에서 자르기
    if (chunkEnd < text.length) {
      const sentenceEnds = ['.', '!', '?', '。', '！', '？'];
      let bestCutPoint = chunkEnd;
      
      // 문장 경계 찾기 (바이트 제한의 80% 이상에서)
      const minCutPoint = currentIndex + Math.floor(chunk.length * 0.8);
      for (let i = chunkEnd - 1; i > minCutPoint; i--) {
        if (sentenceEnds.includes(text[i])) {
          bestCutPoint = i + 1;
          break;
        }
      }
      
      // 문장 경계를 찾지 못하면 공백 찾기
      if (bestCutPoint === chunkEnd) {
        const minCutPoint2 = currentIndex + Math.floor(chunk.length * 0.9);
        for (let i = chunkEnd - 1; i > minCutPoint2; i--) {
          if (text[i] === ' ' || text[i] === '\n') {
            bestCutPoint = i;
            break;
          }
        }
      }
      
      chunkEnd = bestCutPoint;
    }
    
    const finalChunk = text.slice(currentIndex, chunkEnd).trim();
    if (finalChunk.length > 0) {
      chunks.push(finalChunk);
    }
    currentIndex = chunkEnd;
  }

  return chunks;
};

// 단일 청크 TTS 생성
const generateChunkAudio = async (chunkText: string): Promise<Buffer> => {
  const request = {
    input: { text: chunkText },
    voice: {
      languageCode: 'ko-KR',
      name: 'ko-KR-Neural2-A',
      ssmlGender: 'FEMALE' as const,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0,
    },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  
  if (!response.audioContent) {
    throw new Error('오디오 생성에 실패했습니다.');
  }

  return Buffer.from(response.audioContent);
};

// 여러 오디오 버퍼를 하나로 합치기 (간단한 방식)
const combineAudioBuffers = (buffers: Buffer[]): Buffer => {
  return Buffer.concat(buffers);
};

// 파일명 생성 (콘텐츠 ID + 텍스트 해시)
const generateFileName = (contentId: string, text: string): string => {
  const textHash = crypto.createHash('md5').update(text).digest('hex').substring(0, 8);
  return `${contentId}_${textHash}.mp3`;
};

// GET: 캐시된 TTS 파일 조회
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const contentId = url.searchParams.get('contentId');

    if (!contentId) {
      return Response.json(
        { error: 'contentId가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient(request);

    // 데이터베이스에서 TTS 정보 조회
    const { data: content, error } = await supabase
      .from('contents')
      .select('tts_url, tts_duration, tts_status')
      .eq('id', contentId)
      .single();

    if (error) {
      return Response.json(
        { error: '콘텐츠를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (content.tts_status === 'completed' && content.tts_url) {
      // 파일이 실제로 존재하는지 확인
      const filePath = path.join(process.cwd(), 'public', content.tts_url);
      if (fs.existsSync(filePath)) {
        return Response.json({
          status: 'cached',
          url: content.tts_url,
          duration: content.tts_duration
        });
      }
    }

    return Response.json({
      status: content.tts_status || 'pending'
    });

  } catch (error) {
    console.error('TTS 캐시 조회 오류:', error);
    return Response.json(
      { error: 'TTS 캐시 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// POST: TTS 파일 생성 및 캐싱
export async function action({ request }: ActionFunctionArgs) {
  try {
    // 환경 변수 확인
    const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!hasCredentials || !process.env.GOOGLE_CLOUD_PROJECT_ID) {
      return Response.json(
        { error: 'Google Cloud 설정이 누락되었습니다.' },
        { status: 500 }
      );
    }

    const { contentId, text } = await request.json();

    if (!contentId || !text) {
      return Response.json(
        { error: 'contentId와 text가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient(request);

    // TTS 생성 상태를 'generating'으로 업데이트
    await supabase
      .from('contents')
      .update({ tts_status: 'generating' })
      .eq('id', contentId);

    const cleanText = cleanTextForTTS(text);
    const textChunks = splitTextIntoChunks(cleanText);

    // 모든 청크를 병렬로 처리
    const audioBuffers = await Promise.all(
      textChunks.map(chunk => generateChunkAudio(chunk))
    );

    // 모든 오디오를 하나로 합치기
    const combinedAudio = combineAudioBuffers(audioBuffers);
    
    // 파일 저장
    const fileName = generateFileName(contentId, cleanText);
    const relativePath = `tts/${fileName}`;
    const filePath = path.join(process.cwd(), 'public', relativePath);
    
    fs.writeFileSync(filePath, combinedAudio);
    
    // 대략적인 재생 시간 계산 (글자 수 기준)
    const estimatedDuration = Math.ceil(cleanText.length / 10);
    
    // 데이터베이스에 TTS 정보 저장
    const { error: updateError } = await supabase
      .from('contents')
      .update({
        tts_url: `/${relativePath}`,
        tts_duration: estimatedDuration,
        tts_generated_at: new Date().toISOString(),
        tts_file_size: combinedAudio.length,
        tts_chunks_count: textChunks.length,
        tts_status: 'completed'
      })
      .eq('id', contentId);

    if (updateError) {
      return Response.json(
        { error: '데이터베이스 업데이트에 실패했습니다.' },
        { status: 500 }
      );
    }


    return Response.json({
      success: true,
      url: `/${relativePath}`,
      duration: estimatedDuration,
      chunks: textChunks.length,
      fileSize: combinedAudio.length
    });

  } catch (error) {
    console.error('TTS 생성 오류:', error);
    
    // 실패 상태로 업데이트
    try {
      const { contentId } = await request.json();
      if (contentId) {
        const supabase = createSupabaseServerClient(request);
        await supabase
          .from('contents')
          .update({ tts_status: 'failed' })
          .eq('id', contentId);
      }
    } catch (parseError) {
      // 실패 상태 업데이트 중 오류 발생
    }

    return Response.json(
      { error: 'TTS 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}