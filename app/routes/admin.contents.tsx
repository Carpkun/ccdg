import { useLoaderData, Link, useSearchParams, Form, useActionData, useNavigation } from "react-router";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";

import type { Route } from "./+types/admin.contents";

export function meta() {
  return [
    { title: "콘텐츠 관리 | 관리자 | 춘천답기 웹진" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  
  const url = new URL(request.url);
  const category = url.searchParams.get('category') || '';
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 20;

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // 쿼리 구성
    let query = supabaseAdmin
      .from('contents')
      .select('*', { count: 'exact' });

    // 카테고리 필터
    if (category && category in CATEGORIES) {
      query = query.eq('category', category);
    }

    // 상태 필터
    if (status === 'published') {
      query = query.eq('is_published', true);
    } else if (status === 'draft') {
      query = query.eq('is_published', false);
    } else if (status === 'featured') {
      query = query.eq('featured', true);
    }

    // 검색
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,author_name.ilike.%${search}%`);
    }

    // 페이지네이션
    const offset = (page - 1) * pageSize;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: contents, error, count } = await query;

    if (error) {
      console.error('콘텐츠 조회 오류:', error);
      return {
        contents: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalCount: 0,
          pageSize,
          hasNextPage: false,
          hasPrevPage: false
        },
        filters: { category, search, status },
        error: '콘텐츠를 불러오는 데 실패했습니다.'
      };
    }

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      contents: contents || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        category,
        search,
        status
      }
    };
  } catch (error) {
    console.error('콘텐츠 로더 오류:', error);
    return {
      contents: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalCount: 0,
        pageSize,
        hasNextPage: false,
        hasPrevPage: false
      },
      filters: { category, search, status },
      error: '서버 오류가 발생했습니다.'
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireUserId(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  const contentId = formData.get("contentId")?.toString();

  if (!intent || !contentId) {
    return {
      success: false,
      message: "잘못된 요청입니다."
    };
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    switch (intent) {
      case "togglePublish": {
        const { data: content } = await supabaseAdmin
          .from('contents')
          .select('is_published')
          .eq('id', contentId)
          .single();

        if (!content) {
          return {
            success: false,
            message: "콘텐츠를 찾을 수 없습니다."
          };
        }

        const { error } = await supabaseAdmin
          .from('contents')
          .update({ is_published: !content.is_published })
          .eq('id', contentId);

        if (error) {
          return {
            success: false,
            message: "상태 변경에 실패했습니다."
          };
        }

        return {
          success: true,
          message: content.is_published ? "비공개로 변경되었습니다." : "공개로 변경되었습니다."
        };
      }

      case "toggleFeatured": {
        const { data: content } = await supabaseAdmin
          .from('contents')
          .select('featured')
          .eq('id', contentId)
          .single();

        if (!content) {
          return {
            success: false,
            message: "콘텐츠를 찾을 수 없습니다."
          };
        }

        const { error } = await supabaseAdmin
          .from('contents')
          .update({ featured: !content.featured })
          .eq('id', contentId);

        if (error) {
          return {
            success: false,
            message: "좋아요 상태 변경에 실패했습니다."
          };
        }

        return {
          success: true,
          message: content.featured ? "좋아요에서 제거되었습니다." : "좋아요에 추가되었습니다."
        };
      }

      case "delete": {
        const { error } = await supabaseAdmin
          .from('contents')
          .delete()
          .eq('id', contentId);

        if (error) {
          return {
            success: false,
            message: "삭제에 실패했습니다."
          };
        }

        return {
          success: true,
          message: "콘텐츠가 삭제되었습니다."
        };
      }

      default:
        return {
          success: false,
          message: "알 수 없는 작업입니다."
        };
    }
  } catch (error) {
    console.error('콘텐츠 액션 오류:', error);
    return {
      success: false,
      message: "서버 오류가 발생했습니다."
    };
  }
}

export default function AdminContents() {
  const { contents, pagination, filters, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const successType = searchParams.get('success');

  const isLoading = navigation.state === "submitting";

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
    const searchValue = formData.get('search')?.toString() || '';
    updateFilter('search', searchValue);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">콘텐츠 관리</h1>
            <p className="text-gray-600 mt-2">
              총 {pagination.totalCount}개의 콘텐츠 중 {pagination.currentPage} 페이지
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/dashboard"
              className="text-blue-600 hover:text-blue-800"
            >
              ← 대시보드
            </Link>
            <Link
              to="/admin/contents/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              + 새 콘텐츠
            </Link>
          </div>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {successType && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
            {
              successType === 'updated' ? '콘텐츠가 성공적으로 수정되었습니다.' :
              successType === 'deleted' ? '콘텐츠가 성공적으로 삭제되었습니다.' :
              '작업이 성공적으로 완료되었습니다.'
            }
          </div>
        )}

        {/* 액션 메시지 */}
        {actionData?.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            actionData.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {actionData.message}
          </div>
        )}

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* 카테고리 필터 */}
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">모든 카테고리</option>
              {Object.entries(CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">모든 상태</option>
              <option value="published">공개</option>
              <option value="draft">비공개</option>
              <option value="featured">좋아요</option>
            </select>

            {/* 검색 */}
            <Form onSubmit={handleSearch} className="lg:col-span-2">
              <div className="flex">
                <input
                  name="search"
                  type="text"
                  placeholder="제목, 내용, 작가명으로 검색..."
                  defaultValue={filters.search}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md transition-colors"
                >
                  검색
                </button>
              </div>
            </Form>
          </div>

          {/* 필터 리셋 */}
          {(filters.category || filters.search || filters.status) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-600">
                필터 적용됨: {
                  [
                    filters.category && `카테고리: ${CATEGORIES[filters.category as keyof typeof CATEGORIES]?.name}`,
                    filters.status && `상태: ${
                      filters.status === 'published' ? '공개' :
                      filters.status === 'draft' ? '비공개' : '좋아요'
                    }`,
                    filters.search && `검색: "${filters.search}"`
                  ].filter(Boolean).join(', ')
                }
              </span>
              <Link
                to="/admin/contents"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </Link>
            </div>
          )}
        </div>

        {/* 콘텐츠 목록 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {contents.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {contents.map((content) => {
                const categoryInfo = CATEGORIES[content.category as keyof typeof CATEGORIES];
                return (
                  <div key={content.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{categoryInfo.icon}</span>
                          <Link
                            to={`/content/${content.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate"
                            target="_blank"
                          >
                            {content.title}
                          </Link>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span className="mr-4">작가: {content.author_name}</span>
                          <span className="mr-4">카테고리: {categoryInfo.name}</span>
                          <span>{new Date(content.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>조회 {content.view_count || 0}</span>
                          <span>좋아요 {content.likes_count || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 ml-4">
                        {/* 상태 배지 */}
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            content.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {content.is_published ? '공개' : '비공개'}
                          </span>
                          {content.featured && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              좋아요
                            </span>
                          )}
                        </div>

                        {/* 액션 버튼들 */}
                        <div className="flex items-center space-x-2">
                          {/* 공개/비공개 토글 */}
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="togglePublish" />
                            <input type="hidden" name="contentId" value={content.id} />
                            <button
                              type="submit"
                              disabled={isLoading}
                              className={`px-3 py-1 text-xs rounded ${
                                content.is_published
                                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                  : 'bg-green-100 hover:bg-green-200 text-green-700'
                              } disabled:opacity-50`}
                            >
                              {content.is_published ? '비공개' : '공개'}
                            </button>
                          </Form>

                          {/* 추천 토글 */}
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="toggleFeatured" />
                            <input type="hidden" name="contentId" value={content.id} />
                            <button
                              type="submit"
                              disabled={isLoading}
                              className={`px-3 py-1 text-xs rounded ${
                                content.featured
                                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              } disabled:opacity-50`}
                            >
                              {content.featured ? '좋아요취소' : '좋아요'}
                            </button>
                          </Form>

                          {/* 수정 링크 */}
                          <Link
                            to={`/admin/contents/${content.id}/edit`}
                            className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                          >
                            수정
                          </Link>

                          {/* 삭제 버튼 */}
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="contentId" value={content.id} />
                            <button
                              type="submit"
                              disabled={isLoading}
                              onClick={(e) => {
                                if (!confirm('정말로 삭제하시겠습니까?')) {
                                  e.preventDefault();
                                }
                              }}
                              className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50"
                            >
                              삭제
                            </button>
                          </Form>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg mb-2">콘텐츠가 없습니다</p>
              <p className="text-sm">필터를 조정하거나 새 콘텐츠를 작성해보세요.</p>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-8">
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