/**
 * 이미지 최적화 관련 유틸리티 함수들
 */

/**
 * 이미지 URL이 유효한지 확인
 */
export function isValidImageUrl(url: string | null): boolean {
  if (!url) return false
  
  // 더미 URL 체크
  if (url.includes('example.com') || url.includes('placeholder') || url.includes('dummy')) {
    return false
  }
  
  // 기본적인 이미지 확장자 체크
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
  const hasImageExtension = imageExtensions.some(ext => 
    url.toLowerCase().includes(ext)
  )
  
  // URL 형태 체크
  const isValidUrl = /^https?:\/\/.+/.test(url)
  
  return isValidUrl && (hasImageExtension || url.includes('image') || url.includes('photo'))
}

/**
 * 비디오 플랫폼에서 썸네일 URL 추출
 */
export function getVideoThumbnailUrl(videoUrl: string | null, platform: string): string | null {
  if (!videoUrl) return null
  
  try {
    if (platform === 'youtube') {
      // YouTube URL에서 비디오 ID 추출
      const videoId = extractYouTubeVideoId(videoUrl)
      if (videoId) {
        // 고화질 썸네일 우선 시도 (maxresdefault -> hqdefault -> mqdefault -> default)
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    } else if (platform === 'vimeo') {
      // Vimeo는 API를 통해서만 썸네일을 가져올 수 있으므로
      // 여기서는 기본 처리만 하고, 실제로는 서버에서 API 호출 필요
      const videoId = extractVimeoVideoId(videoUrl)
      if (videoId) {
        // Vimeo 썸네일은 API 호출이 필요하므로 null 반환
        // 추후 서버사이드에서 처리하거나 프록시 API를 통해 처리
        return null
      }
    }
  } catch (error) {
    console.warn('Failed to extract video thumbnail:', error)
  }
  
  return null
}

/**
 * YouTube URL에서 비디오 ID 추출
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/).*[?&]v=|youtu\.be\/)([^"&?\/\s]{11})/,
    /youtube\.com\/embed\/([^"&?\/\s]{11})/,
    /youtube\.com\/v\/([^"&?\/\s]{11})/,
    /youtube\.com\/watch\?v=([^"&?\/\s]{11})/,
    /youtu\.be\/([^"&?\/\s]{11})/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Vimeo URL에서 비디오 ID 추출
 */
function extractVimeoVideoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      // 마지막 그룹이 비디오 ID
      return match[match.length - 1]
    }
  }
  
  return null
}

/**
 * 반응형 이미지를 위한 sizes 속성 생성
 */
export function generateResponsiveSizes(breakpoints: {
  mobile?: string
  tablet?: string
  desktop?: string
} = {}): string {
  const {
    mobile = '100vw',
    tablet = '50vw',
    desktop = '33vw'
  } = breakpoints
  
  return [
    `(max-width: 768px) ${mobile}`,
    `(max-width: 1024px) ${tablet}`,
    desktop
  ].join(', ')
}

/**
 * 이미지 에러 처리를 위한 fallback URL 생성
 */
export function getFallbackImageUrl(
  category: 'essay' | 'poetry' | 'photo' | 'calligraphy' | 'video',
  width: number = 400,
  height: number = 300
): string {
  const categoryColors = {
    essay: '#3B82F6',
    poetry: '#8B5CF6',
    photo: '#10B981',
    calligraphy: '#F59E0B',
    video: '#EF4444'
  }
  
  const categoryIcons = {
    essay: '📝',
    poetry: '📜',
    photo: '📸',
    calligraphy: '🖼️',
    video: '🎬'
  }
  
  const color = categoryColors[category]
  const icon = categoryIcons[category]
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color}20;stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}10;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
            font-size="${Math.min(width, height) / 4}" fill="${color}">
        ${icon}
      </text>
    </svg>
  `
  
  // Node.js 환경에서 Buffer 사용
  if (typeof Buffer !== 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }
  
  // 브라우저 환경에서 UTF-8 안전한 인코딩 사용
  try {
    // UTF-8 문자열을 바이트 배열로 변환 후 base64 인코딩
    const encoder = new TextEncoder()
    const bytes = encoder.encode(svg)
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return `data:image/svg+xml;base64,${btoa(binaryString)}`
  } catch (error) {
    // fallback: URL 인코딩 사용
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}

/**
 * 이미지 프리로딩
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}