import { useLoaderData, Link, Form } from "react-router";
import { requireUserId, getUser, logout } from "../lib/session.server";
import { createSupabaseServerClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";

import type { Route } from "./+types/admin.dashboard";

export function meta() {
  return [
    { title: "관리자 대시보드 | 춘천답기 웹진" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request);
  const user = await getUser(request);
  const supabase = createSupabaseServerClient(request);

  try {
    // 전체 통계 데이터 가져오기
    const [
      { count: totalContents },
      { count: publishedContents },
      { data: viewsData },
      { data: likesData },
      { count: totalComments }
    ] = await Promise.all([
      supabase.from('contents').select('*', { count: 'exact', head: true }),
      supabase.from('contents').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('contents').select('view_count').eq('is_published', true),
      supabase.from('contents').select('likes_count').eq('is_published', true),
      supabase.from('comments').select('*', { count: 'exact', head: true })
    ]);
    
    // 조회수와 좋아요수 합산
    const totalViews = viewsData?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;
    const totalLikes = likesData?.reduce((sum, item) => sum + (item.likes_count || 0), 0) || 0;

    // 카테고리별 통계
    const categoryStats = await Promise.all(
      Object.keys(CATEGORIES).map(async (category) => {
        const { count } = await supabase
          .from('contents')
          .select('*', { count: 'exact', head: true })
          .eq('category', category)
          .eq('is_published', true);
        
        return {
          category,
          name: CATEGORIES[category as keyof typeof CATEGORIES].name,
          icon: CATEGORIES[category as keyof typeof CATEGORIES].icon,
          count: count || 0
        };
      })
    );

    // 최근 콘텐츠 가져오기
    const { data: recentContents } = await supabase
      .from('contents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      user,
      stats: {
        totalContents: totalContents || 0,
        publishedContents: publishedContents || 0,
        totalViews: totalViews || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0
      },
      categoryStats,
      recentContents: recentContents || []
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return {
      user,
      stats: {
        totalContents: 0,
        publishedContents: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0
      },
      categoryStats: [],
      recentContents: []
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "logout") {
    return logout(request);
  }

  return null;
}

export default function AdminDashboard() {
  const { user, stats, categoryStats, recentContents } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin/dashboard" className="text-xl font-bold text-gray-900">
                춘천답기 관리자
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                안녕하세요, {user?.name}님
              </span>
              <Link
                to="/"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                사이트 보기
              </Link>
              <Form method="post">
                <button
                  type="submit"
                  name="intent"
                  value="logout"
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  로그아웃
                </button>
              </Form>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 페이지 헤더 */}
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">춘천답기 웹진 관리 현황을 확인하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📝</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      전체 콘텐츠
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalContents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      공개된 콘텐츠
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.publishedContents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👀</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      총 조회수
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalViews.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">❤️</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      총 좋아요
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalLikes.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💬</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      총 댓글
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalComments.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 카테고리별 현황 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                카테고리별 콘텐츠 현황
              </h3>
              <div className="space-y-4">
                {categoryStats.map((stat) => (
                  <div key={stat.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{stat.icon}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {stat.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-gray-900">
                        {stat.count}개
                      </span>
                      <Link
                        to={`/admin/contents?category=${stat.category}`}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        관리 →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 최근 작성된 콘텐츠 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  최근 작성된 콘텐츠
                </h3>
                <Link
                  to="/admin/contents"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  전체보기 →
                </Link>
              </div>
              <div className="space-y-3">
                {recentContents.length > 0 ? (
                  recentContents.map((content) => (
                    <div key={content.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {content.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {content.author_name} • {new Date(content.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          content.is_published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {content.is_published ? '공개' : '비공개'}
                        </span>
                        <Link
                          to={`/admin/contents/${content.id}/edit`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          수정
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    아직 작성된 콘텐츠가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 관리 메뉴 */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              관리 메뉴
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link
                to="/admin/contents/new"
                className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-sm font-medium text-gray-900">
                    새 콘텐츠 작성
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/contents"
                className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📚</div>
                  <div className="text-sm font-medium text-gray-900">
                    콘텐츠 관리
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/authors"
                className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="text-sm font-medium text-gray-900">
                    작가 관리
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/media"
                className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-sm font-medium text-gray-900">
                    미디어 관리
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/comments"
                className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <div className="text-sm font-medium text-gray-900">
                    댓글 관리
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}