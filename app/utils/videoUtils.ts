/**
 * YouTube URL에서 비디오 ID를 추출하는 함수
 * @param url - YouTube URL
 * @returns 비디오 ID 또는 null
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // 이미 ID만 있는 경우 (11자리 문자열)
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }
  
  // YouTube URL 패턴들
  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // https://youtu.be/VIDEO_ID
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // https://www.youtube.com/v/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Vimeo URL에서 비디오 ID를 추출하는 함수
 * @param url - Vimeo URL
 * @returns 비디오 ID 또는 null
 */
export function extractVimeoVideoId(url: string): string | null {
  if (!url) return null;
  
  // 이미 ID만 있는 경우 (숫자만)
  if (/^\d+$/.test(url)) {
    return url;
  }
  
  // Vimeo URL 패턴들
  const patterns = [
    // https://vimeo.com/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
    // https://player.vimeo.com/video/VIDEO_ID
    /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * 비디오 플랫폼과 URL을 기반으로 embed URL을 생성하는 함수
 * @param platform - 비디오 플랫폼 ('youtube' | 'vimeo')
 * @param url - 비디오 URL 또는 ID
 * @returns embed URL 또는 null
 */
export function getEmbedUrl(platform: string, url: string): string | null {
  if (!platform || !url) return null;
  
  switch (platform.toLowerCase()) {
    case 'youtube': {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
      break;
    }
    case 'vimeo': {
      const videoId = extractVimeoVideoId(url);
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
      break;
    }
  }
  
  return null;
}

/**
 * 비디오 썸네일 URL을 생성하는 함수
 * @param platform - 비디오 플랫폼
 * @param url - 비디오 URL 또는 ID
 * @returns 썸네일 URL 또는 null
 */
export function getVideoThumbnail(platform: string, url: string): string | null {
  if (!platform || !url) return null;
  
  switch (platform.toLowerCase()) {
    case 'youtube': {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
      break;
    }
    case 'vimeo': {
      const videoId = extractVimeoVideoId(url);
      if (videoId) {
        // Vimeo 썸네일은 API 호출이 필요하므로 기본 이미지 반환
        return `https://vumbnail.com/${videoId}.jpg`;
      }
      break;
    }
  }
  
  return null;
}