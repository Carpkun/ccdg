import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { createSupabaseServerClient } from "../lib/supabase";
import { cleanTextForTTS } from "../utils/htmlUtils";

// Google Cloud TTS 클라이언트 초기화
let ttsClient: TextToSpeechClient | null = null;
let initError: string | null = null;

try {
  // 환경 변수 확인
  const hasCredentialsJson = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const hasCredentialsFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasProjectId = !!process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  console.log('TTS 초기화 환경 변수 상태:', {
    hasCredentialsJson,
    hasCredentialsFile,
    hasProjectId,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  });
  
  if (!hasProjectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID 환경 변수가 설정되지 않음');
  }
  
  if (!hasCredentialsJson && !hasCredentialsFile) {
    throw new Error('Google Cloud 인증 정보가 설정되지 않음 (GOOGLE_APPLICATION_CREDENTIALS_JSON 또는 GOOGLE_APPLICATION_CREDENTIALS 필요)');
  }
  
  // 서버리스 환경에서는 JSON 환경변수 사용, 로컬에서는 파일 사용
  const credentials = hasCredentialsJson
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!)
    : undefined;
    
  ttsClient = new TextToSpeechClient({
    ...(credentials ? { credentials } : { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
  
  console.log('Google Cloud TTS 클라이언트 초기화 성공');
  
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  initError = `Google Cloud TTS 초기화 실패: ${errorMessage}`;
  console.error(initError, error);
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
  if (!ttsClient) {
    throw new Error('TTS 클라이언트가 초기화되지 않음');
  }
  
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

// 텍스트 해시 생성 (Web Crypto API 사용)
const generateTextHash = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 8);
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
      // 레거시 파일 경로 감지 (파일 시스템 기반 TTS)
      if (content.tts_url.startsWith('/tts/') && content.tts_url.endsWith('.mp3')) {
        console.log(`Legacy TTS URL detected for content ${contentId}: ${content.tts_url}`);
        // 레거시 파일은 pending 상태로 처리하여 새로 생성
        await supabase
          .from('contents')
          .update({ tts_status: 'pending', tts_url: null })
          .eq('id', contentId);
          
        return Response.json({
          status: 'pending',
          message: 'Legacy TTS detected, will regenerate'
        });
      }
      
      return Response.json({
        status: 'cached',
        url: content.tts_url,
        duration: content.tts_duration
      });
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
    // TTS 클라이언트 초기화 상태 확인
    if (initError || !ttsClient) {
      console.error('TTS 생성 시도 시 초기화 오류:', initError);
      return Response.json(
        { 
          error: initError || 'Google Cloud TTS 클라이언트가 초기화되지 않음',
          details: '환경 변수 설정을 확인하세요: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS_JSON'
        },
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
    
    // Base64로 인코딩 (서버리스 환경에서 파일 시스템 대신 데이터베이스에 저장)
    const base64Audio = combinedAudio.toString('base64');
    const audioDataUrl = `data:audio/mp3;base64,${base64Audio}`;
    
    // 대략적인 재생 시간 계산 (글자 수 기준)
    const estimatedDuration = Math.ceil(cleanText.length / 10);
    
    // 데이터베이스에 TTS 정보 저장 (데이터 URL 방식으로 저장)
    const { error: updateError } = await supabase
      .from('contents')
      .update({
        tts_url: audioDataUrl,
        tts_duration: estimatedDuration,
        tts_generated_at: new Date().toISOString(),
        tts_file_size: combinedAudio.length,
        tts_chunks_count: textChunks.length,
        tts_status: 'completed'
      })
      .eq('id', contentId);

    if (updateError) {
      console.error('데이터베이스 업데이트 오류:', updateError);
      return Response.json(
        { 
          error: '데이터베이스 업데이트에 실패했습니다.',
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      );
    }


    return Response.json({
      success: true,
      url: audioDataUrl,
      duration: estimatedDuration,
      chunks: textChunks.length,
      fileSize: combinedAudio.length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('TTS 생성 오류:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      contentId: contentId || 'unknown',
      textLength: text?.length || 0
    });
    
    // 실패 상태로 업데이트
    try {
      const supabase = createSupabaseServerClient(request);
      if (contentId) {
        await supabase
          .from('contents')
          .update({ tts_status: 'failed' })
          .eq('id', contentId);
      }
    } catch (updateFailedError) {
      console.error('실패 상태 업데이트 오류:', updateFailedError);
    }

    return Response.json(
      { 
        error: 'TTS 생성 중 오류가 발생했습니다.',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
