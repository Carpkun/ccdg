import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/react-router/vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter({ presets: [vercelPreset()] }), tsconfigPaths()],
  ssr: {
    noExternal: [],
    external: ['@google-cloud/text-to-speech', 'fs', 'path', 'crypto'],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Google Cloud 라이브러리는 서버 사이드에서만 사용
        if (id.includes('@google-cloud/text-to-speech')) return true;
        if (id.includes('google-gax')) return true;
        if (id.includes('google-auth-library')) return true;
        if (id.includes('@grpc/grpc-js')) return true;
        if (id.includes('node-fetch')) return true;
        return false;
      },
    },
  },
});
