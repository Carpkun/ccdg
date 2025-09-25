import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cleanTextForTTS } from '../utils/htmlUtils'

interface TTSPlayerProps {
  text: string
  contentId: string // 콘텐츠 ID
  className?: string
}

export default function TTSPlayer({ text, contentId, className = '' }: TTSPlayerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ttsStatus, setTtsStatus] = useState<'pending' | 'cached' | 'generating' | 'completed' | 'failed'>('pending')
  const [estimatedTime, setEstimatedTime] = useState(0) // 예상 재생 시간 상태
  
  const audioRef = useRef<HTMLAudioElement>(null)
  
  // 예상 재생 시간 계산 (메모이제이션)
  const estimatedDuration = useMemo(() => {
    const cleanText = cleanTextForTTS(text)
    return Math.ceil(cleanText.length / 10) // 10글자당 1초 예상
  }, [text])
  
  // 캐시된 TTS 파일 조회 (메모이제이션)
  const checkCachedTTS = useCallback(async () => {
    try {
      const response = await fetch(`/api/tts/cached?contentId=${contentId}`, {
        method: 'GET',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'TTS 캐시 조회에 실패했습니다.')
      }
      
      // 레거시 파일 경로라면 새로 생성 필요
      if (data.status === 'cached' && data.url && isLegacyFileUrl(data.url)) {
        console.log('Legacy TTS file detected, regenerating...', data.url)
        return { status: 'pending' } // 새로 생성하도록 처리
      }
      
      return data
    } catch (error) {
      return { status: 'pending' }
    }
  }, [contentId, isLegacyFileUrl])
  
  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    setEstimatedTime(estimatedDuration)
    
    // TTS 캐시 상태 확인
    checkCachedTTS().then(cacheResult => {
      if (cacheResult.status === 'cached' && cacheResult.url) {
        setAudioUrl(cacheResult.url)
        setDuration(cacheResult.duration || estimatedDuration)
        setTtsStatus('cached')
        
        // 오디오 요소에 소스 설정
        if (audioRef.current) {
          audioRef.current.src = cacheResult.url
          audioRef.current.load()
        }
      } else {
        // 캐시가 없더라도 예상 시간으로 재생바 표시
        setDuration(estimatedDuration)
        setTtsStatus('pending')
      }
    }).catch(() => {
      setDuration(estimatedDuration)
      setTtsStatus('pending')
    })
  }, [text, contentId, estimatedDuration, checkCachedTTS])
  
  // URL이 레거시 파일 경로 형식인지 확인 (메모이제이션)
  const isLegacyFileUrl = useCallback((url: string): boolean => {
    return url.startsWith('/tts/') && url.endsWith('.mp3')
  }, [])
  
  
  // TTS 파일 생성 요청
  const generateTTS = async (shouldAutoPlay = false) => {
    try {
      setTtsStatus('generating')
      
      const response = await fetch('/api/tts/cached', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          contentId, 
          text 
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'TTS 생성에 실패했습니다.')
      }
      
      setAudioUrl(data.url)
      setDuration(data.duration) // 실제 TTS 재생 시간으로 업데이트
      setTtsStatus('completed')
      
      // 오디오 로드 및 자동 재생
      if (audioRef.current) {
        audioRef.current.src = data.url
        audioRef.current.load()
        
        // 오디오 로드 완료 후 처리
        const handleLoadComplete = async () => {
          if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration)
          }
          
          // 자동 재생이 요청된 경우
          if (shouldAutoPlay && audioRef.current) {
            try {
              await audioRef.current.play()
            } catch (playError) {
              setError('오디오 재생에 실패했습니다.')
            }
          }
        }
        
        audioRef.current.addEventListener('loadedmetadata', handleLoadComplete, { once: true })
      }
      
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'TTS 생성 중 오류가 발생했습니다.')
      setTtsStatus('failed')
    }
  }
  
  // TTS 초기화 및 캐시 확인
  const initializeTTS = async (shouldAutoPlay = false) => {
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const cacheResult = await checkCachedTTS()
      
      if (cacheResult.status === 'cached' && cacheResult.url) {
        // 캐시된 파일이 있으면 즉시 로드
        setAudioUrl(cacheResult.url)
        setDuration(cacheResult.duration) // 실제 재생 시간 사용
        setTtsStatus('cached')
        
        // 캐시된 파일의 경우 자동 재생
        if (shouldAutoPlay && audioRef.current) {
          // 오디오가 로드되면 재생
          const tryAutoPlay = async () => {
            if (audioRef.current) {
              try {
                await audioRef.current.play()
              } catch (playError) {
                setError('오디오 재생에 실패했습니다.')
              }
            }
          }
          
          // 오디오가 로드된 경우 즉시 재생, 아니면 로드 완료 후 재생
          if (audioRef.current.readyState >= 3) { // HAVE_FUTURE_DATA 이상
            await tryAutoPlay()
          } else {
            audioRef.current.addEventListener('canplay', tryAutoPlay, { once: true })
          }
        }
        
      } else {
        // 캐시가 없으면 새로 생성 (자동 재생 옵션 전달)
        await generateTTS(shouldAutoPlay)
      }
    } catch (error) {
      setError('음성 파일을 로드할 수 없습니다.')
      setTtsStatus('failed')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 재생/일시정지 토글
  const togglePlayPause = async () => {
    if (!audioRef.current) return
    
    if (!audioUrl) {
      // TTS가 없는 경우 생성 후 자동 재생
      await initializeTTS(true)
      return
    }
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      try {
        // 오디오가 제대로 로드되었는지 확인
        if (audioRef.current.src !== audioUrl) {
          audioRef.current.src = audioUrl
          audioRef.current.load()
          // 로드 완료를 기다린 후 재생
          await new Promise((resolve) => {
            const handleCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay)
              resolve(undefined)
            }
            audioRef.current?.addEventListener('canplay', handleCanPlay)
          })
        }
        
        await audioRef.current.play()
      } catch (error) {
        setError('오디오 재생에 실패했습니다.')
      }
    }
  }
  
  // 시간 포매팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // 진행률 변경
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current && duration > 0) {
      const newTime = (parseFloat(e.target.value) / 100) * duration
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }
  
  // 오디오 이벤트 핸들러
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      // duration은 이미 위에서 설정되었으므로 중복 설정 방지
      if (audio.duration && !duration) {
        setDuration(audio.duration)
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])
  
  return (
    <div className={`flex items-center space-x-2 ${className} relative`}>
      <audio ref={audioRef} preload="metadata" />
      
      {error && (
        <div className="absolute top-10 right-0 w-64 p-2 bg-red-50 border border-red-200 rounded text-center shadow-lg z-20">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      
      {/* 재생 버튼 */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full transition-colors flex-shrink-0"
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      
      {/* 진행률 바 및 시간 - 항상 표시 */}
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={duration > 0 ? (currentTime / duration) * 100 : 0}
          onChange={handleProgressChange}
          disabled={!audioUrl} // 오디오가 없으면 비활성화
          className={`flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${!audioUrl ? 'opacity-50' : ''}`}
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatTime(duration || estimatedDuration)}
        </span>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
        }
        `
      }} />
    </div>
  )
}