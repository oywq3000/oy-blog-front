// ============================================================
// 会话历史项 ··· 菜单的视口定位纯函数
//
// 菜单用 position: fixed 渲染在按钮/鼠标旁，必须处理三种情况：
// 1. 默认右对齐触发点、向下展开
// 2. 底部放不下 → 向上翻转
// 3. 翻转后仍越界 → 夹回视口内（margin 内）
// 抽成纯函数便于单测覆盖边界（happy-dom 无布局引擎，无法断言真实坐标）
// ============================================================

export interface MenuPlacement {
  left: number
  top: number
}

export interface ComputeMenuPlacementOptions {
  /** 触发点（视口坐标）：按钮右边缘 + 底边缘；光标锚点时传入光标位置推算值 */
  trigger: { right: number; bottom: number }
  menuSize: { width: number; height: number }
  viewport: { width: number; height: number }
  /** 菜单与触发点的间距，默认 4 */
  gap?: number
  /** 菜单与视口边缘的最小间距，默认 8 */
  margin?: number
}

export function computeMenuPlacement(options: ComputeMenuPlacementOptions): MenuPlacement {
  const gap = options.gap ?? 4
  const margin = options.margin ?? 8
  const { trigger, menuSize, viewport } = options

  // 右对齐触发点（菜单右边缘贴着按钮右边缘），向下展开
  let left = trigger.right - menuSize.width
  let top = trigger.bottom + gap

  // 底部放不下 → 向上翻转
  if (top + menuSize.height > viewport.height - margin) {
    top = trigger.bottom - menuSize.height - gap
  }

  // 翻转后仍越界（视口极小/菜单极高）→ 夹到视口内
  top = Math.max(margin, Math.min(top, viewport.height - menuSize.height - margin))
  left = Math.max(margin, Math.min(left, viewport.width - menuSize.width - margin))

  return { left, top }
}
