import { useState, useRef, useEffect } from 'react'
import { getFallbackImageUrl } from '../utils/imageOptimization'

interface OptimizedImageProps {
  src?: string | null
  alt: string
  category: 'essay' | 'poetry' | 'photo' | 'calligraphy' | 'video'
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
}

export default function OptimizedImage({ 
  src, 
  alt, 
  category,
  className = '',
  width = 400,
  height = 300,
  loading = 'lazy'
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)

  // Intersection Observer를 사용한 lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    const placeholder = placeholderRef.current
    if (placeholder) {
      observer.observe(placeholder)
    }

    return () => observer.disconnect()
  }, [loading])

  const handleImageLoad = () => {
    setIsLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
    setIsLoaded(true)
  }

  const shouldShowImage = src && !imageError && isInView
  const fallbackImage = getFallbackImageUrl(category, width, height)

  return (
    <div 
      ref={placeholderRef}
      className={`relative overflow-hidden bg-gray-100 ${className}`}
      style={{ width, height }}
    >
      {/* 로딩 플레이스홀더 */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="text-gray-400 text-2xl">
            {category === 'essay' && '📝'}
            {category === 'poetry' && '📜'}
            {category === 'photo' && '📸'}
            {category === 'calligraphy' && '🖼️'}
            {category === 'video' && '🎬'}
          </div>
        </div>
      )}

      {/* 실제 이미지 */}
      {shouldShowImage && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={loading}
        />
      )}

      {/* Fallback 이미지 */}
      {(imageError || (!src && isInView)) && (
        <img
          src={fallbackImage}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  )
}