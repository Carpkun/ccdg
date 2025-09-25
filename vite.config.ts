import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/react-router/vite";

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    reactRouter({
      presets: [vercelPreset()],
    }),
    tsconfigPaths()
  ],
  
  // 환경별 로깅 레벨 설정
  logLevel: mode === 'production' ? 'error' : 'warn',
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
    sourcemap: mode === 'development' ? true : false, // 개발에서만 소스맵 사용
    minify: 'esbuild', // 더 빠른 번들링
    target: 'es2020', // 최신 브라우저 지원
    
    // 외부 라이브러리 경고 억제
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
        // React Router development 모드 소스맵 경고 무시
        if (warning.code === 'SOURCEMAP_ERROR' && warning.message.includes('react-router/dist/development')) {
          return; // 이 경고는 무시
        }
        // 순환 의존성 경고 표시
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          console.warn('Circular dependency detected:', warning.message);
        }
        // 다른 경고도 표시
        warn(warning);
      },
    },
  },
}));
