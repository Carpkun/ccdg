import { useState, lazy, Suspense } from 'react'

// TTS 플레이어를 동적으로 임포트
const TTSPlayer = lazy(() => import('./TTSPlayer'))

interface LazyTTSPlayerProps {
  text: string
  contentId: string
  className?: string
}

export default function LazyTTSPlayer({ text, contentId, className = '' }: LazyTTSPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  const handleLoadTTS = () => {
    setIsLoaded(true)
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={handleLoadTTS}
          className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
          title="음성으로 듣기"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
        <span className="text-sm text-gray-500">음성으로 듣기</span>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
      </div>
    }>
      <TTSPlayer text={text} contentId={contentId} className={className} />
    </Suspense>
  )
}