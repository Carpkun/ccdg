import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/react-router/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter({
      presets: [vercelPreset()],
    }),
    tsconfigPaths()
  ],
  ssr: {
    noExternal: [],
    external: [
      '@google-cloud/text-to-speech',
      'google-gax',
      'google-auth-library',
      '@grpc/grpc-js'
    ],
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Node.js 내장 모듈들을 서버에서만 사용
        if (['fs', 'path', 'crypto'].includes(id)) {
          return false; // 서버리스에서는 사용하지 않음
        }
        // Google Cloud 라이브러리는 서버 사이드에서만 사용
        if (id.includes('@google-cloud/text-to-speech')) return true;
        if (id.includes('google-gax')) return true;
        if (id.includes('google-auth-library')) return true;
        if (id.includes('@grpc/grpc-js')) return true;
        return false;
      },
      onwarn(warning, warn) {
        // 순환 의존성 경고 표시
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          console.warn('Circular dependency detected:', warning.message);
        }
        // 다른 경고도 표시
        warn(warning);
      },
    },
    sourcemap: true, // 소스맵 생성으로 디버깅 개선
    minify: 'esbuild', // 더 빠른 번들링
    target: 'es2020', // 최신 브라우저 지원
  },
});
