/**
 * HTML 텍스트 처리 관련 유틸리티 함수들
 */

/**
 * HTML 태그를 제거하고 엔티티를 디코딩
 */
export function stripHtmlAndDecodeEntities(html: string): string {
  if (!html) return ''
  
  // HTML 태그 제거
  let text = html.replace(/<[^>]*>/g, '')
  
  // HTML 엔티티 디코딩 (브라우저 환경)
  if (typeof document !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(`<!doctype html><body>${text}`, 'text/html')
    text = doc.body.textContent || ''
  } else {
    // 서버 환경에서 기본적인 엔티티 디코딩
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™'
    }
    
    text = text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entityMap[entity] || entity
    })
  }
  
  // 연속된 공백을 하나로 합치고, 앞뒤 공백 제거
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 콘텐츠 미리보기 텍스트 생성
 */
export function generatePreviewText(content: string, maxLength: number = 150): string {
  if (!content) return ''
  
  // HTML 태그 제거 및 엔티티 디코딩
  const cleanText = stripHtmlAndDecodeEntities(content)
  
  // 줄바꿈을 공백으로 변환
  const singleLine = cleanText.replace(/\n+/g, ' ')
  
  // 길이 제한
  if (singleLine.length <= maxLength) {
    return singleLine
  }
  
  // 단어 단위로 자르기 (한국어 고려)
  const truncated = singleLine.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }
  
  return truncated + '...'
}

/**
 * 문단별로 텍스트를 분할
 */
export function splitIntoParagraphs(content: string): string[] {
  if (!content) return []
  
  // HTML 태그 제거
  const cleanText = stripHtmlAndDecodeEntities(content)
  
  // 문단 분할 (연속된 줄바꿈을 기준으로)
  return cleanText
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
}

/**
 * 텍스트에서 첫 번째 문장 추출
 */
export function getFirstSentence(content: string): string {
  if (!content) return ''
  
  const cleanText = stripHtmlAndDecodeEntities(content)
  
  // 한국어 문장 끝을 나타내는 구두점
  const sentenceEnders = /[.!?。！？]/
  const match = cleanText.match(sentenceEnders)
  
  if (match && match.index !== undefined) {
    return cleanText.substring(0, match.index + 1).trim()
  }
  
  // 문장 끝이 없으면 첫 번째 줄바꿈까지
  const firstLine = cleanText.split('\n')[0]
  return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
}

/**
 * 키워드를 하이라이트하는 HTML 생성
 */
export function highlightKeywords(text: string, keywords: string[]): string {
  if (!text || !keywords.length) return text
  
  let highlightedText = text
  
  keywords.forEach(keyword => {
    if (keyword.trim()) {
      const regex = new RegExp(`(${escapeRegExp(keyword.trim())})`, 'gi')
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      )
    }
  })
  
  return highlightedText
}

/**
 * 정규식에 사용될 특수 문자 이스케이프
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 읽기 시간 계산 (한국어 기준)
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 0
  
  const cleanText = stripHtmlAndDecodeEntities(content)
  
  // 한국어는 평균 350-400자/분 정도
  // 영어는 평균 200-250단어/분 정도
  const koreanCharsPerMinute = 375
  const englishWordsPerMinute = 225
  
  // 한국어 문자 수 (한글, 한자)
  const koreanChars = (cleanText.match(/[\u3131-\u3163\uac00-\ud7a3\u4e00-\u9fff]/g) || []).length
  
  // 영어 단어 수 (공백으로 구분된 영문 단어)
  const englishWords = (cleanText.match(/\b[a-zA-Z]+\b/g) || []).length
  
  const koreanReadingTime = koreanChars / koreanCharsPerMinute
  const englishReadingTime = englishWords / englishWordsPerMinute
  
  const totalTime = koreanReadingTime + englishReadingTime
  
  return Math.max(1, Math.round(totalTime))
}

/**
 * 줄바꿈을 <br> 태그로 변환
 */
export function nl2br(text: string): string {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

/**
 * URL을 링크로 변환
 */
export function urlToLink(text: string): string {
  if (!text) return ''
  
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
}

/**
 * TTS에 적합하도록 HTML 태그와 엔터티를 제거하고 깔끔한 텍스트만 남깁니다.
 * TTS 음성 합성에 방해가 될 수 있는 특수 문자와 중복 공백을 정리합니다.
 * @param html HTML 문자열
 * @returns TTS에 적합한 깔끔한 텍스트
 */
export function cleanTextForTTS(html: string): string {
  if (!html) return ''
  
  // 먼저 모든 HTML 태그와 엔터티 제거
  let text = stripHtmlAndDecodeEntities(html)
  
  // TTS에 방해될 수 있는 특수 문자 처리
  text = text
    // 여러 개의 구두점 연속 사용 정리 (예: '!!!' -> '!')
    .replace(/([!?.])+/g, '$1')
    // 불필요한 심볼 제거 또는 변환
    .replace(/[\*\#\@\~\`\|\^]/g, '')
    // 괄호 안의 내용은 유지하되 TTS 발음을 위해 공백 추가
    .replace(/(\()([^)]*)(\))/g, ' $1 $2 $3 ')
    // 숫자와 단위 사이에 공백 추가 (예: '100kg' -> '100 kg')
    .replace(/(\d+)([a-zA-Z가-힣]+)/g, '$1 $2')
  
  // 중복 공백 제거 및 정리
  text = text.replace(/\s+/g, ' ').trim()
  
  return text
}
