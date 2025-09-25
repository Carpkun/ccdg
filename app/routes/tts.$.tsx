import type { LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "../lib/supabase";

// 이 라우트는 이제 사용하지 않습니다.
// TTS 데이터는 데이터베이스에서 Base64 형태로 직접 제공됩니다.
export async function loader({ params, request }: LoaderFunctionArgs) {
  const splat = params["*"];
  
  if (!splat) {
    return new Response("발견되지 않음", { status: 404 });
  }

  // 레거시 TTS 파일 요청에 대한 안내
  const message = {
    error: "Legacy TTS file not found",
    message: "TTS 파일이 새로운 형식으로 이전되었습니다.",
    instruction: "음성 재생 버튼을 다시 눌러 새로 TTS를 생성해주세요.",
    requestedFile: splat,
    newEndpoint: "/api/tts/cached"
  };
  
  return Response.json(message, {
    status: 410, // Gone - 더 이상 사용되지 않는 리소스
    headers: {
      "Content-Type": "application/json",
    },
  });
}
