/**
 * 상대적 날짜를 표시하는 유틸리티 함수
 * @param dateString - ISO 형식의 날짜 문자열
 * @returns '오늘', '3일 전' 등의 상대적 날짜 문자열
 */
export function getRelativeTimeString(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  
  // 시간 차이를 밀리초로 계산
  const diffInMs = now.getTime() - date.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  const diffInYears = Math.floor(diffInDays / 365)

  // 미래 날짜인 경우 (혹시 모르니)
  if (diffInMs < 0) {
    return '미래'
  }

  // 1분 미만
  if (diffInSeconds < 60) {
    return '방금 전'
  }

  // 1시간 미만
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`
  }

  // 오늘 (24시간 미만)
  if (diffInHours < 24) {
    return diffInHours === 0 ? '오늘' : `${diffInHours}시간 전`
  }

  // 어제
  if (diffInDays === 1) {
    return '어제'
  }

  // 7일 미만
  if (diffInDays < 7) {
    return `${diffInDays}일 전`
  }

  // 4주 미만
  if (diffInWeeks < 4) {
    return `${diffInWeeks}주 전`
  }

  // 12개월 미만
  if (diffInMonths < 12) {
    return `${diffInMonths}개월 전`
  }

  // 1년 이상
  return `${diffInYears}년 전`
}

/**
 * 오늘인지 확인하는 함수
 */
export function isToday(dateString: string): boolean {
  const today = new Date()
  const date = new Date(dateString)
  
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * 어제인지 확인하는 함수
 */
export function isYesterday(dateString: string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const date = new Date(dateString)
  
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  )
}