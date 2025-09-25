import { useLoaderData, Link, useSearchParams } from "react-router";
import { createSupabaseServerClient } from "../lib/supabase";
import type { Content, Author } from "../lib/types";
import { CATEGORIES } from "../lib/types";

// import type { Route } from "./+types/author.$id";

export function meta({ data }: { data: any }) {
  if (!data?.author) {
    return [
      { title: "작가를 찾을 수 없습니다" },
    ];
  }

  const { author, totalWorks } = data;
  
  return [
    { title: `${author.name} | 춘천답기 웹진` },
    { name: "description", content: `${author.name} 작가의 작품 모음. 총 ${totalWorks}개의 작품을 감상해보세요.` },
    { name: "keywords", content: `${author.name},춘천답기,춘천문화원,웹진,작가` },
    { property: "og:title", content: `${author.name} - 춘천답기 웹진` },
    { property: "og:description", content: `${author.name} 작가의 작품 모음` },
    { property: "og:type", content: "profile" },
  ];
}

export async function loader({ params, request }: { params: any, request: Request }) {
  const { id } = params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const category = url.searchParams.get('category') || '';
  const pageSize = 12;

  const supabase = createSupabaseServerClient(request);

  try {
    // 작가 정보 조회 (ID 또는 이름으로)
    let authorQuery = supabase
      .from('authors')
      .select('*');

    // ID가 UUID 형식인지 확인
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      authorQuery = authorQuery.eq('id', id);
    } else {
      authorQuery = authorQuery.eq('name', decodeURIComponent(id));
    }

    const { data: authors, error: authorError } = await authorQuery.single();

    if (authorError || !authors) {
      throw new Response("작가를 찾을 수 없습니다", { status: 404 });
    }

    const author = authors;

    // 작가의 콘텐츠 조회
    let contentsQuery = supabase
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('author_name', author.name)  // author_name으로 검색
      .eq('is_published', true);

    // 카테고리 필터 추가
    if (category && category in CATEGORIES) {
      contentsQuery = contentsQuery.eq('category', category);
    }

    // 페이지네이션 적용
    const offset = (page - 1) * pageSize;
    contentsQuery = contentsQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: contents, error: contentsError, count } = await contentsQuery;

    if (contentsError) {
      console.error('Error loading author contents:', contentsError);
      throw new Response("작가 작품 로딩 중 오류가 발생했습니다", { status: 500 });
    }

    // 카테고리별 작품 수 조회
    const categoryStatsPromises = Object.keys(CATEGORIES).map(async (cat) => {
      const { count: categoryCount } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true })
        .eq('author_name', author.name)
        .eq('category', cat)
        .eq('is_published', true);

      return { category: cat, count: categoryCount || 0 };
    });

    const categoryStats = await Promise.all(categoryStatsPromises);
    const totalWorks = categoryStats.reduce((sum, stat) => sum + stat.count, 0);

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      author,
      contents: contents || [],
      categoryStats,
      totalWorks,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      selectedCategory: category
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.error('Error in author loader:', error);
    throw new Response("서버 오류가 발생했습니다", { status: 500 });
  }
}

export default function AuthorPage() {
  const { 
    author, 
    contents, 
    categoryStats, 
    totalWorks, 
    pagination, 
    selectedCategory 
  } = useLoaderData<typeof loader>();
  
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategoryFilter = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category && category !== 'all') {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    newParams.delete('page'); // 필터 변경 시 페이지 리셋
    setSearchParams(newParams);
  };

  const getPaginationUrl = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    return `?${newParams.toString()}`;
  };

  return (
    <div>
      {/* 작가 프로필 섹션 */}
      <section className="bg-gradient-to-r from-purple-50 to-indigo-100 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* 프로필 이미지 자리 */}
            <div className="w-32 h-32 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              {author.profile_image_url ? (
                <img
                  src={author.profile_image_url}
                  alt={author.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-4xl text-gray-500">👤</span>
              )}
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{author.name}</h1>
            
            {author.bio && (
              <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
                {author.bio}
              </p>
            )}
            
            <div className="flex justify-center items-center text-sm text-gray-600">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalWorks}</div>
                <div>총 작품</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 작품 목록 섹션 */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* 카테고리 필터 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">작품 모음</h2>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => handleCategoryFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                전체 ({totalWorks})
              </button>
              
              {categoryStats.map(({ category, count }) => {
                if (count === 0) return null;
                const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES];
                
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryFilter(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === category
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <span>{categoryInfo.icon}</span>
                    <span>{categoryInfo.name}</span>
                    <span>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 작품 그리드 */}
          {contents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {contents.map((content) => {
                  const categoryInfo = CATEGORIES[content.category as keyof typeof CATEGORIES];
                  
                  return (
                    <Link key={content.id} to={`/content/${content.id}`}>
                      <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer">
                        <div className="flex items-center mb-3">
                          <span className="text-lg mr-2">{categoryInfo?.icon}</span>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {categoryInfo?.name}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                          {content.title}
                        </h3>
                        
                        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                          {content.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                          {content.content.length > 120 ? '...' : ''}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <time dateTime={content.created_at}>
                            {new Date(content.created_at).toLocaleDateString('ko-KR')}
                          </time>
                          <div className="flex items-center space-x-3">
                            <span>조회 {content.view_count}</span>
                            <span>좋아요 {content.likes_count}</span>
                          </div>
                        </div>
                      </article>
                    </Link>
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
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                {selectedCategory ? 
                  `${CATEGORIES[selectedCategory as keyof typeof CATEGORIES]?.name} 작품이 없습니다` :
                  '아직 작품이 없습니다'
                }
              </h3>
              <p className="text-gray-500">
                {selectedCategory ? '다른 카테고리의 작품을 확인해보세요.' : '곧 새로운 작품이 업로드될 예정입니다.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}