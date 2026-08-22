/**
 * 计算文章卡片要展示的标签（最多 max 个）：
 * - 命中的标签必须展示：若不在前 max 个里，顶替末位
 * - 其余按文章标签原顺序补位
 *
 * @param tags 文章全部标签
 * @param matchedTags 搜索命中的标签名（来自 ES 高亮，纯文本）
 * @param max 最多展示个数，默认 3
 */
export function pickDisplayTags(tags: string[], matchedTags: string[], max = 3): string[] {
  const source = tags ?? []
  const matched = matchedTags ?? []
  const result = source.slice(0, max)
  if (result.length === 0) {
    return result
  }
  for (const m of matched) {
    if (source.includes(m) && !result.includes(m)) {
      result[result.length - 1] = m // 顶替末位，保证命中标签可见
    }
  }
  return result
}
