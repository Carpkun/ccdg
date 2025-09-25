import { memo, useMemo } from 'react';
import { Link } from 'react-router';
import type { Content } from '../lib/types';
import { getVideoThumbnailUrl } from '../utils/imageOptimization';

interface CategoryContentCardProps {
  content: Content;
  category: {
    name: string;
    icon: string;
    color: string;
    description: string;
  };
}

const CategoryContentCard = memo(({ content, category }: CategoryContentCardProps) => {
  // 카테고리별 이미지 URL 결정 (메모이제이션)
  const imageUrl = useMemo(() => {
    if (content.category === 'photo' || content.category === 'calligraphy') {
      return content.image_url || content.thumbnail_url;
    }
    if (content.category === 'video') {
      // 비디오의 경우 동적 썸네일 생성 시도
      if (content.video_url && content.video_platform) {
        const dynamicThumbnail = getVideoThumbnailUrl(content.video_url, content.video_platform);
        if (dynamicThumbnail) {
          return dynamicThumbnail;
        }
      }
      // 동적 썸네일이 실패하면 기존 썸네일 필드들 시도
      return content.thumbnail_url;
    }
    return content.thumbnail_url;
  }, [content.category, content.image_url, content.thumbnail_url, content.video_url, content.video_platform]);

  // 콘텐츠 미리보기 텍스트 (메모이제이션)
  const previewText = useMemo(() => {
    const cleanText = content.content.replace(/<[^>]*>/g, '');
    return cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText;
  }, [content.content]);

  // 포맷된 날짜 (메모이제이션)
  const formattedDate = useMemo(() => {
    return new Date(content.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, [content.created_at]);

  return (
    <Link
      to={`/content/${content.id}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden group border border-gray-200"
      style={{
        '--category-color': category.color
      } as React.CSSProperties & {'--category-color': string}}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = category.color;
        (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
        (e.currentTarget as HTMLElement).style.borderWidth = '2px';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
        (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
        (e.currentTarget as HTMLElement).style.borderWidth = '1px';
      }}
    >
      {/* 이미지 영역 */}
      {imageUrl ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* 카테고리 배지 */}
          <div className="absolute top-3 left-3">
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-black bg-opacity-70 text-white backdrop-blur-sm">
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-colors">
          <div className="text-center">
            <span className="text-4xl text-gray-400 mb-2 block">{category.icon}</span>
            <span className="text-sm text-gray-500">{category.name}</span>
          </div>
          {/* 카테고리 배지 */}
          <div className="absolute top-3 left-3">
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-black bg-opacity-70 text-white backdrop-blur-sm">
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </div>
          </div>
        </div>
      )}
      
      {/* 콘텐츠 정보 */}
      <div className="p-6">
        <h3 
          className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {content.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3">
          작가: <span className="font-medium">{content.author_name}</span>
        </p>
        <p 
          className="text-gray-700 text-sm leading-relaxed"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {previewText}
        </p>
        
        <div className="flex justify-between items-center text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
          <span>{formattedDate}</span>
          <div className="flex space-x-3">
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {content.view_count}
            </span>
            <span className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {content.likes_count}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});

CategoryContentCard.displayName = 'CategoryContentCard';

export default CategoryContentCard;