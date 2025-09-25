// ===== 열거형 타입 =====

// 콘텐츠 카테고리
export type ContentCategory = 'essay' | 'poetry' | 'photo' | 'calligraphy' | 'video';

// 비디오 플랫폼
export type VideoPlatform = 'youtube' | 'vimeo' | 'other';

// ===== 복합 타입 =====

// EXIF 데이터 구조 (사진용)
export interface ImageExifData {
  // 기본 촬영 정보
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTime?: string;
  
  // GPS 정보 - 데이터베이스에서는 location 필드로 저장될 수 있음
  gps?: {
    latitude?: number;
    longitude?: number;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  
  // 설정 정보 - 일부 데이터는 settings 객체 안에 저장될 수 있음
  settings?: {
    aperture?: string;
    shutter?: string;
    iso?: number;
  };
  
  // 추가 EXIF 정보
  flash?: string;
  whiteBalance?: string;
  meteringMode?: string;
  exposureMode?: string;
  focusMode?: string;
  colorSpace?: string;
  orientation?: string;
  software?: string;
  photographer?: string; // Artist 필드
  copyright?: string;
  
  [key: string]: unknown; // 기타 EXIF 데이터
}

// Contents 테이블 - 메인 콘텐츠
export interface Content {
  // 기본 필드
  id: string; // UUID
  title: string;
  content: string;
  category: ContentCategory;
  author_name: string;
  author_id?: string | null; // 작가 ID (authors 테이블 참조)
  created_at: string; // ISO 날짜 문자열
  updated_at: string; // ISO 날짜 문자열
  likes_count: number;
  is_published: boolean;

  // 카테고리별 특화 필드 (nullable)
  original_text?: string | null; // 한시 전용
  translation?: string | null; // 한시 전용
  image_url?: string | null; // 사진/서화 전용
  image_exif?: ImageExifData | null; // 사진 전용 (JSONB)
  video_url?: string | null; // 공연영상 전용
  video_platform?: VideoPlatform | null; // 공연영상 전용
  
  // 서화 전용 필드
  artwork_size?: string | null; // 서화 작품 크기
  artwork_material?: string | null; // 서화 작품 재료
  
  // 영상 전용 필드
  performance_date?: string | null; // 공연 일자
  performance_venue?: string | null; // 공연 장소

  // SEO 및 메타데이터
  meta_description?: string | null;
  meta_keywords?: string[] | null;
  slug?: string | null;
  thumbnail_url?: string | null;

  // 추가 정보
  view_count: number;
  featured: boolean;
  additional_data?: Record<string, unknown>; // JSONB 필드
  
  // 기타
  description?: string; // 선택적 설명 필드
}

// 작가 타입 정의  
export interface Author {
  id: string
  name: string
  email?: string
  bio?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

// ===== 댓글 시스템 타입 =====

// 댓글 기본 타입 (기존 스키마와 호환)
export interface Comment {
  id: string;
  content_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  body: string;
  created_at: string;
  updated_at: string;
  is_reported: boolean;
  is_deleted: boolean;
  password_hash: string; // 댓글 작성자 비밀번호 해시
}

// 현재 Remix에서 사용할 간단한 댓글 타입 (실제 스키마 기반)
export interface DisplayComment {
  id: string;
  content_id: string;
  user_name: string;
  body: string; // 실제 데이터베이스에는 body 필드 사용
  created_at: string;
}

// 좋아요 타입 정의
export interface Like {
  id: string
  content_id: string
  user_ip: string
  created_at: string
}

// 조회수 타입 정의
export interface View {
  id: string
  content_id: string
  user_ip: string
  created_at: string
  user_agent?: string
}

// ===== 카테골0리 정보 타입 =====

// 카테고리 메타데이터
export interface CategoryInfo {
  id: ContentCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// 카테고리 정의
export const CATEGORIES = {
  essay: { 
    name: '수필', 
    icon: '📝', 
    description: '마음을 담아 써내려간 수필 작품들',
    color: '#8B5A2B'
  },
  poetry: { 
    name: '한시', 
    icon: '📜', 
    description: '전통의 아름다움이 담긴 한시 작품들',
    color: '#2563EB'
  },
  photo: { 
    name: '사진', 
    icon: '📸', 
    description: '순간의 아름다움을 포착한 사진 작품들',
    color: '#059669'
  },
  calligraphy: { 
    name: '서화', 
    icon: '🖼️', 
    description: '붓끝에 담긴 정성과 예술 작품들',
    color: '#7C2D12'
  },
  video: { 
    name: '영상', 
    icon: '🎬', 
    description: '움직이는 이야기가 담긴 영상 작품들',
    color: '#DC2626'
  }
} as const

export type CategorySlug = keyof typeof CATEGORIES

// API 응답 타입
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// 페이지네이션 타입
export interface PaginationData {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// 콘텐츠 필터 타입
// ===== 콘텐츠 필터 및 검색 타입 =====

export interface ContentFilter {
  category?: ContentCategory
  author_id?: string
  search?: string
  tag?: string
  is_published?: boolean
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'updated_at' | 'likes_count' | 'view_count'
  sort_order?: 'asc' | 'desc'
}

// ===== 타입 가드 함수들 =====

// 콘텐츠 카테고리 확인
export function isContentCategory(value: string): value is ContentCategory {
  return ['essay', 'poetry', 'photo', 'calligraphy', 'video'].includes(value);
}

// 비디오 플랫폼 확인
export function isVideoPlatform(value: string): value is VideoPlatform {
  return ['youtube', 'vimeo', 'other'].includes(value);
}

// 특정 카테고리 콘텐츠 타입 가드
export function isEssayContent(content: Content): content is Content & { category: 'essay' } {
  return content.category === 'essay';
}

export function isPoetryContent(content: Content): content is Content & { category: 'poetry', original_text: string, translation: string } {
  return content.category === 'poetry' &&
         content.original_text !== null &&
         content.translation !== null;
}

export function isPhotoContent(content: Content): content is Content & { category: 'photo', image_url: string } {
  return content.category === 'photo' && content.image_url !== null;
}

export function isCalligraphyContent(content: Content): content is Content & { category: 'calligraphy', image_url: string } {
  return content.category === 'calligraphy' && content.image_url !== null;
}

export function isVideoContent(content: Content): content is Content & { category: 'video', video_url: string, video_platform: VideoPlatform } {
  return content.category === 'video' &&
         content.video_url !== null &&
         content.video_platform !== null;
}
