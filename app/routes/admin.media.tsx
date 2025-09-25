import { useLoaderData, Link, Form, useActionData, useNavigation } from "react-router";
import { requireUserId } from "../lib/session.server";
import { createSupabaseAdminClient } from "../lib/supabase";
import { useState } from "react";

import type { Route } from "./+types/admin.media";

interface MediaFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  created_at: string;
  bucket_id?: string;
}

export function meta() {
  return [
    { title: "미디어 관리 | 관리자 | 춘천답기 웹진" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request);
  
  const supabaseAdmin = createSupabaseAdminClient();
  
  try {
    // Supabase Storage에서 파일 목록 조회
    const { data: files, error } = await supabaseAdmin.storage
      .from('media')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      
    if (error) {
      console.error('미디어 파일 조회 오류:', error);
      return { files: [], error: '미디어 파일을 불러오는데 실패했습니다.' };
    }
    
    // 파일 URL 및 메타데이터 생성
    const mediaFiles: MediaFile[] = files?.map(file => ({
      id: file.name,
      name: file.name,
      url: `https://oeeznxdrubsutvezyhxi.supabase.co/storage/v1/object/public/media/${file.name}`,
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || 'unknown',
      created_at: file.created_at || new Date().toISOString()
    })) || [];
    
    return { files: mediaFiles };
  } catch (error) {
    console.error('미디어 로더 오류:', error);
    return { files: [], error: '서버 오류가 발생했습니다.' };
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireUserId(request);
  
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();
  const fileName = formData.get("fileName")?.toString();
  
  if (!intent || !fileName) {
    return {
      success: false,
      message: "잘못된 요청입니다."
    };
  }
  
  const supabaseAdmin = createSupabaseAdminClient();
  
  try {
    if (intent === "delete") {
      const { error } = await supabaseAdmin.storage
        .from('media')
        .remove([fileName]);
        
      if (error) {
        console.error('파일 삭제 오류:', error);
        return {
          success: false,
          message: "파일 삭제에 실패했습니다."
        };
      }
      
      return {
        success: true,
        message: "파일이 성공적으로 삭제되었습니다."
      };
    }
    
    return {
      success: false,
      message: "알 수 없는 작업입니다."
    };
  } catch (error) {
    console.error('미디어 액션 오류:', error);
    return {
      success: false,
      message: "서버 오류가 발생했습니다."
    };
  }
}

export default function AdminMedia() {
  const { files, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const isLoading = navigation.state === "submitting";
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    return '📁';
  };
  
  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
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
              <h1 className="text-2xl font-bold text-gray-900">미디어 관리</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/upload"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                + 파일 업로드
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* 오류 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
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
        
        {/* 통계 */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">미디어 라이브러리</h3>
              <p className="text-gray-600">총 {files.length}개의 파일이 있습니다.</p>
            </div>
            {selectedFiles.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedFiles.length}개 파일 선택됨
              </div>
            )}
          </div>
        </div>
        
        {/* 파일 목록 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {files.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-6">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className={`relative group border-2 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
                    selectedFiles.includes(file.name) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleFileSelection(file.name)}
                >
                  {/* 파일 미리보기 */}
                  <div className="aspect-square mb-2 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={file.url} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl">
                        {getFileTypeIcon(file.type)}
                      </span>
                    )}
                  </div>
                  
                  {/* 파일 정보 */}
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                      {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(file.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                        title="새 창에서 열기"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                      
                      <Form method="post" className="inline" onClick={(e) => e.stopPropagation()}>
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="fileName" value={file.name} />
                        <button
                          type="submit"
                          disabled={isLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) {
                              e.preventDefault();
                            }
                          }}
                          className="p-1 bg-white rounded-full shadow-md hover:bg-red-50 disabled:opacity-50"
                          title="삭제"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </Form>
                    </div>
                  </div>
                  
                  {/* 선택 체크박스 */}
                  {selectedFiles.includes(file.name) && (
                    <div className="absolute top-2 left-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-lg mb-2">업로드된 미디어 파일이 없습니다</p>
              <p className="text-sm mb-4">파일을 업로드하여 미디어 라이브러리를 구축해보세요.</p>
              <Link
                to="/admin/upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                파일 업로드하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}