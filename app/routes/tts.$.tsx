import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "../lib/supabase";

// 이 라우트는 이제 사용하지 않습니다.
// TTS 데이터는 데이터베이스에서 Base64 형태로 직접 제공됩니다.
export async function loader({ params, request }: LoaderFunctionArgs) {
  // 이전 파일 기반 TTS를 위한 호환성 유지
  // 실제로는 /api/tts/cached를 사용하세요
  
  return new Response("TTS 파일은 이제 /api/tts/cached API를 통해 제공됩니다.", {
    status: 410, // Gone
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
