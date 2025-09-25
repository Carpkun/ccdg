import { useLoaderData, useActionData, Form, useFetcher, Link, useSearchParams } from "react-router";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { useState, useRef, useEffect } from "react";
import { validateImageFile, validateImageUrl, formatFileSize } from "../utils/uploadUtils";
import { redirect } from "react-router";

import type { Route } from "./+types/admin.authors";

interface Author {
  id: string;
  name: string;
  bio?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export function meta() {
  return [
    { title: "작가 관리 | 춘천답기 웹진 관리자" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // 관리자 권한 확인 (세션 기반)
  await requireUserId(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  
  // 서비스 롤 키로 관리자 클라이언트 생성
  const supabaseAdmin = createSupabaseAdminClient();

  try {
    // 작가 목록 조회 (검색 기능 포함)
    let query = supabaseAdmin
      .from('authors')
      .select('*')
      .order('created_at', { ascending: false });

    // 검색어가 있으면 필터링
    if (search) {
      query = query.or(`name.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    const { data: authors, error } = await query;

    if (error) {
      console.error('작가 목록 조회 오류:', error);
      return { authors: [], search, error: '작가 목록을 불러올 수 없습니다.' };
    }

    return { authors: authors || [], search };
  } catch (error) {
    console.error('작가 로더 오류:', error);
    return { authors: [], search, error: '서버 오류가 발생했습니다.' };
  }
}

export async function action({ request }: Route.ActionArgs) {
  // 관리자 권한 확인 (세션 기반)
  await requireUserId(request);
  
  const supabaseAdmin = createSupabaseAdminClient();
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const name = formData.get("name")?.toString();
    const bio = formData.get("bio")?.toString();
    const profile_image_url = formData.get("profile_image_url")?.toString();

    if (!name?.trim()) {
      return { success: false, message: "작가명을 입력해주세요." };
    }

    try {
      // 중복 이름 확인
      const { data: existingAuthor } = await supabaseAdmin
        .from('authors')
        .select('id')
        .eq('name', name.trim())
        .single();

      if (existingAuthor) {
        return { success: false, message: "이미 등록된 작가명입니다." };
      }

      const { error } = await supabaseAdmin
        .from('authors')
        .insert([{
          name: name.trim(),
          bio: bio?.trim() || null,
          profile_image_url: profile_image_url?.trim() || null
        }]);

      if (error) {
        console.error('작가 생성 오류:', error);
        return { success: false, message: "작가 등록에 실패했습니다." };
      }

      return redirect('/admin/authors?success=created');
    } catch (error) {
      console.error('작가 생성 중 오류:', error);
      return { success: false, message: "서버 오류가 발생했습니다." };
    }
  }

  if (intent === "update") {
    const id = formData.get("id")?.toString();
    const name = formData.get("name")?.toString();
    const bio = formData.get("bio")?.toString();
    const profile_image_url = formData.get("profile_image_url")?.toString();

    if (!id || !name?.trim()) {
      return { success: false, message: "필수 정보가 누락되었습니다." };
    }

    try {
      // 중복 이름 확인 (자기 자신 제외)
      const { data: existingAuthor } = await supabaseAdmin
        .from('authors')
        .select('id')
        .eq('name', name.trim())
        .neq('id', id)
        .single();

      if (existingAuthor) {
        return { success: false, message: "이미 사용 중인 작가명입니다." };
      }

      const { error } = await supabaseAdmin
        .from('authors')
        .update({
          name: name.trim(),
          bio: bio?.trim() || null,
          profile_image_url: profile_image_url?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('작가 수정 오류:', error);
        return { success: false, message: "작가 정보 수정에 실패했습니다." };
      }

      return redirect('/admin/authors?success=updated');
    } catch (error) {
      console.error('작가 수정 중 오류:', error);
      return { success: false, message: "서버 오류가 발생했습니다." };
    }
  }

  if (intent === "delete") {
    const id = formData.get("id")?.toString();

    if (!id) {
      return { success: false, message: "작가 ID가 누락되었습니다." };
    }

    try {
      // 작가 존재 확인
      const { data: author, error: fetchError } = await supabaseAdmin
        .from('authors')
        .select('name')
        .eq('id', id)
        .single();

      if (fetchError || !author) {
        return { success: false, message: "작가를 찾을 수 없습니다." };
      }

      const { error } = await supabaseAdmin
        .from('authors')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('작가 삭제 오류:', error);
        return { success: false, message: "작가 삭제에 실패했습니다." };
      }

      return redirect('/admin/authors?success=deleted');
    } catch (error) {
      console.error('작가 삭제 중 오류:', error);
      return { success: false, message: "서버 오류가 발생했습니다." };
    }
  }

  return { success: false, message: "잘못된 요청입니다." };
}

export default function AdminAuthors() {
  const { authors, search } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  
  // URL 파라미터에서 성공 메시지 가져오기
  const [searchParams] = useSearchParams();
  const successType = searchParams.get('success');
  
  const getSuccessMessage = (type: string | null) => {
    switch (type) {
      case 'created': return '작가가 성공적으로 등록되었습니다.';
      case 'updated': return '작가 정보가 성공적으로 수정되었습니다.';
      case 'deleted': return '작가가 성공적으로 삭제되었습니다.';
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link 
                to="/admin/dashboard" 
                className="text-xl font-bold text-gray-900"
              >
                춘천답기 관리자
              </Link>
              <nav className="flex space-x-4">
                <Link 
                  to="/admin/dashboard" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  대시보드
                </Link>
                <Link 
                  to="/admin/contents" 
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  콘텐츠 관리
                </Link>
                <Link 
                  to="/admin/authors" 
                  className="text-blue-600 bg-blue-50 px-3 py-2 text-sm font-medium rounded-md"
                >
                  작가 관리
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <Link 
                to="/" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                사이트 보기
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 페이지 헤더 */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">작가 관리</h1>
              <p className="mt-2 text-gray-600">웹진에 등록된 작가를 관리하세요</p>
            </div>
          </div>
        </div>

        {/* 성공 메시지 표시 */}
        {getSuccessMessage(successType) && (
          <div className="mb-6 mx-4 sm:mx-0 p-4 rounded-md bg-green-50 border border-green-200 text-green-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {getSuccessMessage(successType)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {actionData?.message && !actionData.success && (
          <div className="mb-6 mx-4 sm:mx-0 p-4 rounded-md bg-red-50 border border-red-200 text-red-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">❌</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {actionData.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 작가 등록/수정 폼 */}
          <div className="lg:col-span-1">
            <AuthorForm 
              author={editingAuthor} 
              onCancel={() => setEditingAuthor(null)}
            />
          </div>

          {/* 작가 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    등록된 작가 ({authors.length}명)
                    {search && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ('{search}' 검색 결과)
                      </span>
                    )}
                  </h3>
                </div>
                
                {/* 검색창 */}
                <div className="mb-6">
                  <Form method="get" className="flex gap-2">
                    <input
                      type="text"
                      name="search"
                      defaultValue={search}
                      placeholder="작가명 또는 소개로 검색..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      검색
                    </button>
                    {search && (
                      <Link
                        to="/admin/authors"
                        className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        초기화
                      </Link>
                    )}
                  </Form>
                </div>

                {authors.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">👤</div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      {search ? `'${search}' 검색 결과가 없습니다` : '등록된 작가가 없습니다'}
                    </h3>
                    <p className="text-gray-500">
                      {search ? '다른 검색어로 다시 시도해보세요.' : '왼쪽 폼을 사용하여 새 작가를 등록해보세요.'}
                    </p>
                    {search && (
                      <Link
                        to="/admin/authors"
                        className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        전체 작가 보기
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {authors.map((author) => (
                      <AuthorCard 
                        key={author.id} 
                        author={author} 
                        onEdit={setEditingAuthor}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 작가 카드 컴포넌트
function AuthorCard({ author, onEdit }: { author: Author; onEdit: (author: Author) => void }) {
  const deleteFetcher = useFetcher();
  const updateFetcher = useFetcher();

  const handleDelete = () => {
    if (confirm(`'${author.name}' 작가를 삭제하시겠습니까?`)) {
      deleteFetcher.submit(
        { intent: "delete", id: author.id },
        { method: "post" }
      );
    }
  };

  return (
    <div className="flex items-start p-4 bg-gray-50 rounded-lg border">
      {/* 프로필 이미지 */}
      <div className="flex-shrink-0 mr-4">
        {author.profile_image_url ? (
          <img
            src={author.profile_image_url}
            alt={`${author.name} 프로필`}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">
              {author.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 작가 정보 */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900">{author.name}</h4>
        {author.bio && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {author.bio}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          등록일: {new Date(author.created_at).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onEdit(author)}
          className="p-2 text-blue-600 hover:text-blue-800"
          title="수정"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteFetcher.state === 'submitting'}
          className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
          title="삭제"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 작가 등록/수정 폼 컴포넌트
function AuthorForm({ author, onCancel }: { author: Author | null; onCancel: () => void }) {
  const [imageMethod, setImageMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!author;

  // 편집 모드일 때 기존 데이터로 초기화
  useEffect(() => {
    if (author) {
      setPreviewUrl(author.profile_image_url || '');
    } else {
      setPreviewUrl('');
      setSelectedFile(null);
      setValidationError('');
    }
  }, [author]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError('');
    
    // 파일 유효성 검사
    const validation = await validateImageFile(file, 2 * 1024 * 1024, 1024, 1024);
    
    if (!validation.isValid) {
      setValidationError(validation.error!);
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreviewUrl(url);
    if (selectedFile) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {isEditing ? '작가 정보 수정' : '새 작가 등록'}
          </h3>
          {isEditing && (
            <button
              onClick={onCancel}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              취소
            </button>
          )}
        </div>
        
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value={isEditing ? "update" : "create"} />
          {isEditing && <input type="hidden" name="id" value={author.id} />}
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              작가명 *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={author?.name || ''}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="작가명을 입력하세요"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              작가 소개
            </label>
            <textarea
              name="bio"
              id="bio"
              rows={3}
              defaultValue={author?.bio || ''}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="작가에 대한 간단한 소개를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로필 이미지
            </label>
            
            {/* 업로드 방식 선택 */}
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="url"
                  checked={imageMethod === 'url'}
                  onChange={(e) => setImageMethod(e.target.value as 'url')}
                  className="mr-2"
                />
                URL 입력
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="file"
                  checked={imageMethod === 'file'}
                  onChange={(e) => setImageMethod(e.target.value as 'file')}
                  className="mr-2"
                />
                파일 업로드
              </label>
            </div>

            {imageMethod === 'url' ? (
              <input
                type="url"
                name="profile_image_url"
                value={previewUrl}
                onChange={handleUrlChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="https://example.com/image.jpg"
              />
            ) : (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <input type="hidden" name="profile_image_url" value={previewUrl} />
                <p className="mt-1 text-xs text-gray-500">
                  최대 2MB, 1024x1024px 이하의 이미지만 업로드 가능합니다.
                </p>
                {selectedFile && (
                  <p className="mt-1 text-xs text-green-600">
                    선택된 파일: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </>
            )}

            {validationError && (
              <p className="mt-1 text-xs text-red-600">{validationError}</p>
            )}

            {/* 미리보기 */}
            {previewUrl && (
              <div className="mt-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    className="w-16 h-16 rounded-full object-cover border"
                    onError={() => setPreviewUrl('')}
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    이미지 제거
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isEditing ? '수정하기' : '작가 등록'}
            </button>
            
            {isEditing && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}
