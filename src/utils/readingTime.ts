/**
 * Estimate reading time for a given text content.
 * Average reading speed: ~200 words per minute for English,
 * ~300 characters per minute for Chinese.
 */
export function estimateReadingTime(content: string, locale: string = 'en'): number {
  if (!content) return 1;

  if (locale === 'zh') {
    // Chinese: count characters (excluding whitespace and punctuation roughly)
    const chineseChars = (content.match(/[一-鿿]/g) || []).length;
    return Math.max(1, Math.ceil(chineseChars / 300));
  }

  // English/Default: count words
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Format a reading time number into a human-readable string.
 */
export function formatReadingTime(minutes: number, locale: string = 'en'): string {
  if (locale === 'zh') {
    return `约 ${minutes} 分钟阅读`;
  }
  return `${minutes} min read`;
}
