import { Form, useActionData, useNavigation, Link, useLoaderData } from "react-router";
import { useState } from "react";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { CATEGORIES, type CategorySlug } from "../lib/types";
import ClientOnly from "../components/ClientOnly";
import TiptapEditor from "../components/TiptapEditor";

import type { Route } from "./+types/admin.contents.new";

export function meta() {
  return [
    { title: "새 콘텐츠 작성 | 관리자 | 춘천답기 웹진" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  
  const supabase = createSupabaseAdminClient();
  
  try {
    // 작가 목록 조회
    const { data: authors, error } = await supabase
      .from('authors')
      .select('id, name')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('작가 목록 조회 오류:', error);
      return { authors: [] };
    }
    
    return { authors: authors || [] };
  } catch (error) {
    console.error('로더 오류:', error);
    return { authors: [] };
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireUserId(request);

  const formData = await request.formData();
  const title = formData.get("title")?.toString();
  const content = formData.get("content")?.toString();
  const category = formData.get("category")?.toString() as CategorySlug;
  const author_name = formData.get("author_name")?.toString();
  const is_published = true; // 모든 콘텐츠 즉시 공개
  
  // 카테고리별 특화 필드
  const original_text = formData.get("original_text")?.toString() || null;
  const translation = formData.get("translation")?.toString() || null;
  const video_url = formData.get("video_url")?.toString() || null;
  const video_platform = formData.get("video_platform")?.toString() || null;
  let image_url = formData.get("image_url")?.toString() || null;
  const thumbnail_url = formData.get("thumbnail_url")?.toString() || null;
  
  // 파일 업로드 처리
  const image_file = formData.get("image_file") as File | null;
  const artwork_file = formData.get("artwork_file") as File | null;
  
  // 서화 전용 필드
  const artwork_size = formData.get("artwork_size")?.toString() || null;
  const artwork_material = formData.get("artwork_material")?.toString() || null;
  
  // 영상 전용 필드
  const performance_date = formData.get("performance_date")?.toString() || null;
  const performance_venue = formData.get("performance_venue")?.toString() || null;

  // 기본 검증
  if (!title || !content || !category || !author_name) {
    return {
      success: false,
      message: "제목, 내용, 카테고리, 작가명은 필수 항목입니다.",
      fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
    };
  }

  if (!(category in CATEGORIES)) {
    return {
      success: false,
      message: "올바르지 않은 카테고리입니다.",
      fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
    };
  }

  // 카테고리별 특화 검증
  if (category === 'poetry' && (!original_text || !translation)) {
    return {
      success: false,
      message: "한시 카테고리는 원문과 번역이 필요합니다.",
      fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
    };
  }

  if (category === 'video' && !video_url) {
    return {
      success: false,
      message: "영상 카테고리는 영상 URL이 필요합니다.",
      fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
    };
  }

  const supabase = createSupabaseAdminClient();

  try {
    // 파일 업로드 처리 (사진 또는 서화)
    if ((category === 'photo' && image_file && image_file.size > 0) || 
        (category === 'calligraphy' && artwork_file && artwork_file.size > 0)) {
      
      const file = category === 'photo' ? image_file : artwork_file;
      const fileExt = file!.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // 기존 폴더 구조에 맞게 수정
      const folderName = category === 'photo' ? 'category-photo' : 'category-calligraphy';
      const filePath = `${folderName}/${fileName}`;
      
      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('webzine-media') // 실제 storage bucket 이름
        .upload(filePath, file!);
      
      if (uploadError) {
        console.error('파일 업로드 오류:', uploadError);
        return {
          success: false,
          message: `파일 업로드 중 오류가 발생했습니다: ${uploadError.message}`,
          fields: { title, content, category, author_name, original_text, translation, video_url, thumbnail_url }
        };
      }
      
      // 업로드된 파일의 공개 URL 생성
      const { data: publicUrlData } = supabase.storage
        .from('webzine-media')
        .getPublicUrl(filePath);
      
      image_url = publicUrlData.publicUrl;
    }
    // 작가 정보 확인/생성
    let { data: author, error: authorError } = await supabase
      .from('authors')
      .select('id')
      .eq('name', author_name)
      .single();

    if (authorError && authorError.code === 'PGRST116') {
      // 작가가 없으면 새로 생성
      const { data: newAuthor, error: createAuthorError } = await supabase
        .from('authors')
        .insert({ name: author_name })
        .select('id')
        .single();

      if (createAuthorError) {
        return {
          success: false,
          message: "작가 정보 생성 중 오류가 발생했습니다.",
          fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
        };
      }

      author = newAuthor;
    } else if (authorError) {
      return {
        success: false,
        message: "작가 정보 조회 중 오류가 발생했습니다.",
        fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
      };
    }

    // author가 존재하는지 확인
    if (!author) {
      return {
        success: false,
        message: "작가 정보를 찾을 수 없습니다.",
        fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
      };
    }

    // 콘텐츠 데이터 준비 (필수 필드만)
    const contentData: any = {
      title,
      content,
      category,
      author_id: author.id,
      author_name,
      is_published: true // 모든 콘텐츠 즉시 공개
    };
    
    // 선택적 필드들 추가
    if (thumbnail_url) {
      contentData.thumbnail_url = thumbnail_url;
    }

    // 카테고리별 특화 데이터 추가
    if (category === 'poetry') {
      contentData.original_text = original_text;
      contentData.translation = translation;
    } else if (category === 'video') {
      contentData.video_url = video_url;
      contentData.video_platform = video_platform;
      contentData.performance_date = performance_date;
      contentData.performance_venue = performance_venue;
    } else if (category === 'photo') {
      contentData.image_url = image_url;
    } else if (category === 'calligraphy') {
      contentData.image_url = image_url;
      contentData.artwork_size = artwork_size;
      contentData.artwork_material = artwork_material;
    }

    // 콘텐츠 생성
    const { data: createdContent, error: contentError } = await supabase
      .from('contents')
      .insert(contentData)
      .select('id')
      .single();

    if (contentError) {
      console.error('콘텐츠 생성 오류 상세:', {
        error: contentError,
        message: contentError.message,
        code: contentError.code,
        details: contentError.details,
        hint: contentError.hint,
        contentData
      });
      return {
        success: false,
        message: `콘텐츠 생성 중 오류가 발생했습니다: ${contentError.message || contentError.code || '알 수 없는 오류'}`,
        fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
      };
    }

    // 성공 시 관리자 대시보드로 리다이렉트
    throw new Response(null, {
      status: 302,
      headers: {
        Location: "/admin/dashboard?success=content-created",
      },
    });

  } catch (error) {
    if (error instanceof Response) {
      throw error; // 리다이렉트는 그대로 던짐
    }
    
    console.error('Content creation error:', error);
    return {
      success: false,
      message: "서버 오류가 발생했습니다.",
      fields: { title, content, category, author_name, original_text, translation, video_url, image_url, thumbnail_url }
    };
  }
}

export default function NewContent() {
  const { authors } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug>('essay');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [photoInputType, setPhotoInputType] = useState<'upload' | 'url'>('upload');
  const [calligraphyInputType, setCalligraphyInputType] = useState<'upload' | 'url'>('upload');
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);
  const [calligraphyUploadSuccess, setCalligraphyUploadSuccess] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedCalligraphyFile, setSelectedCalligraphyFile] = useState<File | null>(null);

  const isSubmitting = navigation.state === 'submitting';

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
              <h1 className="text-2xl font-bold text-gray-900">새 콘텐츠 작성</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {actionData?.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            actionData.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {actionData.message}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg">
          <Form method="post" encType="multipart/form-data" className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  defaultValue={actionData?.fields?.title || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="콘텐츠 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  작가 선택 *
                </label>
                <div className="space-y-3">
                  <select
                    value={selectedAuthor}
                    onChange={(e) => {
                      setSelectedAuthor(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomAuthorName('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">작가를 선택하세요</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.name}>
                        {author.name}
                      </option>
                    ))}
                    <option value="custom">새 작가 등록</option>
                  </select>
                  
                  {selectedAuthor === 'custom' && (
                    <input
                      type="text"
                      value={customAuthorName}
                      onChange={(e) => setCustomAuthorName(e.target.value)}
                      placeholder="새 작가명을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  <input
                    type="hidden"
                    name="author_name"
                    value={selectedAuthor === 'custom' ? customAuthorName : selectedAuthor}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리 *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategorySlug)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORIES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* 카테고리별 특화 필드 */}
            {selectedCategory === 'poetry' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="original_text" className="block text-sm font-medium text-gray-700 mb-2">
                    원문 *
                  </label>
                  <textarea
                    id="original_text"
                    name="original_text"
                    rows={8}
                    defaultValue={actionData?.fields?.original_text || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="한시 원문을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="translation" className="block text-sm font-medium text-gray-700 mb-2">
                    번역문 *
                  </label>
                  <textarea
                    id="translation"
                    name="translation"
                    rows={8}
                    defaultValue={actionData?.fields?.translation || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="한글 번역을 입력하세요"
                  />
                </div>
              </div>
            )}

            {selectedCategory === 'video' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-2">
                      영상 URL *
                    </label>
                    <input
                      type="url"
                      id="video_url"
                      name="video_url"
                      defaultValue={actionData?.fields?.video_url || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="YouTube 또는 Vimeo URL을 입력하세요"
                    />
                  </div>
                  <div>
                    <label htmlFor="video_platform" className="block text-sm font-medium text-gray-700 mb-2">
                      영상 플랫폼
                    </label>
                    <select
                      id="video_platform"
                      name="video_platform"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="direct">직접 링크</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="performance_date" className="block text-sm font-medium text-gray-700 mb-2">
                      공연일자
                    </label>
                    <input
                      type="date"
                      id="performance_date"
                      name="performance_date"
                      defaultValue={(actionData?.fields as any)?.performance_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="performance_venue" className="block text-sm font-medium text-gray-700 mb-2">
                      공연장소
                    </label>
                    <input
                      type="text"
                      id="performance_venue"
                      name="performance_venue"
                      defaultValue={(actionData?.fields as any)?.performance_venue || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="공연장소를 입력하세요"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedCategory === 'photo' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사진 이미지 *
                  </label>
                  
                  {/* 입력 방식 선택 */}
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={photoInputType === 'upload'}
                        onChange={() => setPhotoInputType('upload')}
                        className="mr-2"
                      />
                      파일 업로드
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={photoInputType === 'url'}
                        onChange={() => setPhotoInputType('url')}
                        className="mr-2"
                      />
                      URL 입력
                    </label>
                  </div>
                  
                  {/* 파일 업로드 */}
                  {photoInputType === 'upload' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="mt-4">
                          <label htmlFor="image_file" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              {selectedPhotoFile ? selectedPhotoFile.name : '클릭하여 이미지 업로드'}
                            </span>
                            <input
                              id="image_file"
                              name="image_file"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedPhotoFile(file);
                                  setPhotoUploadSuccess(true);
                                  setTimeout(() => setPhotoUploadSuccess(false), 3000);
                                }
                              }}
                            />
                          </label>
                          <p className="mt-1 text-xs text-gray-500">
                            PNG, JPG, GIF 등 이미지 파일 (10MB 이하)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* URL 입력 */}
                  {photoInputType === 'url' && (
                    <input
                      type="url"
                      name="image_url"
                      defaultValue={actionData?.fields?.image_url || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="이미지 URL을 입력하세요"
                    />
                  )}
                  
                  {/* 업로드 성공 메시지 */}
                  {photoUploadSuccess && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-700 font-medium">이미지가 선택되었습니다!</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="thumbnail_url" className="block text-sm font-medium text-gray-700 mb-2">
                    섬네일 URL (선택사항)
                  </label>
                  <input
                    type="url"
                    id="thumbnail_url"
                    name="thumbnail_url"
                    defaultValue={actionData?.fields?.thumbnail_url || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="섬네일 이미지 URL (비워두면 메인 이미지 사용)"
                  />
                </div>
              </div>
            )}
            
            {selectedCategory === 'calligraphy' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서화 작품 이미지 *
                  </label>
                  
                  {/* 입력 방식 선택 */}
                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={calligraphyInputType === 'upload'}
                        onChange={() => setCalligraphyInputType('upload')}
                        className="mr-2"
                      />
                      파일 업로드
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={calligraphyInputType === 'url'}
                        onChange={() => setCalligraphyInputType('url')}
                        className="mr-2"
                      />
                      URL 입력
                    </label>
                  </div>
                  
                  {/* 파일 업로드 */}
                  {calligraphyInputType === 'upload' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="mt-4">
                          <label htmlFor="artwork_file" className="cursor-pointer">
                            <span className="mt-2 block text-sm font-medium text-gray-900">
                              {selectedCalligraphyFile ? selectedCalligraphyFile.name : '클릭하여 작품 이미지 업로드'}
                            </span>
                            <input
                              id="artwork_file"
                              name="artwork_file"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSelectedCalligraphyFile(file);
                                  setCalligraphyUploadSuccess(true);
                                  setTimeout(() => setCalligraphyUploadSuccess(false), 3000);
                                }
                              }}
                            />
                          </label>
                          <p className="mt-1 text-xs text-gray-500">
                            PNG, JPG, GIF 등 이미지 파일 (10MB 이하)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* URL 입력 */}
                  {calligraphyInputType === 'url' && (
                    <input
                      type="url"
                      name="image_url"
                      defaultValue={actionData?.fields?.image_url || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="서화 작품 이미지 URL을 입력하세요"
                    />
                  )}
                  
                  {/* 업로드 성공 메시지 */}
                  {calligraphyUploadSuccess && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-green-700 font-medium">작품 이미지가 선택되었습니다!</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="artwork_size" className="block text-sm font-medium text-gray-700 mb-2">
                      작품 크기
                    </label>
                    <input
                      type="text"
                      id="artwork_size"
                      name="artwork_size"
                      defaultValue={(actionData?.fields as any)?.artwork_size || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 50cm × 70cm"
                    />
                  </div>
                  <div>
                    <label htmlFor="artwork_material" className="block text-sm font-medium text-gray-700 mb-2">
                      사용 재료
                    </label>
                    <input
                      type="text"
                      id="artwork_material"
                      name="artwork_material"
                      defaultValue={(actionData?.fields as any)?.artwork_material || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="예: 한지, 묵, 붓 등"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="thumbnail_url" className="block text-sm font-medium text-gray-700 mb-2">
                    섬네일 URL (선택사항)
                  </label>
                  <input
                    type="url"
                    id="thumbnail_url"
                    name="thumbnail_url"
                    defaultValue={actionData?.fields?.thumbnail_url || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="섬네일 이미지 URL (비워두면 메인 이미지 사용)"
                  />
                </div>
              </div>
            )}

            {/* 본문 에디터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                본문 내용 *
              </label>
              <input 
                type="hidden" 
                name="content" 
                value={editorContent} 
              />
              <ClientOnly 
                fallback={
                  <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
                    <div className="text-gray-500">에디터를 로딩하고 있습니다...</div>
                  </div>
                }
              >
                {() => (
                  <TiptapEditor
                    content={actionData?.fields?.content || ''}
                    onChange={setEditorContent}
                    placeholder="본문 내용을 작성하세요..."
                    className="min-h-[400px]"
                  />
                )}
              </ClientOnly>
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                to="/admin/dashboard"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '저장 중...' : '콘텐츠 저장'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}