import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import HardBreak from '@tiptap/extension-hard-break';
import { useCallback, useEffect, useState } from 'react';
import ClientOnly from './ClientOnly';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

// 내부 컴포넌트: 실제 Tiptap 에디터
function TiptapEditorInternal({ 
  content, 
  onChange, 
  placeholder = "여기에 내용을 작성하세요...",
  className = ""
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트에서만 마운트 상태 설정
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        hardBreak: false, // StarterKit의 기본 hardBreak를 비활성화
        paragraph: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
      }),
      HardBreak.configure({
        HTMLAttributes: {
          class: 'hard-break',
        },
        keepMarks: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        // Enter 키로 하드 브레이크 삽입 (일반 줄바꿈)
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          editor?.chain().focus().setHardBreak().run();
          return true;
        }
        // Shift + Enter로 새 문단 생성
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();
          editor?.chain().focus().splitBlock().run();
          return true;
        }
        return false;
      },
    },
  });

  // 이미지 업로드 함수
  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/admin/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success && result.url) {
        return result.url;
      } else {
        throw new Error(result.message || '업로드 실패');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert('이미지 업로드에 실패했습니다.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 이미지 삽입 함수
  const addImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        const url = await handleImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  }, [editor, handleImageUpload]);

  // 링크 추가 함수
  const addLink = useCallback(() => {
    const url = window.prompt('링크 URL을 입력하세요:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // 링크 제거 함수
  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  }, [editor]);

  // 콘텐츠 업데이트 및 에디터 초기화
  useEffect(() => {
    if (editor && isMounted) {
      if (content && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
      // 에디터를 포커스 가능한 상태로 만들기
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    }
  }, [editor, content, isMounted]);

  // 마운트되지 않았거나 에디터가 없으면 로딩 상태 표시
  if (!isMounted || !editor) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
        <div className="text-gray-500 flex items-center">
          <div className="animate-spin mr-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          에디터 로딩 중...
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* 툴바 */}
      <div className="border-b border-gray-300 p-2 flex flex-wrap gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="굵게"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="기울임"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="취소선"
          >
            <s>S</s>
          </button>
        </div>

        <div className="border-l border-gray-300 pl-2 flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="제목 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="제목 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2 py-1 text-sm rounded hover:bg-gray-100 ${
              editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="제목 3"
          >
            H3
          </button>
        </div>

        <div className="border-l border-gray-300 pl-2 flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="불릿 목록"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="번호 목록"
          >
            1.
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('blockquote') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title="인용"
          >
            "
          </button>
        </div>

        <div className="border-l border-gray-300 pl-2 flex gap-1">
          <button
            type="button"
            onClick={addImage}
            disabled={isUploading}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="이미지 삽입"
          >
            {isUploading ? '...' : '🖼️'}
          </button>
          <button
            type="button"
            onClick={editor.isActive('link') ? removeLink : addLink}
            className={`p-2 rounded hover:bg-gray-100 ${
              editor.isActive('link') ? 'bg-blue-100 text-blue-700' : ''
            }`}
            title={editor.isActive('link') ? '링크 제거' : '링크 추가'}
          >
            🔗
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHardBreak().run()}
            className="p-2 rounded hover:bg-gray-100"
            title="줄바꿈 (Enter)"
          >
            ↲
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().splitBlock().run()}
            className="p-2 rounded hover:bg-gray-100"
            title="새 문단 (Shift+Enter)"
          >
            ¶
          </button>
        </div>

        <div className="border-l border-gray-300 pl-2 flex gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="실행 취소"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            title="다시 실행"
          >
            ↷
          </button>
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="p-4 min-h-[300px] prose-editor">
        <EditorContent editor={editor} />
      </div>

      {/* 상태 표시 */}
      {isUploading && (
        <div className="border-t border-gray-300 p-2 text-sm text-blue-600 bg-blue-50">
          이미지를 업로드하고 있습니다...
        </div>
      )}
      
      {/* 에디터 전용 스타일 */}
      <style dangerouslySetInnerHTML={{__html: `
        .prose-editor .ProseMirror {
          white-space: pre-wrap;
          word-wrap: break-word;
          outline: none;
          border: none;
          min-height: 200px;
          padding: 8px;
          cursor: text;
        }
        
        .prose-editor .ProseMirror:focus {
          outline: none;
          border: none;
          box-shadow: none;
        }
        
        .prose-editor .ProseMirror br.hard-break {
          display: block;
          content: "";
          margin-bottom: 0.5rem;
        }
        
        .prose-editor .ProseMirror br {
          display: block;
          content: "";
        }
        
        .prose-editor .ProseMirror p {
          margin-bottom: 0.5rem;
        }
        
        .prose-editor .ProseMirror p:empty {
          min-height: 1.2em;
        }
        
        .prose-editor .ProseMirror p:empty:before {
          content: "";
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        .prose-editor .ProseMirror p + p {
          margin-top: 0.5rem;
        }
        
        /* 커서 스타일 */
        .prose-editor .ProseMirror .ProseMirror-cursor {
          border-left: 1px solid #000;
          border-right: none;
          margin-left: -1px;
          pointer-events: none;
        }
      `}} />
    </div>
  );
}

// 메인 컴포넌트: ClientOnly로 래핑
export default function TiptapEditor(props: TiptapEditorProps) {
  return (
    <ClientOnly 
      fallback={
        <div className="w-full h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-gray-500 flex items-center">
            <div className="animate-spin mr-2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            에디터 초기화 중...
          </div>
        </div>
      }
      children={() => <TiptapEditorInternal {...props} />}
    />
  );
}
