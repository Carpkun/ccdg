import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { v4 as uuidv4 } from "uuid";

import type { Route } from "./+types/admin.upload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf'
];

export async function action({ request }: Route.ActionArgs) {
  await requireUserId(request);

  if (request.method !== 'POST') {
    return Response.json({ success: false, message: '잘못된 요청 메서드입니다.' }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ success: false, message: '파일이 선택되지 않았습니다.' });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ 
        success: false, 
        message: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.` 
      });
    }

    // 파일 타입 검증
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return Response.json({ 
        success: false, 
        message: '지원하지 않는 파일 형식입니다. 이미지, 비디오, PDF 파일만 업로드 가능합니다.' 
      });
    }

    const supabase = createSupabaseAdminClient();

    // 파일명 생성 (UUID + 원본 확장자)
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `uploads/${fileName}`;

    // Supabase Storage에 파일 업로드
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return Response.json({ 
        success: false, 
        message: '파일 업로드 중 오류가 발생했습니다.' 
      });
    }

    // 공개 URL 가져오기
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(uploadData.path);

    if (!publicUrlData?.publicUrl) {
      console.error('Failed to get public URL');
      return Response.json({ 
        success: false, 
        message: '파일 URL 생성에 실패했습니다.' 
      });
    }

    // 성공 응답
    return Response.json({
      success: true,
      message: '파일이 성공적으로 업로드되었습니다.',
      url: publicUrlData.publicUrl,
      fileName: fileName,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

  } catch (error) {
    console.error('File upload error:', error);
    return Response.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}