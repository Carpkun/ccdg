import { useState } from 'react';
import type { Content } from '../lib/types';

interface CalligraphyContentProps {
  content: Content;
}

export default function CalligraphyContent({ content }: CalligraphyContentProps) {
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = content.image_url || content.thumbnail_url;
  
  const handleImageClick = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 왼쪽: 작품 이미지 영역 (2/3) */}
      <div className="lg:col-span-2 order-1 lg:order-1">
        {imageUrl && !imageError ? (
          <div className="w-full">
            <img
              src={imageUrl}
              alt={`${content.title} - ${content.author_name} 서화 작품`}
              className="w-full h-auto max-h-[600px] object-contain rounded-lg shadow-lg cursor-pointer transition-opacity hover:opacity-90 bg-white"
              onError={() => {
                setImageError(true);
              }}
              onClick={handleImageClick}
            />
            
            {/* 클릭 힌트 */}
            <div className="text-center mt-2">
              <p className="text-sm text-gray-500">이미지를 클릭하면 확대됩니다</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-orange-50 to-red-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">서화 작품</h3>
              <p className="text-sm text-gray-500">
                {imageError ? '이미지를 불러올 수 없습니다' : '이미지 준비 중...'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* 오른쪽: 작품정보 & 작품소개 (1/3) */}
      <div className="space-y-4 lg:space-y-6 order-2 lg:order-2">
        {/* 상단: 작품정보 */}
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              <h4 className="font-semibold text-orange-900 text-sm">작품 정보</h4>
            </div>
          </div>
          
          <div className="text-sm">
            {/* 작품 정보 - 2열 그리드로 균형감 있게 배치 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center">
                <span className="text-orange-700 font-medium min-w-[40px]">크기:</span>
                <span className="text-orange-900 ml-2">
                  {content.artwork_size || '정보 없음'}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="text-orange-700 font-medium min-w-[40px]">재료:</span>
                <span className="text-orange-900 ml-2">
                  {content.artwork_material || '정보 없음'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 하단: 작품소개 */}
        {content.content && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center text-sm">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              작품 소개
            </h3>
            <div className="text-sm text-gray-700 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: content.content }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}