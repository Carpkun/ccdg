import type { Content } from '../lib/types';
import { getEmbedUrl } from '../utils/videoUtils';

interface VideoContentProps {
  content: Content;
}

export default function VideoContent({ content }: VideoContentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* 왼쪽: 비디오 영역 (2/3) */}
      <div className="lg:col-span-2 order-1 lg:order-1">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          {content.video_platform && ['youtube', 'vimeo'].includes(content.video_platform) ? (
            <iframe
              src={getEmbedUrl(content.video_platform || 'youtube', content.video_url || '') || ''}
              className="w-full h-full"
              allowFullScreen
              title={content.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <video
              src={content.video_url || ''}
              controls
              className="w-full h-full"
              title={content.title}
              preload="metadata"
            >
              브라우저가 비디오를 지원하지 않습니다.
            </video>
          )}
        </div>
        
        {/* 비디오 정보 표시 */}
        <div className="text-sm text-gray-600 mt-2">
          {content.video_platform && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full mr-2">
              {content.video_platform === 'youtube' ? '📺 YouTube' : 
               content.video_platform === 'vimeo' ? '🎥 Vimeo' : 
               '📹 비디오'}
            </span>
          )}
          {!getEmbedUrl(content.video_platform || 'youtube', content.video_url || '') && (
            <span className="text-red-500 text-xs">
              * 비디오 URL을 처리할 수 없습니다. 원본 링크: {content.video_url}
            </span>
          )}
        </div>
      </div>
      
      {/* 오른쪽: 영상정보 & 작품소개 (1/3) */}
      <div className="space-y-4 lg:space-y-6 order-2 lg:order-2">
        {/* 상단: 영상정보 */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h4 className="font-semibold text-red-900 text-sm">영상 정보</h4>
            </div>
          </div>
          
          <div className="text-sm">
            {/* 영상 정보 - 2열 그리드로 균형감 있게 배치 */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex items-center">
                <span className="text-red-700 font-medium min-w-[60px]">공연일자:</span>
                <span className="text-red-900 ml-2">
                  {content.performance_date ? 
                    new Date(content.performance_date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : '정보 없음'}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className="text-red-700 font-medium min-w-[60px]">공연장소:</span>
                <span className="text-red-900 ml-2">
                  {content.performance_venue || '정보 없음'}
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