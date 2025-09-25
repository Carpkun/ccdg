import { useState, useEffect, useRef } from 'react'

interface LazyContentRendererProps {
  content: string
  chunkSize?: number
  className?: string
}

export default function LazyContentRenderer({ 
  content, 
  chunkSize = 1000,
  className = '' 
}: LazyContentRendererProps) {
  const [visibleChunks, setVisibleChunks] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 콘텐츠를 청크로 분할
  const chunks = content.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [content]
  const shouldShowLoadMore = chunks.length > 1 && !isExpanded

  // 스크롤 기반 자동 로딩
  useEffect(() => {
    if (isExpanded) return

    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && visibleChunks < chunks.length) {
          setVisibleChunks(prev => Math.min(prev + 1, chunks.length))
        }
      },
      { rootMargin: '200px' }
    )

    const lastElement = container.lastElementChild
    if (lastElement) {
      observer.observe(lastElement)
    }

    return () => observer.disconnect()
  }, [visibleChunks, chunks.length, isExpanded])

  const handleExpandAll = () => {
    setIsExpanded(true)
    setVisibleChunks(chunks.length)
  }

  return (
    <div ref={containerRef} className={className}>
      {chunks.slice(0, visibleChunks).map((chunk, index) => (
        <div 
          key={index}
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: chunk }}
        />
      ))}
      
      {shouldShowLoadMore && (
        <div className="text-center mt-6">
          <button
            onClick={handleExpandAll}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            전체 내용 보기 ({chunks.length - visibleChunks}개 구간 더 보기)
          </button>
        </div>
      )}
    </div>
  )
}