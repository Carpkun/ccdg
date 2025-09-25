import { useLoaderData, useSearchParams, Form, Link } from "react-router";
import { createSupabaseServerClient } from "../lib/supabase";
import { CATEGORIES, type ContentCategory } from "../lib/types";

// import type { Route } from "./+types/search";

export function meta({ data }: { data: any }) {
  const query = data?.query || '';
  const totalCount = data?.totalCount || 0;
  
  return [
    { title: query ? `"${query}" 검색 결과 | 춘천답기 웹진` : "검색 | 춘천답기 웹진" },
    { name: "description", content: query ? `"${query}"에 대한 검색 결과 ${totalCount}개` : "춘천답기 웹진에서 원하는 작품을 검색해보세요" },
  ];
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 15;

  const supabase = createSupabaseServerClient(request);

  if (!query) {
    return {
      contents: [],
      query: '',
      category: '',
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        pageSize,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }

  try {
    // 검색 쿼리 구성
    let searchQuery = supabase
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,author_name.ilike.%${query}%`);

    // 카테고리 필터
    if (category && category in CATEGORIES) {
      searchQuery = searchQuery.eq('category', category);
    }

    // 페이지네이션
    const offset = (page - 1) * pageSize;
    searchQuery = searchQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: contents, error, count } = await searchQuery;

    if (error) {
      console.error('Search error:', error);
      throw new Error('검색 중 오류가 발생했습니다.');
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      contents: contents || [],
      query,
      category,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Search loader error:', error);
    return {
      contents: [],
      query,
      category: '',
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        pageSize,
        hasNextPage: false,
        hasPrevPage: false
      },
      error: '검색 중 오류가 발생했습니다.'
    };
  }
}

export default function Search() {
  const { contents, query, category, pagination, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('page'); // 필터 변경 시 페이지 리셋
    setSearchParams(newParams);
  };

  const getPaginationUrl = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    return `?${newParams.toString()}`;
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newQuery = formData.get('q')?.toString() || '';
    
    if (newQuery.trim()) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('q', newQuery.trim());
      newParams.delete('page');
      setSearchParams(newParams);
    }
  };

  return (
    <div>
      {/* 검색 헤더 */}
      <section className="bg-gradient-to-r from-gray-50 to-blue-50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">작품 검색</h1>
            
            {/* 검색 폼 */}
            <Form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="제목, 내용, 작가명으로 검색..."
                  className="w-full px-4 py-3 pl-12 pr-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors">
                    검색
                  </span>
                </button>
              </div>
            </Form>

            {query && (
              <p className="text-gray-600">
                "<span className="font-semibold text-gray-900">{query}</span>"에 대한 검색 결과 
                <span className="font-semibold text-blue-600 ml-1">{pagination.totalCount}개</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 검색 결과 */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {query && (
            <>
              {/* 카테고리 필터 */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateFilter('category', '')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      !category
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    전체
                  </button>
                  
                  {Object.entries(CATEGORIES).map(([key, categoryInfo]) => (
                    <button
                      key={key}
                      onClick={() => updateFilter('category', key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                        category === key
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      }`}
                    >
                      <span>{categoryInfo.icon}</span>
                      <span>{categoryInfo.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {/* 검색 결과 목록 */}
              {contents.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {contents.map((content) => {
                      const categoryInfo = CATEGORIES[content.category as ContentCategory];
                      
                      return (
                        <article key={content.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-center mb-3">
                            <span className="text-lg mr-2">{categoryInfo.icon}</span>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {categoryInfo.name}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            <Link 
                              to={`/content/${content.id}`} 
                              className="hover:text-blue-600 transition-colors"
                            >
                              {/* 검색어 하이라이트 */}
                              <span dangerouslySetInnerHTML={{
                                __html: content.title.replace(
                                  new RegExp(`(${query})`, 'gi'),
                                  '<mark class="bg-yellow-200">$1</mark>'
                                )
                              }} />
                            </Link>
                          </h3>
                          
                          <p className="text-gray-600 text-sm mb-3">
                            작가: 
                            <Link 
                              to={`/author/${encodeURIComponent(content.author_name)}`}
                              className="text-blue-600 hover:text-blue-800 ml-1"
                            >
                              <span dangerouslySetInnerHTML={{
                                __html: content.author_name.replace(
                                  new RegExp(`(${query})`, 'gi'),
                                  '<mark class="bg-yellow-200">$1</mark>'
                                )
                              }} />
                            </Link>
                          </p>
                          
                          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                            <span dangerouslySetInnerHTML={{
                              __html: content.content
                                .replace(/<[^>]*>/g, '')
                                .substring(0, 120)
                                .replace(
                                  new RegExp(`(${query})`, 'gi'),
                                  '<mark class="bg-yellow-200">$1</mark>'
                                )
                            }} />
                            {content.content.length > 120 ? '...' : ''}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <time dateTime={content.created_at}>
                              {new Date(content.created_at).toLocaleDateString('ko-KR')}
                            </time>
                            <div className="flex items-center space-x-3">
                              <span>조회 {content.view_count}</span>
                              <span>추천 {content.likes_count}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

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
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <div className="text-6xl text-gray-300 mb-4">🔍</div>
                  <h3 className="text-xl font-medium text-gray-600 mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-gray-500 mb-4">
                    다른 검색어를 시도해보거나 카테고리 필터를 확인해보세요.
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>💡 검색 팁:</p>
                    <ul className="space-y-1">
                      <li>• 키워드를 짧게 해보세요</li>
                      <li>• 맞춤법을 확인해보세요</li>
                      <li>• 작가명으로도 검색해보세요</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 검색어가 없을 때 */}
          {!query && (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl text-gray-300 mb-4">🔍</div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                원하는 작품을 검색해보세요
              </h3>
              <p className="text-gray-500 mb-6">
                제목, 내용, 작가명으로 검색할 수 있습니다.
              </p>
              
              {/* 인기 검색어 또는 추천 카테고리 */}
              <div className="max-w-2xl mx-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-4">카테고리별 둘러보기</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(CATEGORIES).map(([key, categoryInfo]) => (
                    <Link
                      key={key}
                      to={`/category/${key}`}
                      className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-center"
                    >
                      <div className="text-2xl mb-2">{categoryInfo.icon}</div>
                      <div className="text-sm font-medium text-gray-900">{categoryInfo.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}