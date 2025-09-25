import { useRef, useEffect, useState, type ReactNode } from 'react'

interface ContentSliderProps {
  children: ReactNode
  className?: string
}

export default function ContentSlider({ children, className = '' }: ContentSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  // 스크롤 상태 업데이트
  const updateScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    )
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollState()
    
    const handleScroll = () => {
      updateScrollState()
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [children])

  // 드래그 스크롤 구현
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let isDown = false
    let startX: number
    let scrollLeftStart: number

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true
      setIsScrolling(true)
      container.style.cursor = 'grabbing'
      startX = e.pageX - container.offsetLeft
      scrollLeftStart = container.scrollLeft
      container.style.userSelect = 'none'
    }

    const handleMouseLeave = () => {
      isDown = false
      setIsScrolling(false)
      container.style.cursor = 'grab'
      container.style.userSelect = 'auto'
    }

    const handleMouseUp = () => {
      isDown = false
      setIsScrolling(false)
      container.style.cursor = 'grab'
      container.style.userSelect = 'auto'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX) * 2 // 드래그 감도 조절
      container.scrollLeft = scrollLeftStart - walk
    }

    // 터치 이벤트 (모바일 지원)
    const handleTouchStart = (e: TouchEvent) => {
      isDown = true
      setIsScrolling(true)
      startX = e.touches[0].pageX - container.offsetLeft
      scrollLeftStart = container.scrollLeft
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDown) return
      const x = e.touches[0].pageX - container.offsetLeft
      const walk = (x - startX) * 2
      container.scrollLeft = scrollLeftStart - walk
    }

    const handleTouchEnd = () => {
      isDown = false
      setIsScrolling(false)
    }

    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseleave', handleMouseLeave)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchstart', handleTouchStart)
    container.addEventListener('touchmove', handleTouchMove)
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mouseleave', handleMouseLeave)
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = container.clientWidth * 0.8 // 화면 너비의 80%만큼 스크롤
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  return (
    <div className={`relative group ${className}`}>
      {/* 왼쪽 스크롤 버튼 */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="이전 콘텐츠 보기"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* 오른쪽 스크롤 버튼 */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          aria-label="다음 콘텐츠 보기"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* 스크롤 컨테이너 */}
      <div
        ref={scrollContainerRef}
        className={`
          flex gap-6 overflow-x-auto scrollbar-hide cursor-grab
          ${isScrolling ? 'cursor-grabbing' : ''}
        `}
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {children}
      </div>
    </div>
  )
}