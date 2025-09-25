# 춘천답기 웹진 (Remix Version)

춘천문화원의 문학 웹진을 React Router v7을 사용하여 개발한 현대적이고 성능 최적화된 웹 애플리케이션입니다.

기존 Next.js 프로젝트를 React Router (Remix) 프레임워크로 마이그레이션하여 더 나은 성능과 개발 경험을 제공합니다.

## 기능 소개

### 콘텐츠 관리
- 📝 수필, 한시, 사진, 서화, 영상 등 다양한 콘텐츠 지원
- ✏️ Tiptap 기반의 리치 텍스트 에디터
- 📁 카테고리별 콘텐츠 정리 및 필터링
- 🔍 검색 기능 및 내용 하이라이트
- 📊 조회수, 좋아요, 댓글 통계

### 관리자 기능
- 🔐 세션 기반 인증 시스템
- 📈 대시보드와 통계 정보
- 📝 콘텐츠 CRUD 및 발행 관리
- 📄 반응형 디자인의 직관적인 UI

### 기술적 특징
- 🚀 React Router v7 기반 SSR
- ⚡️ 고성능 데이터 로딩
- 🗄️ Supabase 데이터베이스 연동
- 🔒 TypeScript로 타입 안전성 보장
- 🎨 TailwindCSS 기반 모던 UI
- 📱 모바일 친화적 반응형 디자인
- 🔍 SEO 최적화 (sitemap, robots.txt)
- 🔄 자동 이미지 최적화

## 시작하기

### 사전 요구사항

- Node.js 18+ 
- npm 또는 yarn
- Supabase 계정 및 프로젝트

### 설치 및 설정

1. **레포지토리 클론:**
```bash
git clone <repository-url>
cd rezine-remix
```

2. **의존성 설치:**
```bash
npm install
```

3. **환경변수 설정:**
`.env` 파일을 루트 디렉토리에 생성하고 다음 내용을 추가:
```env
# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 세션 비밀키
SESSION_SECRET=your_session_secret_key

# 관리자 이메일
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### 개발 서버 실행

개발 서버를 시작합니다:

```bash
npm run dev
```

애플리케이션이 `http://localhost:5173`에서 실행됩니다.

### 프로젝트 구조

```
app/
├── components/          # 재사용 가능한 연리 컴포년트
│   ├── ClientOnly.tsx   # 클라이언트 전용 컴포년트
│   ├── Footer.tsx       # 푸터 컴포년트
│   ├── Header.tsx       # 헤더 컴포년트
│   ├── Navigation.tsx   # 네비게이션 컴포년트
│   └── TiptapEditor.tsx # 리치 텍스트 에디터
├── lib/                 # 유틸리티 함수 및 설정
│   ├── session.server.ts # 세션 관리
│   ├── supabase.ts      # Supabase 클라이언트 설정
│   └── types.ts         # TypeScript 타입 정의
├── routes/              # 페이지 라우트
│   ├── _index.tsx       # 홈페이지
│   ├── admin.*.tsx      # 관리자 페이지들
│   ├── category.$slug.tsx # 카테고리 페이지
│   ├── content.$id.tsx  # 콘텐츠 상세 페이지
│   ├── author.$id.tsx   # 작가 페이지
│   ├── search.tsx       # 검색 페이지
│   ├── sitemap[.]xml.tsx # 사이트맵 생성
│   └── robots[.]txt.tsx # 로봇츠 파일
└── root.tsx             # 루트 레이아웃
```

## 프로덕션 빌드

프로덕션용 빌드를 생성합니다:

```bash
npm run build
```

## 배포

### Vercel 배포 (추천)

Vercel에 배포하는 가장 간단한 방법:

1. Vercel CLI 설치: `npm i -g vercel`
2. 배포: `vercel`
3. 환경변수들을 Vercel 대시보드에서 설정

### Docker 배포

Docker를 사용하여 빌드 및 실행:

```bash
docker build -t chuncheon-magazine .
docker run -p 3000:3000 chuncheon-magazine
```

다음 플랫폼에서 배포 가능:
- Vercel (추천)
- Netlify
- Railway
- Fly.io
- AWS ECS
- Google Cloud Run

### 자체 서버 배포

Node.js 애플리케이션 배포에 익숙하다면 내장된 앱 서버가 프로덕션 준비가 되어 있습니다.

`npm run build` 결과물을 배포해야 합니다:

```
├── package.json
├── package-lock.json
└── build/
    ├── client/    # 정적 자산
    └── server/    # 서버사이드 코드
```

## 기술 스택

- **프레임워크**: React Router v7 (Remix)
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: 칠션 기반 관리자 인증
- **에디터**: Tiptap (ProseMirror 기반)
- **배포**: Vercel/Netlify/Docker 지원

## 라이센스

MIT 라이센스

## 기여하기

버그 리포트나 기능 개선 제안은 GitHub Issues를 통해 언제든지 환영합니다.

---

춘천문화원의 문학 웹진을 위해 ❤️와 함께 개발되었습니다.
