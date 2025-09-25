import { useLoaderData, useActionData, Form, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import { createSupabaseServerClient } from "../lib/supabase";
import type { Content, Comment } from "../lib/types";
import { CATEGORIES } from "../lib/types";
import { getEmbedUrl } from "../utils/videoUtils";
import { getVideoThumbnailUrl } from "../utils/imageOptimization";
import PhotoContent from "../components/PhotoContent";
import CalligraphyContent from "../components/CalligraphyContent";
import VideoContent from "../components/VideoContent";
import TTSPlayer from "../components/TTSPlayer";

import type { Route } from "./+types/content.$id";

// 글로벌 타입 선언
declare global {
  var recentViews: Map<string, number> | undefined;
}

// 좋아요 중복 방지를 위한 인메모리 캐시
const recentLikes = new Map<string, number>();

// IP별 좋아요 제한 확인 (영구적, 한 번만 가능)
function canLike(ip: string, contentId: string): boolean {
  const key = `${ip}-${contentId}`;
  
  // 이미 좋아요를 눌렀다면 차단
  if (recentLikes.has(key)) {
    return false;
  }
  
  return true;
}

// 좋아요 기록
function recordLike(ip: string, contentId: string): void {
  const key = `${ip}-${contentId}`;
  recentLikes.set(key, Date.now());
}


export function meta({ data }: Route.MetaArgs) {
  if (!data?.content) {
    return [
      { title: "콘텐츠를 찾을 수 없습니다" },
    ];
  }

  const { content } = data;
  const category = CATEGORIES[content.category as keyof typeof CATEGORIES];
  
  return [
    { title: `${content.title} | ${category?.name} | 춘천답기 웹진` },
    { name: "description", content: content.content.replace(/<[^>]*>/g, '').substring(0, 160) },
    { name: "keywords", content: `${content.title},${content.author_name},${category?.name},춘천답기` },
    { property: "og:title", content: content.title },
    { property: "og:description", content: content.content.replace(/<[^>]*>/g, '').substring(0, 160) },
    { property: "og:type", content: "article" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params;
  const supabase = createSupabaseServerClient(request);
  
  try {
    // 콘텐츠 조회
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single();
    
    if (contentError || !content) {
      throw new Response("콘텐츠를 찾을 수 없습니다", { status: 404 });
    }
    
    // 댓글 조회 - 삭제되지 않은 댓글만 조회
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content_id, user_name, body, created_at')
      .eq('content_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true});
    
    if (commentsError) {
      console.error('Error loading comments:', commentsError);
    }
    
    // 작가 정보 조회 (프로필 이미지 포함)
    const { data: authorInfo, error: authorInfoError } = await supabase
      .from('authors')
      .select('id, name, bio, profile_image_url')
      .eq('name', content.author_name)
      .single();
    
    if (authorInfoError && authorInfoError.code !== 'PGRST116') {
      console.error('Error loading author info:', authorInfoError);
    }
    
    // 작가의 다른 작품들 조회 (5개 최대)
    const { data: authorWorks, error: authorWorksError } = await supabase
      .from('contents')
      .select('id, title, category, created_at, view_count, likes_count, thumbnail_url, image_url, video_url, video_platform')
      .eq('author_name', content.author_name)
      .eq('is_published', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (authorWorksError) {
      console.error('Error loading author works:', authorWorksError);
    }
    
    // 관련 작품들 조회 (같은 카테고리, 3개 최대)
    const { data: relatedWorks, error: relatedWorksError } = await supabase
      .from('contents')
      .select('id, title, author_name, category, created_at, view_count, likes_count, thumbnail_url, image_url, video_url, video_platform')
      .eq('category', content.category)
      .eq('is_published', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (relatedWorksError) {
      console.error('Error loading related works:', relatedWorksError);
    }
    
    // 조회수 증가 (안전한 중복 방지)
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    request.headers.get('x-real-ip') || 
                    request.headers.get('cf-connecting-ip') || 
                    'unknown';
    
    // 간단한 중복 방지: 조회수 캐시 사용
    const viewKey = `view_${clientIP}_${id}`;
    const recentViews = global.recentViews || (global.recentViews = new Map());
    const now = Date.now();
    const lastView = recentViews.get(viewKey);
    
    // 5분 내 중복 조회 방지
    if (!lastView || now - lastView >= 5 * 60 * 1000) {
      try {
        // 조회수 업데이트 (원자적 연산)
        const { error: updateError } = await supabase
          .from('contents')
          .update({ 
            view_count: content.view_count + 1
          })
          .eq('id', id);
          
        if (!updateError) {
          content.view_count += 1;
          // 조회 시간 기록
          recentViews.set(viewKey, now);
          
          // 오래된 캐시 정리 (10분 이상 된 항목 제거)
          for (const [key, timestamp] of recentViews.entries()) {
            if (now - timestamp > 10 * 60 * 1000) {
              recentViews.delete(key);
            }
          }
        }
      } catch (error) {
        // 조회수 업데이트 실패해도 페이지는 정상 로드
        console.error('Error updating view count:', error);
      }
    }
    
    return { 
      content, 
      comments: comments || [],
      authorInfo: authorInfo || null,
      authorWorks: authorWorks || [],
      relatedWorks: relatedWorks || []
    };
  } catch (error) {
    console.error('Error in content loader:', error);
    throw new Response("서버 오류가 발생했습니다", { status: 500 });
  }
}

export async function action({ params, request }: Route.ActionArgs) {
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get('intent')?.toString();
  const supabase = createSupabaseServerClient(request);
  
  const clientIP = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown';
  
  if (intent === 'like') {
    try {
      // IP 기반 중복 방지 체크
      if (!canLike(clientIP, id)) {
        return { 
          success: false, 
          message: '이미 좋아요를 눌렀습니다.' 
        };
      }

      // 콘텐츠 존재 확인
      const { data: content, error: fetchError } = await supabase
        .from('contents')
        .select('id, title, likes_count')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (fetchError || !content) {
        return { success: false, message: '콘텐츠를 찾을 수 없습니다.' };
      }

      // 좋아요 수 증가 (원자적 업데이트)
      const { data: updatedContent, error: updateError } = await supabase
        .from('contents')
        .update({ 
          likes_count: content.likes_count + 1 
        })
        .eq('id', id)
        .select('likes_count')
        .single();

      if (updateError) {
        return { success: false, message: '좋아요 중 오류가 발생했습니다.' };
      }
      
      // 좋아요 기록
      recordLike(clientIP, id);
      
      return { 
        success: true, 
        message: '좋아요를 눌렀습니다!',
        likes_count: updatedContent.likes_count
      };
    } catch (error) {
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }
  
  if (intent === 'comment') {
    try {
      const author_name = formData.get('author_name')?.toString();
      const content = formData.get('content')?.toString();
      const password = formData.get('password')?.toString();
      
      if (!author_name || !content || !password) {
        return { success: false, message: '사용자명, 비밀번호, 댓글 내용을 모두 입력해주세요.' };
      }
      
      if (author_name.length < 2 || author_name.length > 20) {
        return { success: false, message: '사용자명은 2-20자 사이로 입력해주세요.' };
      }
      
      if (password.length < 4 || password.length > 50) {
        return { success: false, message: '비밀번호는 4-50자 사이로 입력해주세요.' };
      }
      
      if (content.length > 2000) {
        return { success: false, message: '댓글은 2000자 이하로 입력해주세요.' };
      }
      
      // 비밀번호 해시화 (간단한 해시 - 실제 환경에서는 bcrypt 등 사용 권장)
      const crypto = await import('crypto');
      const passwordHash = crypto.createHash('sha256').update(password + 'salt').digest('hex');
      
      // 댓글 추가
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          content_id: id,
          user_id: clientIP, // 임시로 IP를 user_id로 사용
          user_name: author_name,
          user_email: '', // 비밀번호 방식에서는 이메일 필드 사용 안함
          body: content, // 실제 스키마는 body 필드 사용
          is_reported: false,
          is_deleted: false,
          password_hash: passwordHash
        });
      
      if (commentError) {
        console.error('Error adding comment:', commentError);
        return { success: false, message: '댓글 작성 중 오류가 발생했습니다.' };
      }
      
      return { success: true, message: '댓글이 작성되었습니다.' };
    } catch (error) {
      console.error('Error in comment action:', error);
      return { success: false, message: '서버 오류가 발생했습니다.' };
    }
  }
  
  return { success: false, message: '잘못된 요청입니다.' };
}

export default function ContentDetail() {
  const { content, comments, authorInfo, authorWorks, relatedWorks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const likeFetcher = useFetcher();
  const category = CATEGORIES[content.category as keyof typeof CATEGORIES];
  
  // 좋아요 수 상태 관리
  const [likesCount, setLikesCount] = useState(content.likes_count);
  const [hasLiked, setHasLiked] = useState(false);
  
  // 로컬 스토리지에서 좋아요 상태 확인
  useEffect(() => {
    const likedContents = JSON.parse(localStorage.getItem('likedContents') || '[]');
    setHasLiked(likedContents.includes(content.id));
  }, [content.id]);
  
  // 좋아요 성공 시 수를 업데이트
  useEffect(() => {
    if (likeFetcher.data) {
      // 좋아요 성공 시 카운트 업데이트
      if (likeFetcher.data.success && typeof likeFetcher.data.likes_count === 'number') {
        setLikesCount(likeFetcher.data.likes_count);
        setHasLiked(true);
        // 로컬 스토리지에 좋아요 상태 저장
        const likedContents = JSON.parse(localStorage.getItem('likedContents') || '[]');
        if (!likedContents.includes(content.id)) {
          likedContents.push(content.id);
          localStorage.setItem('likedContents', JSON.stringify(likedContents));
        }
      }
    }
  }, [likeFetcher.data, content.id]);
  
  // 댑글 관련 메시지를 alert로 표시
  useEffect(() => {
    if (actionData?.message) {
      alert(actionData.message);
    }
  }, [actionData]);
  
  const handleLike = () => {
    if (!hasLiked && likeFetcher.state === 'idle') {
      likeFetcher.submit(
        { intent: 'like' },
        { method: 'post' }
      );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 배너 */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">
              {content.title}
            </h1>
            <div className="flex items-center justify-center space-x-6 text-lg opacity-90">
              <span>{new Date(content.created_at).toLocaleDateString('ko-KR')}</span>
              <span>•</span>
              <span>{content.author_name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 메인 콘텐츠 영역 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 -mt-12 relative z-10">
          {/* 글제목 섹션 */}
          <div className="flex items-center mb-6">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{category?.icon}</span>
              <h2 className="text-lg font-medium text-gray-900">{content.title}</h2>
            </div>
          </div>
          
          {/* 조회수 및 좋아요 정보 */}
          <div className="flex items-center justify-between py-4 mb-6 border-b border-gray-200">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600">{content.view_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-600">{likesCount}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* TTS 기능 (수필 카테고리에만 표시) */}
              {content.category === 'essay' && (
                <div className="flex-1 max-w-md">
                  <TTSPlayer 
                    text={content.content}
                    contentId={content.id}
                    className="w-full"
                  />
                </div>
              )}
              
              <button
                onClick={handleLike}
                disabled={hasLiked || likeFetcher.state === 'submitting'}
                className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-colors border flex-shrink-0 ${
                  hasLiked 
                    ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-red-50 hover:bg-red-100 disabled:bg-gray-100 text-red-600 disabled:text-gray-400 border-red-200'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                <span>
                  {hasLiked ? '좋아요 완료' : 
                   likeFetcher.state === 'submitting' ? '처리 중...' : '좋아요'}
                </span>
              </button>
            </div>
          </div>
          
          {/* 콘텐츠 내용 */}
          <div className="prose max-w-none mb-8">
            {content.category === 'poetry' && content.original_text && content.translation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">원문</h3>
                  <div className="whitespace-pre-line text-lg leading-relaxed">
                    {content.original_text}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">번역</h3>
                  <div className="whitespace-pre-line text-lg leading-relaxed">
                    {content.translation}
                  </div>
                </div>
              </div>
            ) : content.category === 'video' && content.video_url ? (
              <VideoContent content={content} />
            ) : content.category === 'photo' && (content.image_url || content.thumbnail_url) ? (
              <PhotoContent content={content} />
            ) : content.category === 'calligraphy' && (content.image_url || content.thumbnail_url) ? (
              <CalligraphyContent content={content} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: content.content }} />
            )}
          </div>
          
        </div>
        
        {/* 작가 소개 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <a 
            href={`/author/${encodeURIComponent(content.author_name)}`}
            className="flex items-center mb-6 group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden mr-4 flex-shrink-0">
              {authorInfo?.profile_image_url ? (
                <img
                  src={authorInfo.profile_image_url}
                  alt={content.author_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                  {content.author_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{content.author_name}</h3>
              <p className="text-gray-600 group-hover:text-gray-700 transition-colors">
                {authorInfo?.bio || '춘천문화원 창작자 네트워크의 멤버로 다양한 창작 활동을 하고 있습니다.'}
              </p>
            </div>
          </a>
          
          {/* 다른 작품 섹션 - 조건부 표시 */}
          {authorWorks.length > 0 ? (
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">이 작가의 다른 작품</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authorWorks.slice(0, 3).map((work) => {
                  const workCategory = CATEGORIES[work.category as keyof typeof CATEGORIES];
                  return (
                    <a
                      key={work.id}
                      href={`/content/${work.id}`}
                      className="group block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = workCategory?.color || '#6B7280';
                        (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
                        (e.currentTarget as HTMLElement).style.borderWidth = '2px';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = '';
                        (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
                        (e.currentTarget as HTMLElement).style.borderWidth = '1px';
                      }}
                    >
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{workCategory?.icon}</span>
                        <span className="text-sm text-gray-500">{workCategory?.name}</span>
                      </div>
                      <h5 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                        {work.title}
                      </h5>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(work.created_at).toLocaleDateString('ko-KR')}</span>
                        <div className="flex items-center space-x-3">
                          <span>조회 {work.view_count}</span>
                          <span>좋아요 {work.likes_count}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
              
              <div className="text-center mt-6">
                <a 
                  href={`/author/${encodeURIComponent(content.author_name)}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {authorWorks.length > 3 
                    ? `${content.author_name} 작가의 모든 작품 보기 (${authorWorks.length}개)`
                    : `${content.author_name} 작가 보기`
                  }
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <div className="border-t pt-6">
              <div className="text-center py-8">
                <div className="text-4xl text-gray-300 mb-3">🎆</div>
                <h4 className="text-lg font-medium text-gray-600 mb-2">첫 번째 작품입니다!</h4>
                <p className="text-sm text-gray-500 mb-4">{content.author_name} 작가의 추가 작품을 기대해보세요.</p>
                <a 
                  href={`/author/${encodeURIComponent(content.author_name)}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {content.author_name} 작가 보기
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
        
        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <svg className="w-6 h-6 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900">댓글</h3>
          </div>
          
          {/* 댓글 작성 폼 */}
          <div className="mb-8">
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="comment" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">사용자명 *</label>
                  <input
                    name="author_name"
                    placeholder="사용자명 입력 (2-20자)"
                    required
                    maxLength={20}
                    minLength={2}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 *</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="비밀번호 입력 (4-50자)"
                    required
                    maxLength={50}
                    minLength={4}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <div className="text-blue-700 space-y-1">
                  <p>• 사용자명과 비밀번호는 댓글 삭제/수정 시 필요합니다</p>
                  <p>• 비밀번호는 안전하게 암호화되어 저장됩니다</p>
                  <p>• 다른 사람이 사용할 수 있는 비밀번호는 피해주세요</p>
                </div>
              </div>
              
              <div>
                <textarea
                  name="content"
                  placeholder="이 작품에 대한 생각을 댓글로 남겨보세요."
                  required
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const counter = target.parentElement?.querySelector('.char-counter') as HTMLElement;
                    if (counter) {
                      counter.textContent = `${target.value.length}/2000`;
                    }
                  }}
                />
                <div className="flex justify-end mt-2">
                  <span className="text-sm text-gray-500 char-counter">0/2000</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-4">따뜻하고 건전한 댓글 문화를 위해 상대방을 배려하는 마음으로 댓글을 남겨주세요.</p>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  댓글 작성
                </button>
              </div>
            </Form>
          </div>
          
          {/* 댓글 목록 */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {comment.user_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{comment.user_name}</span>
                        <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-11">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl text-gray-300 mb-4">💬</div>
              <h4 className="text-xl font-medium text-gray-600 mb-2">아직 댓글이 없습니다</h4>
              <p className="text-gray-500">이 작품에 대한 첫 번째 댓글을 남겨보세요.</p>
            </div>
          )}
        </div>
        
        {/* 관련 작품 섹션 */}
        {relatedWorks.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">관련 {category?.name} 작품</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedWorks.map((work) => {
                const workCategory = CATEGORIES[work.category as keyof typeof CATEGORIES];
                
                // 영상 컨텐츠인 경우 동적 썸네일 생성
                let thumbnailUrl = work.image_url || work.thumbnail_url;
                if (work.category === 'video' && work.video_url && work.video_platform && !thumbnailUrl) {
                  thumbnailUrl = getVideoThumbnailUrl(work.video_url, work.video_platform);
                }
                
                return (
                  <a 
                    key={work.id} 
                    href={`/content/${work.id}`}
                    className="block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all group border border-gray-200"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = workCategory?.color || '#6B7280';
                      (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
                      (e.currentTarget as HTMLElement).style.borderWidth = '2px';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '';
                      (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
                      (e.currentTarget as HTMLElement).style.borderWidth = '1px';
                    }}
                  >
                    {thumbnailUrl ? (
                      <div className="aspect-video bg-gray-200">
                        <img
                          src={thumbnailUrl}
                          alt={work.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-colors">
                        <span className="text-4xl text-gray-400">{workCategory?.icon}</span>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <div className="flex items-center mb-2">
                        <span className="text-sm mr-2">{workCategory?.icon}</span>
                        <span className="text-xs text-gray-500">{workCategory?.name}</span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {work.title}
                      </h4>
                      
                      <p className="text-sm text-gray-600 mb-3">{work.author_name}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(work.created_at).toLocaleDateString('ko-KR')}</span>
                        <div className="flex items-center space-x-3">
                          <span>조회 {work.view_count}</span>
                          <span>좋아요 {work.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
