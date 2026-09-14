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

/**
 * 热门标签拆分（首页 TagCloud 双云展示用）：官方标签(isCommon===1)与
 * 用户自创标签(0)各自成云，分别取前 officialMax / userMax。
 *
 * 兼容旧后端：若整表都未下发 isCommon，说明接口未升级，全部视为官方，
 * 避免官方云空白、误把官方标签塞进用户云。
 */
export interface TagSplit<T> {
  official: T[];
  userCreated: T[];
}

export function splitHotTags<T extends { isCommon?: number }>(
  tags: T[] | undefined,
  officialMax = 20,
  userMax = 12,
): TagSplit<T> {
  const list = tags ?? [];
  if (!list.some((t) => t.isCommon !== undefined)) {
    return { official: list.slice(0, officialMax), userCreated: [] };
  }
  const official: T[] = []
  const user: T[] = []
  for (const t of list) {
    if (t.isCommon === 1) official.push(t)
    else user.push(t)
  }
  return { official: official.slice(0, officialMax), userCreated: user.slice(0, userMax) }
}
