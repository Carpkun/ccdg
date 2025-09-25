import type { LoaderFunctionArgs } from "react-router";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const splat = params["*"];
  
  if (!splat) {
    throw new Response("Not Found", { status: 404 });
  }

  const filePath = path.join(process.cwd(), "public", "tts", splat);

  if (!existsSync(filePath)) {
    throw new Response("Not Found", { status: 404 });
  }

  const stat = statSync(filePath);
  const stream = createReadStream(filePath);

  return new Response(stream as any, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": stat.size.toString(),
      "Cache-Control": "public, max-age=31536000", // 1년 캐시
    },
  });
}