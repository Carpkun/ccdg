import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import type { Content } from '../lib/types'
import { isVideoContent, isPhotoContent, isCalligraphyContent } from '../lib/types'
import { getVideoThumbnailUrl, isValidImageUrl } from '../utils/imageOptimization'
import { generatePreviewText } from '../utils/htmlUtils'

interface CategoryContentSliderProps {
  contents: Content[]
  categoryName: string
  categorySlug: string
  categoryIcon: string
  categoryColor: string
  categoryDescription: string
}

export default function CategoryContentSlider({ 
  contents, 
  categoryName, 
  categorySlug, 
  categoryIcon,
  categoryColor,
  categoryDescription
}: CategoryContentSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [dragDistance, setDragDistance] = useState(0)
  const [startY, setStartY] = useState(0)
  
  // 마우스 드래그 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
    setScrollLeft(sliderRef.current.scrollLeft)
    setDragDistance(0)
    sliderRef.current.style.cursor = 'grabbing'
    sliderRef.current.style.userSelect = 'none'
    // 스크롤 스냅 비활성화 (드래그 중에는)
    sliderRef.current.style.scrollSnapType = 'none'
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (!sliderRef.current || !isDragging) return
    setIsDragging(false)
    sliderRef.current.style.cursor = 'grab'
    sliderRef.current.style.userSelect = ''
    // 스크롤 스냅 다시 활성화
    sliderRef.current.style.scrollSnapType = 'x mandatory'
  }
  
  // 터치 이벤트 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sliderRef.current) return
    const touch = e.touches[0]
    setIsDragging(true)
    setStartX(touch.clientX)
    setStartY(touch.clientY)
    setScrollLeft(sliderRef.current.scrollLeft)
    setDragDistance(0)
    sliderRef.current.style.scrollSnapType = 'none'
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return
    const touch = e.touches[0]
    const deltaX = startX - touch.clientX
    const deltaY = startY - touch.clientY
    
    // 수평 스크롤이 수직 스크롤보다 클 때만 예방
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      setDragDistance(Math.abs(deltaX))
      
      requestAnimationFrame(() => {
        if (sliderRef.current) {
          sliderRef.current.scrollLeft = scrollLeft + deltaX
        }
      })
    }
  }
  
  const handleTouchEnd = () => {
    if (!sliderRef.current) return
    setIsDragging(false)
    sliderRef.current.style.scrollSnapType = 'x mandatory'
  }
  
  // 링크 클릭 처리 (드래그가 아니었을 때만 클릭 허용)
  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (dragDistance > 5) { // 5px 이상 드래그하면 링크 클릭 방지
      e.preventDefault()
    }
  }
  
  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return
      e.preventDefault()
      const currentX = e.clientX
      const distance = startX - currentX
      setDragDistance(Math.abs(distance))
      
      // 더 부드러운 스크롤링을 위해 requestAnimationFrame 사용
      requestAnimationFrame(() => {
        if (sliderRef.current) {
          sliderRef.current.scrollLeft = scrollLeft + distance
        }
      })
    }

    const handleGlobalMouseUp = () => {
      if (!sliderRef.current) return
      setIsDragging(false)
      sliderRef.current.style.cursor = 'grab'
      sliderRef.current.style.userSelect = ''
      // 스크롤 스냅 다시 활성화
      sliderRef.current.style.scrollSnapType = 'x mandatory'
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startX, scrollLeft])
  
  // 키보드 내비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sliderRef.current) return
      
      if (e.key === 'ArrowLeft') {
        sliderRef.current.scrollBy({ left: -300, behavior: 'smooth' })
      } else if (e.key === 'ArrowRight') {
        sliderRef.current.scrollBy({ left: 300, behavior: 'smooth' })
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 콘텐츠가 없는 경우
  if (contents.length === 0) {
    return (
      <section className="py-12 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
            {/* 좌측 카테고리 정보 */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl" style={{ color: categoryColor }}>{categoryIcon}</span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {categoryName}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                {categoryDescription}
              </p>
              <Link 
                to={`/category/${categorySlug}`}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
              >
                더보기 →
              </Link>
            </div>
            
            {/* 우측 빈 콘텐츠 영역 */}
            <div className="lg:col-span-6">
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <span className="text-4xl mb-4 block opacity-50" style={{ color: categoryColor }}>{categoryIcon}</span>
                  <p className="text-lg">아직 {categoryName} 콘텐츠가 없습니다.</p>
                  <p className="text-sm mt-2 opacity-75">첫 번째 {categoryName} 작품을 올려보세요!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6">
          {/* 좌측 카테고리 정보 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl" style={{ color: categoryColor }}>{categoryIcon}</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {categoryName}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {categoryDescription}
            </p>
            <Link 
              to={`/category/${categorySlug}`}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              더보기 →
            </Link>
          </div>
          
          {/* 우측 콘텐츠 슬라이더 */}
          <div className="lg:col-span-6 slider-container">
            <style dangerouslySetInnerHTML={{__html: `
              .slider-container :global(.scrollbar-hide) {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
              .slider-container :global(.scrollbar-hide::-webkit-scrollbar) {
                display: none;
              }
              .slider-container :global(.cursor-grab) {
                cursor: grab;
              }
              .slider-container :global(.cursor-grab:active) {
                cursor: grabbing;
              }
            `}} />
            <div 
              ref={sliderRef}
              className="flex gap-5 overflow-x-auto scrollbar-hide cursor-grab pb-4"
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                width: '100%',
                maxHeight: '450px',
                scrollBehavior: isDragging ? 'auto' : 'smooth',
                touchAction: 'pan-x pinch-zoom'
              }}
            >
              {contents.map((content) => (
                <div 
                  key={content.id} 
                  className="w-[240px] sm:w-[260px] flex-shrink-0"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <Link 
                    to={`/content/${content.id}`} 
                    className="block group h-full" 
                    onClick={(e) => handleLinkClick(e, `/content/${content.id}`)}
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-[400px] flex flex-col">
                      {/* 이미지 영역 - 고정 높이 */}
                      <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden flex-shrink-0">
                        {(() => {
                          // 사진, 서화 콘텐츠의 이미지 URL
                          let imageUrl = null
                          if (isPhotoContent(content) || isCalligraphyContent(content)) {
                            imageUrl = content.image_url
                          }
                          // 비디오 콘텐츠의 썸네일 URL 추출
                          else if (isVideoContent(content) && content.video_url && content.video_platform) {
                            imageUrl = getVideoThumbnailUrl(content.video_url, content.video_platform)
                          }
                          
                          return imageUrl && isValidImageUrl(imageUrl) ? (
                            <img 
                              src={imageUrl} 
                              alt={content.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              draggable={false}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-4xl opacity-50" style={{ color: categoryColor }}>{categoryIcon}</span>
                            </div>
                          )
                        })()}
                      </div>
                      
                      {/* 콘텐츠 정보 - 유연한 높이 */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-white px-2 py-1 rounded font-medium"
                                style={{ backgroundColor: categoryColor }}>
                            {categoryName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(content.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2 text-sm leading-tight">
                          {content.title}
                        </h3>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 mb-3 flex-1">
                          {generatePreviewText(content.content, 100)}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto">
                          <span className="truncate mr-2">{content.author_name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span>조회 {content.view_count}</span>
                            <span>♥ {content.likes_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}