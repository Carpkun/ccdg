import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { Content } from '../lib/types'
import { 
  isPoetryContent, 
  isPhotoContent, 
  isCalligraphyContent, 
  isVideoContent,
  CATEGORIES 
} from '../lib/types'
import {
  isValidImageUrl,
  getFallbackImageUrl,
  generateResponsiveSizes,
  getVideoThumbnailUrl
} from '../utils/imageOptimization'
import { generatePreviewText, stripHtmlAndDecodeEntities } from '../utils/htmlUtils'
import { getRelativeTimeString } from '../utils/dateUtils'

interface ContentCardProps {
  content: Content
  showCategory?: boolean
  enableHoverBorder?: boolean
  enableHoverBackground?: boolean
}

function ContentCard({ content, showCategory = true, enableHoverBorder = true, enableHoverBackground = false }: ContentCardProps) {
  const categoryInfo = CATEGORIES[content.category]
  const [isHovered, setIsHovered] = useState(false)
  
  // 내용 미리보기 생성 (카테고리별로 다르게)
  const previewText = useMemo(() => {
    if (isPoetryContent(content) && content.translation) {
      // 한시의 경우 번역문을 사용하되 HTML 태그와 엔터티 제거
      const cleanTranslation = stripHtmlAndDecodeEntities(content.translation)
      return cleanTranslation.split('\n')[0] + (cleanTranslation.split('\n').length > 1 ? '...' : '')
    }
    
    // 일반 콘텐츠의 경우 HTML 태그를 제거하고 미리보기 생성
    return generatePreviewText(content.content, 150)
  }, [content])

  // 특화 정보 렌더링
  const renderSpecialInfo = () => {
    if (isPoetryContent(content)) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span className="inline-flex items-center">
            📜 원문/번역 완비
          </span>
        </div>
      )
    }

    if (isPhotoContent(content) && content.image_exif) {
      try {
        const exif = typeof content.image_exif === 'string' 
          ? JSON.parse(content.image_exif) 
          : content.image_exif
        return (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span className="inline-flex items-center">
              📸 {exif.camera || '카메라 정보'} | {exif.iso ? `ISO ${exif.iso}` : 'EXIF 포함'}
            </span>
          </div>
        )
      } catch {
        return (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            📸 EXIF 정보 포함
          </div>
        )
      }
    }

    if (isCalligraphyContent(content)) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span className="inline-flex items-center">
            🖼️ 고화질 이미지
          </span>
        </div>
      )
    }

    if (isVideoContent(content)) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span className="inline-flex items-center">
            🎬 {content.video_platform === 'youtube' ? 'YouTube' : content.video_platform} 영상
          </span>
        </div>
      )
    }

    return null
  }

  // 썸네일 이미지 결정 및 최적화
  const getThumbnailInfo = () => {
    let imageUrl = null
    
    // 사진, 서화 콘텐츠의 이미지 URL
    if (isPhotoContent(content) || isCalligraphyContent(content)) {
      imageUrl = content.image_url
    }
    // 비디오 콘텐츠의 썸네일 URL 추출
    else if (isVideoContent(content) && content.video_url && content.video_platform) {
      imageUrl = getVideoThumbnailUrl(content.video_url, content.video_platform)
    }
    
    const isValid = isValidImageUrl(imageUrl)
    const fallbackUrl = getFallbackImageUrl(content.category, 400, 300)
    
    return {
      hasImage: isValid,
      imageUrl: isValid ? imageUrl : fallbackUrl,
      isOptimized: isValid
    }
  }

  const thumbnailInfo = getThumbnailInfo()

  return (
    <Link to={`/content/${content.id}`}>
      <article 
        className="group cursor-pointer h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out hover:scale-[1.02] hover:-translate-y-1 overflow-hidden"
        style={{
          '--category-color': categoryInfo.color
        } as React.CSSProperties & {'--category-color': string}}
        onMouseEnter={(e) => {
          setIsHovered(true);
          if (enableHoverBorder) {
            (e.currentTarget as HTMLElement).style.borderColor = categoryInfo.color;
            (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
            (e.currentTarget as HTMLElement).style.borderWidth = '2px';
          }
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          if (enableHoverBorder) {
            (e.currentTarget as HTMLElement).style.borderColor = '';
            (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
            (e.currentTarget as HTMLElement).style.borderWidth = '1px';
          }
        }}
      >
        {/* 썸네일 또는 카테고리 아이콘 영역 */}
        <div className="relative h-64 overflow-hidden">
          {thumbnailInfo.hasImage && thumbnailInfo.isOptimized ? (
            <div className="relative w-full h-full">
              <img
                src={thumbnailInfo.imageUrl || ''}
                alt={`${content.title} - ${content.author_name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                sizes={generateResponsiveSizes({
                  mobile: '100vw',
                  tablet: '50vw',
                  desktop: '25vw'
                })}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={thumbnailInfo.imageUrl || ''}
                alt={`${content.title} - 기본 이미지`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 group-hover:bg-opacity-10 transition-all" style={{ backgroundColor: `${categoryInfo.color}20` }}>
                <span className="text-5xl opacity-70">{categoryInfo.icon}</span>
              </div>
            </div>
          )}
          
          {/* 카테고리 배지 */}
          {showCategory && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm text-white" style={{ backgroundColor: categoryInfo.color }} aria-label={categoryInfo.name} title={categoryInfo.name}>
                <span className="text-base leading-none">{categoryInfo.icon}</span>
              </span>
            </div>
          )}
        </div>
        
        {/* 콘텐츠 정보 */}
        <div 
          className="p-4 transition-all duration-300"
          style={{
            backgroundColor: enableHoverBackground && isHovered ? `${categoryInfo.color}4D` : 'transparent'
          }}
        >
          {/* 카테고리와 날짜 */}
          {showCategory ? (
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span className="flex items-center">
                <span className="mr-1" style={{ color: categoryInfo.color }}>{categoryInfo.icon}</span>
                {categoryInfo.name}
              </span>
              <time dateTime={content.created_at}>
                {getRelativeTimeString(content.created_at)}
              </time>
            </div>
          ) : (
            <div className="flex justify-end mb-2">
              <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={content.created_at}>
                {getRelativeTimeString(content.created_at)}
              </time>
            </div>
          )}

          {/* 제목 */}
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors line-clamp-1">
            {content.title}
          </h3>

          {/* 내용 미리보기 */}
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-4 h-24">
            {previewText}
          </p>

          {/* 특화 정보 */}
          {renderSpecialInfo()}

          {/* 하단 메타 정보 */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-4">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {content.author_name || '익명'}
            </span>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                👀 <span className="ml-1 font-medium">{content.view_count || 0}</span>
              </span>
              <span className="flex items-center">
                ❤️ <span className="ml-1 font-medium">{content.likes_count || 0}</span>
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default memo(ContentCard)