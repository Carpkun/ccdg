import { useLoaderData, Link, Form, useActionData, useNavigation, useSearchParams } from "react-router";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";

import type { Route } from "./+types/admin.comments";

interface Comment {
  id: string;
  body: string;
  user_name: string;
  user_email?: string;
  created_at: string;
  is_reported: boolean;
  content_id: string;
  contents: {
    id: string;
    title: string;
    category: string;
    author_name: string;
  } | null;
}

export function meta() {
  return [
    { title: "댓글 관리 | 관리자 | 춘천답기 웹진" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 20;
  
  const supabaseAdmin = createSupabaseAdminClient();
  
  try {
    // 댓글 목록 조회 (관련 콘텐츠 정보 포함)
    let query = supabaseAdmin
      .from('comments')
      .select(`
        *,
        contents:content_id (
          id,
          title,
          category,
          author_name
        )
      `, { count: 'exact' });
    
    // 상태 필터
    if (status === 'reported') {
      query = query.eq('is_reported', true);
    } else if (status === 'normal') {
      query = query.eq('is_reported', false);
    }
    
    // 검색
    if (search) {
      query = query.or(`body.ilike.%${search}%,user_name.ilike.%${search}%`);
    }
    
    // 정렬 및 페이지네이션
    const offset = (page - 1) * pageSize;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    const { data: comments, error, count } = await query;
    
    if (error) {
      console.error('댓글 조회 오류:', error);
      throw new Error('댓글을 불러오는 데 실패했습니다.');
    }
    
    // 댓글 통계 조회
    const [
      { count: totalComments },
      { count: reportedComments },
      { count: normalComments }
    ] = await Promise.all([
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('is_reported', true),
      supabaseAdmin.from('comments').select('*', { count: 'exact', head: true }).eq('is_reported', false)
    ]);
    
    const totalPages = Math.ceil((count || 0) / pageSize);
    
    return {
      comments: comments || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count || 0,
        pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        search,
        status
      },
      stats: {
        total: totalComments || 0,
        reported: reportedComments || 0,
        normal: normalComments || 0
      }
    };
  } catch (error) {
    console.error('댓글 로더 오류:', error);
    throw new Response("서버 오류가 발생했습니다", { status: 500 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireUserId(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  const commentId = formData.get("commentId")?.toString();
  
  if (!intent || !commentId) {
    return {
      success: false,
      message: "잘못된 요청입니다."
    };
  }
  
  const supabaseAdmin = createSupabaseAdminClient();
  
  try {
    switch (intent) {
      case "delete": {
        // 댓글 삭제
        const { error } = await supabaseAdmin
          .from('comments')
          .delete()
          .eq('id', commentId);
          
        if (error) {
          return {
            success: false,
            message: "댓글 삭제에 실패했습니다."
          };
        }
        
        return {
          success: true,
          message: "댓글이 삭제되었습니다."
        };
      }
      
      case "toggleReport": {
        // 신고 상태 토글
        const { data: comment } = await supabaseAdmin
          .from('comments')
          .select('is_reported')
          .eq('id', commentId)
          .single();
          
        if (!comment) {
          return {
            success: false,
            message: "댓글을 찾을 수 없습니다."
          };
        }
        
        const { error } = await supabaseAdmin
          .from('comments')
          .update({ is_reported: !comment.is_reported })
          .eq('id', commentId);
          
        if (error) {
          return {
            success: false,
            message: "신고 상태 변경에 실패했습니다."
          };
        }
        
        return {
          success: true,
          message: comment.is_reported ? "신고가 해제되었습니다." : "신고로 표시되었습니다."
        };
      }
      
      default:
        return {
          success: false,
          message: "알 수 없는 작업입니다."
        };
    }
  } catch (error) {
    console.error('댓글 액션 오류:', error);
    return {
      success: false,
      message: "서버 오류가 발생했습니다."
    };
  }
}

export default function AdminComments() {
  const { comments, pagination, filters, stats } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  
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
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/dashboard"
                className="text-blue-600 hover:text-blue-800"
              >
                ← 관리자 대시보드
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">댓글 관리</h1>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">💬</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    전체 댓글
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.total}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">⚠️</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    신고된 댓글
                  </dt>
                  <dd className="text-lg font-medium text-red-600">
                    {stats.reported}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">✅</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    정상 댓글
                  </dt>
                  <dd className="text-lg font-medium text-green-600">
                    {stats.normal}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* 상태 필터 */}
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">모든 상태</option>
              <option value="normal">정상 댓글</option>
              <option value="reported">신고된 댓글</option>
            </select>
            
            {/* 검색 */}
            <Form onSubmit={handleSearch} className="lg:col-span-2">
              <div className="flex">
                <input
                  name="search"
                  type="text"
                  placeholder="댓글 내용, 작성자명으로 검색..."
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
          {(filters.search || filters.status) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-gray-600">
                필터 적용됨: {
                  [
                    filters.status && `상태: ${
                      filters.status === 'normal' ? '정상' :
                      filters.status === 'reported' ? '신고됨' : ''
                    }`,
                    filters.search && `검색: "${filters.search}"`
                  ].filter(Boolean).join(', ')
                }
              </span>
              <Link
                to="/admin/comments"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                필터 초기화
              </Link>
            </div>
          )}
        </div>
        
        {/* 댓글 목록 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {comments.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {comments.map((comment: Comment) => {
                const categoryInfo = comment.contents ? CATEGORIES[comment.contents.category as keyof typeof CATEGORIES] : null;
                return (
                  <div key={comment.id} className={`p-6 ${comment.is_reported ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* 댓글 내용 */}
                        <div className="mb-3">
                          <p className="text-gray-900">{comment.body}</p>
                        </div>
                        
                        {/* 작성자 및 메타 정보 */}
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <span className="mr-4">작성자: {comment.user_name}</span>
                          <span className="mr-4">
                            {new Date(comment.created_at).toLocaleDateString('ko-KR')} {new Date(comment.created_at).toLocaleTimeString('ko-KR')}
                          </span>
                          {comment.is_reported && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              신고됨
                            </span>
                          )}
                        </div>
                        
                        {/* 관련 콘텐츠 정보 */}
                        {comment.contents && (
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-2">{categoryInfo?.icon}</span>
                            <Link
                              to={`/content/${comment.contents.id}`}
                              className="text-blue-600 hover:text-blue-800 truncate"
                              target="_blank"
                            >
                              {comment.contents.title}
                            </Link>
                            <span className="mx-2">•</span>
                            <span>by {comment.contents.author_name}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* 액션 버튼들 */}
                      <div className="flex items-center space-x-2 ml-4">
                        {/* 신고 토글 */}
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="toggleReport" />
                          <input type="hidden" name="commentId" value={comment.id} />
                          <button
                            type="submit"
                            disabled={isLoading}
                            className={`px-3 py-1 text-xs rounded ${
                              comment.is_reported
                                ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                            } disabled:opacity-50`}
                          >
                            {comment.is_reported ? '신고해제' : '신고하기'}
                          </button>
                        </Form>
                        
                        {/* 삭제 버튼 */}
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="commentId" value={comment.id} />
                          <button
                            type="submit"
                            disabled={isLoading}
                            onClick={(e) => {
                              if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
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
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg mb-2">댓글이 없습니다</p>
              <p className="text-sm">
                {filters.search || filters.status 
                  ? "필터 조건에 맞는 댓글이 없습니다."
                  : "아직 작성된 댓글이 없습니다."
                }
              </p>
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