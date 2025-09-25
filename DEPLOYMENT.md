# 배포 가이드

## 배포 전 체크리스트

### 1. 환경변수 설정
배포할 플랫폼에서 다음 환경변수들을 설정해야 합니다:

#### 필수 환경변수
```bash
# Supabase
SUPABASE_URL=https://oeeznxdrubsutvezyhxi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZXpueGRydWJzdXR2ZXp5aHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2Mjc0MzYsImV4cCI6MjA3MzIwMzQzNn0.7AyEo0FeLiEapdz71NdOZ0jnC-tRa4Q0eJ1_dABBSC8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZXpueGRydWJzdXR2ZXp5aHhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzYyNzQzNiwiZXhwIjoyMDczMjAzNDM2fQ.OdrHIJoDHrpsMvKJ2LW1KMEyFlihMzbNrzfwdi6kyNc

# 사이트 설정
SITE_URL=https://ccdg.kr
BASE_URL=https://ccdg.kr

# 보안
ADMIN_EMAILS=cccc@cccc.or.kr
SESSION_SECRET=your-secure-session-secret-key-here

# Google Cloud TTS (서버리스 환경에서는 JSON 문자열로 설정)
GOOGLE_CLOUD_PROJECT_ID=webzine-tts
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### 2. Google Cloud TTS 설정

#### 로컬 개발환경
- `google-cloud-key.json` 파일 사용
- `GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json`

#### 서버리스 배포환경 (Vercel/Netlify)
- JSON 키를 환경변수로 설정
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` 환경변수에 전체 JSON 내용을 문자열로 입력

### 3. TTS 기능 의존성
- `public/tts/` 폴더가 존재하는지 확인
- 서버리스 환경에서는 TTS 파일을 외부 스토리지(AWS S3, Cloudinary 등)에 저장하는 것을 권장

## Vercel 배포

### 1. Vercel CLI 설치 및 로그인
```bash
npm install -g vercel
vercel login
```

### 2. 프로젝트 연결
```bash
vercel link
```

### 3. 환경변수 설정
Vercel 대시보드에서 또는 CLI로 설정:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... 기타 환경변수들
```

### 4. 배포
```bash
vercel --prod
```

## Netlify 배포

### 1. Netlify CLI 설치 및 로그인
```bash
npm install -g netlify-cli
netlify login
```

### 2. 사이트 생성 및 배포
```bash
netlify init
netlify deploy --prod --dir=build/client
```

## 배포 후 확인사항

1. **기본 기능 테스트**
   - 홈페이지 로딩
   - 카테고리별 콘텐츠 조회
   - 검색 기능
   - 관리자 로그인

2. **TTS 기능 테스트**
   - TTS 생성 요청
   - 음성 파일 재생
   - 캐시 기능

3. **성능 체크**
   - 페이지 로딩 속도
   - 이미지 최적화
   - SEO 메타태그

## 트러블슈팅

### Google Cloud TTS 에러
- 환경변수 설정 확인
- 서비스 계정 권한 확인
- 프로젝트 결제 활성화 확인

### 빌드 에러
- Node.js 버전 확인 (18.x 이상)
- 의존성 설치 확인: `npm ci`
- 타입 에러 확인: `npm run typecheck`

### 데이터베이스 연결 에러
- Supabase URL 및 키 확인
- RLS 정책 확인
- 네트워크 연결 확인