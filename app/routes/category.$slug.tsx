import { useLoaderData, useSearchParams, Link } from 'react-router';
import { useEffect, useCallback } from 'react';
import { createSupabaseServerClient } from "../lib/supabase";
import type { Content } from "../lib/types";
import { CATEGORIES } from "../lib/types";
import { getVideoThumbnailUrl } from "../utils/imageOptimization";
import { useSearchDebounce } from "../hooks/useDebounce";
import OptimizedImage from "../components/OptimizedImage";

import type { Route } from "./+types/category.$slug";

export function meta({ data }: Route.MetaArgs) {
  if (!data?.category) {
    return [
      { title: "카테고리를 찾을 수 없습니다" },
    ];
  }

  const { category } = data;
  
  return [
    { title: `${category.name} | 춘천답기 웹진` },
    { name: "description", content: category.description },
    { name: "keywords", content: `${category.name},춘천답기,춘천문화원,웹진` },
    { property: "og:title", content: `${category.name} | 춘천답기 웹진` },
    { property: "og:description", content: category.description },
    { property: "og:type", content: "website" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { slug } = params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const search = url.searchParams.get('search') || '';
  const pageSize = 12;

  // 카테고리 유효성 검사
  if (!slug || !(slug in CATEGORIES)) {
    throw new Response("카테고리를 찾을 수 없습니다", { status: 404 });
  }

  const category = CATEGORIES[slug as keyof typeof CATEGORIES];
  const supabase = createSupabaseServerClient(request);

  try {
    // 기본 쿼리 구성 - 필요한 필드만 선택하여 성능 개선
    let query = supabase
      .from('contents')
      .select(`
        id,
        title,
        content,
        author_name,
        created_at,
        view_count,
        likes_count,
        thumbnail_url,
        image_url,
        video_url,
        video_platform,
        video_thumbnail_url,
        tts_url
      `, { count: 'exact' })
      .eq('category', slug)
      .eq('is_published', true);

    // 검색 조건 추가
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,author_name.ilike.%${search}%`);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: contents, error, count } = await query;

    if (error) {
      console.error('Error loading contents:', error);
      throw new Response("콘텐츠 로딩 중 오류가 발생했습니다", { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      category,
      contents: contents || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      search
    };
  } catch (error) {
    console.error('Error in category loader:', error);
    throw new Response("서버 오류가 발생했습니다", { status: 500 });
  }
}

export default function CategoryPage() {
  const { category, contents, pagination, search } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 실시간 검색을 위한 디바운스 훅 사용 (300ms로 최적화)
  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm, clearSearch } = useSearchDebounce(search, 300);

  // 디바운스된 검색어가 변경되면 URL 업데이트
  useEffect(() => {
    if (debouncedSearchTerm !== search) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (debouncedSearchTerm) {
          newParams.set('search', debouncedSearchTerm);
        } else {
          newParams.delete('search');
        }
        newParams.delete('page'); // 검색시 첫 페이지로
        return newParams;
      });
    }
  }, [debouncedSearchTerm, search, setSearchParams]);

  const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchTerm(event.target.value);
  }, [updateSearchTerm]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const getPaginationUrl = useCallback((page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    return `?${newParams.toString()}`;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 카테고리 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center mb-4">
            <span className="text-4xl mr-4">{category.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
              <p className="text-gray-600 mt-2">{category.description}</p>
            </div>
          </div>
          
          {/* 실시간 검색 */}
          <div className="mt-6">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={`${category.name} 작품 실시간 검색...`}
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {/* 로딩 스피너 */}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {/* 검색어 지우기 버튼 */}
                  {searchTerm && !isSearching && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      type="button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {/* 검색 도움말 */}
              <p className="text-xs text-gray-500 mt-2">
                키워드를 입력하면 제목, 내용, 작가명에서 실시간으로 검색됩니다.
              </p>
            </div>
          </div>
          
          {/* 검색 결과 정보 */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>
                {search ? (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-2">
                      현재 검색: "{search}"
                    </span>
                    총 {pagination.totalCount}개의 검색 결과
                  </>
                ) : (
                  `총 ${pagination.totalCount}개의 ${category.name} 작품`
                )}
              </span>
              {isSearching && (
                <span className="inline-flex items-center text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                  검색 중...
                </span>
              )}
            </div>
            <span>
              {pagination.currentPage} / {pagination.totalPages} 페이지
            </span>
          </div>
        </div>

        {/* 콘텐츠 목록 */}
        {contents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {contents.map((content) => {
              // 카테고리별 이미지 URL 결정
              const getImageUrl = () => {
                if (content.category === 'photo' || content.category === 'calligraphy') {
                  return content.image_url || content.thumbnail_url;
                }
                if (content.category === 'video') {
                  // 비디오의 경우 동적 썸네일 생성 시도
                  if (content.video_url && content.video_platform) {
                    const dynamicThumbnail = getVideoThumbnailUrl(content.video_url, content.video_platform);
                    if (dynamicThumbnail) {
                      return dynamicThumbnail;
                    }
                  }
                  // 동적 썸네일이 실패하면 기존 썸네일 필드들 시도
                  return content.video_thumbnail_url || content.thumbnail_url;
                }
                return content.thumbnail_url;
              };
              
              const imageUrl = getImageUrl();
              
              return (
                <Link
                  key={content.id}
                  to={`/content/${content.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden group border border-gray-200"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = category.color;
                    (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
                    (e.currentTarget as HTMLElement).style.borderWidth = '2px';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
                    (e.currentTarget as HTMLElement).style.borderWidth = '1px';
                  }}
                >
                  {/* 이미지 영역 - 최적화된 이미지 컴포넌트 사용 */}
                  <div className="relative h-48 overflow-hidden">
                    <OptimizedImage
                      src={imageUrl}
                      alt={content.title}
                      category={content.category}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                    {/* 카테고리 배지 */}
                    <div className="absolute top-3 left-3 z-10">
                      <div className="px-2 py-1 rounded-full text-xs font-medium bg-black bg-opacity-70 text-white backdrop-blur-sm">
                        <span className="mr-1">{category.icon}</span>
                        {category.name}
                      </div>
                    </div>
                  </div>
                  
                  {/* 콘텐츠 정보 */}
                  <div className="p-6">
                    <h3 
                      className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {content.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      작가: <span className="font-medium">{content.author_name}</span>
                    </p>
                    <p 
                      className="text-gray-700 text-sm leading-relaxed"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {content.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                      {content.content.replace(/<[^>]*>/g, '').length > 120 ? '...' : ''}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
                      <span>
                        {new Date(content.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex space-x-3">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {content.view_count}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {content.likes_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            {search ? (
              // 검색 결과가 없는 경우
              <>
                <div className="text-6xl mb-4 opacity-50">🔍</div>
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  '검색어: {search}'에 대한 검색 결과가 없습니다
                </h3>
                <p className="text-gray-500 mb-4">
                  다른 키워드로 다시 검색해보세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
                  >
                    모든 {category.name} 작품 보기
                  </button>
                  <span className="text-xs text-gray-400 hidden sm:block">|</span>
                  <p className="text-xs text-gray-400">
                    팁: 제목, 내용, 작가명에서 검색됩니다
                  </p>
                </div>
              </>
            ) : (
              // 작품이 없는 경우
              <>
                <div className="text-6xl mb-4">{category.icon}</div>
                <h3 className="text-xl font-medium text-gray-600 mb-2">
                  아직 {category.name} 작품이 없습니다
                </h3>
                <p className="text-gray-500">
                  곧 새로운 작품이 업로드될 예정입니다.
                </p>
              </>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            {/* 이전 페이지 */}
            {pagination.hasPrevPage && (
              <Link
                to={getPaginationUrl(pagination.currentPage - 1)}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                이전
              </Link>
            )}

            {/* 페이지 번호들 */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const startPage = Math.max(1, pagination.currentPage - 2);
              const pageNumber = startPage + i;
              
              if (pageNumber > pagination.totalPages) return null;
              
              return (
                <Link
                  key={pageNumber}
                  to={getPaginationUrl(pageNumber)}
                  className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                    pageNumber === pagination.currentPage
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </Link>
              );
            })}

            {/* 다음 페이지 */}
            {pagination.hasNextPage && (
              <Link
                to={getPaginationUrl(pagination.currentPage + 1)}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                다음
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}