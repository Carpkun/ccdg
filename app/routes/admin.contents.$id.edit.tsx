import { useLoaderData, useActionData, Form, useNavigation, redirect, Link } from "react-router";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { CATEGORIES } from "../lib/types";
import { useState, useEffect } from "react";
import TiptapEditor from "../components/TiptapEditor";
import ClientOnly from "../components/ClientOnly";

import type { Route } from "./+types/admin.contents.$id.edit";

interface Content {
  id: string;
  title: string;
  content: string;
  category: string;
  author_name: string;
  author_id?: string;
  is_published: boolean;
  featured: boolean;
  image_url?: string;
  video_url?: string;
  video_platform?: string;
  original_text?: string;
  translation?: string;
  created_at: string;
  updated_at: string;
}

interface Author {
  id: string;
  name: string;
}

export function meta({ data }: { data: typeof loader }) {
  return [
    { title: `콘텐츠 수정 | 관리자 | 춘천답기 웹진` },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUserId(request);
  
  const contentId = params.id;
  if (!contentId) {
    throw new Response("콘텐츠 ID가 필요합니다", { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // 콘텐츠 정보 조회
    const { data: content, error: contentError } = await supabaseAdmin
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      throw new Response("콘텐츠를 찾을 수 없습니다", { status: 404 });
    }

    // 작가 목록 조회
    const { data: authors, error: authorsError } = await supabaseAdmin
      .from('authors')
      .select('id, name')
      .order('name');

    if (authorsError) {
      console.error('작가 목록 조회 오류:', authorsError);
      return { content, authors: [] };
    }

    return { content, authors: authors || [] };
  } catch (error) {
    console.error('콘텐츠 수정 페이지 로더 오류:', error);
    throw new Response("서버 오류가 발생했습니다", { status: 500 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUserId(request);
  
  const contentId = params.id;
  if (!contentId) {
    return { success: false, message: "콘텐츠 ID가 필요합니다." };
  }

  const formData = await request.formData();
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    const title = formData.get("title")?.toString();
    const content = formData.get("content")?.toString();
    const category = formData.get("category")?.toString();
    const authorName = formData.get("author_name")?.toString();
    const authorId = formData.get("author_id")?.toString();
    const isPublished = formData.get("is_published") === "true";
    const featured = formData.get("featured") === "true";
    const imageUrl = formData.get("image_url")?.toString();
    const videoUrl = formData.get("video_url")?.toString();
    const videoPlatform = formData.get("video_platform")?.toString();
    const originalText = formData.get("original_text")?.toString();
    const translation = formData.get("translation")?.toString();

    if (!title || !content || !category || !authorName) {
      return { success: false, message: "필수 필드를 모두 입력해주세요." };
    }

    // 카테고리별 필수 필드 검증
    if (category === 'poetry' && (!originalText || !translation)) {
      return { success: false, message: "한시는 원문과 번역이 필요합니다." };
    }

    if ((category === 'photo' || category === 'calligraphy') && !imageUrl) {
      return { success: false, message: "사진/서화작품은 이미지가 필요합니다." };
    }

    if (category === 'video' && (!videoUrl || !videoPlatform)) {
      return { success: false, message: "공연영상은 동영상 URL과 플랫폼 정보가 필요합니다." };
    }

    // 작가 처리
    let finalAuthorId = authorId;
    let finalAuthorName = authorName;

    if (!finalAuthorId && finalAuthorName) {
      // 작가명으로 기존 작가 찾기
      const { data: existingAuthor } = await supabaseAdmin
        .from('authors')
        .select('id, name')
        .eq('name', finalAuthorName.trim())
        .single();

      if (existingAuthor) {
        finalAuthorId = existingAuthor.id;
      } else {
        // 새 작가 생성
        const { data: newAuthor, error: authorError } = await supabaseAdmin
          .from('authors')
          .insert([{ name: finalAuthorName.trim() }])
          .select()
          .single();

        if (!authorError && newAuthor) {
          finalAuthorId = newAuthor.id;
        }
      }
    }


    // 콘텐츠 업데이트
    const updateData: any = {
      title: title.trim(),
      content: content.trim(),
      category,
      author_name: finalAuthorName.trim(),
      author_id: finalAuthorId || null,
      is_published: isPublished,
      featured,
      updated_at: new Date().toISOString()
    };

    // 카테고리별 필드 추가
    if (category === 'poetry') {
      updateData.original_text = originalText?.trim();
      updateData.translation = translation?.trim();
    }

    if (category === 'photo' || category === 'calligraphy') {
      updateData.image_url = imageUrl?.trim() || null;
    }

    if (category === 'video') {
      updateData.video_url = videoUrl?.trim();
      updateData.video_platform = videoPlatform;
    }

    const { error } = await supabaseAdmin
      .from('contents')
      .update(updateData)
      .eq('id', contentId);

    if (error) {
      console.error('콘텐츠 업데이트 오류:', error);
      return { success: false, message: "콘텐츠 수정에 실패했습니다." };
    }

    return redirect('/admin/contents?success=updated');
  } catch (error) {
    console.error('콘텐츠 수정 액션 오류:', error);
    return { success: false, message: "서버 오류가 발생했습니다." };
  }
}

export default function AdminContentEdit() {
  const { content, authors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState(content.category);
  const [selectedAuthorId, setSelectedAuthorId] = useState(content.author_id || '');
  const [authorName, setAuthorName] = useState(content.author_name);
  const [contentHtml, setContentHtml] = useState(content.content);

  const isLoading = navigation.state === "submitting";

  const categoryInfo = CATEGORIES[selectedCategory as keyof typeof CATEGORIES];

  const handleAuthorSelect = (authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    if (author) {
      setSelectedAuthorId(authorId);
      setAuthorName(author.name);
    }
  };

  const handleAuthorNameChange = (name: string) => {
    setAuthorName(name);
    // 직접 입력하는 경우 선택된 작가 ID 초기화
    const existingAuthor = authors.find(a => a.name === name);
    if (existingAuthor) {
      setSelectedAuthorId(existingAuthor.id);
    } else {
      setSelectedAuthorId('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/contents"
                className="text-blue-600 hover:text-blue-800"
              >
                ← 콘텐츠 관리
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">콘텐츠 수정</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 오류 메시지 */}
        {actionData?.message && !actionData.success && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {actionData.message}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <Form method="post" className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  defaultValue={content.title}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  카테고리 *
                </label>
                <select
                  name="category"
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(CATEGORIES).map(([key, category]) => (
                    <option key={key} value={key}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 작가 선택 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="author_select" className="block text-sm font-medium text-gray-700">
                  작가 선택
                </label>
                <select
                  id="author_select"
                  value={selectedAuthorId}
                  onChange={(e) => handleAuthorSelect(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">직접 입력</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="author_name" className="block text-sm font-medium text-gray-700">
                  작가명 *
                </label>
                <input
                  type="text"
                  name="author_name"
                  id="author_name"
                  value={authorName}
                  onChange={(e) => handleAuthorNameChange(e.target.value)}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input type="hidden" name="author_id" value={selectedAuthorId} />
              </div>
            </div>

            {/* 카테고리별 특수 필드 */}
            {selectedCategory === 'poetry' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="original_text" className="block text-sm font-medium text-gray-700">
                    원문 *
                  </label>
                  <textarea
                    name="original_text"
                    id="original_text"
                    rows={8}
                    defaultValue={content.original_text || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="translation" className="block text-sm font-medium text-gray-700">
                    번역 *
                  </label>
                  <textarea
                    name="translation"
                    id="translation"
                    rows={8}
                    defaultValue={content.translation || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {(selectedCategory === 'photo' || selectedCategory === 'calligraphy') && (
              <div>
                <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
                  이미지 URL *
                </label>
                <input
                  type="url"
                  name="image_url"
                  id="image_url"
                  defaultValue={content.image_url || ''}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {selectedCategory === 'video' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="video_url" className="block text-sm font-medium text-gray-700">
                    동영상 URL *
                  </label>
                  <input
                    type="url"
                    name="video_url"
                    id="video_url"
                    defaultValue={content.video_url || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="video_platform" className="block text-sm font-medium text-gray-700">
                    플랫폼 *
                  </label>
                  <select
                    name="video_platform"
                    id="video_platform"
                    defaultValue={content.video_platform || ''}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">선택하세요</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
            )}

            {/* 콘텐츠 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 *
              </label>
              <ClientOnly
                fallback={
                  <div className="min-h-[400px] border border-gray-300 rounded-md p-4 bg-gray-50 flex items-center justify-center text-gray-500">
                    에디터 로딩 중...
                  </div>
                }
              >
                {() => (
                  <TiptapEditor
                    content={contentHtml}
                    onChange={setContentHtml}
                    placeholder="콘텐츠 내용을 입력하세요..."
                    className="min-h-[400px]"
                  />
                )}
              </ClientOnly>
              <input type="hidden" name="content" value={contentHtml} />
            </div>


            {/* 설정 */}
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_published"
                  value="true"
                  defaultChecked={content.is_published}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">공개</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="featured"
                  value="true"
                  defaultChecked={content.featured}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">추천</span>
              </label>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                to="/admin/contents"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '수정 중...' : '수정하기'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}