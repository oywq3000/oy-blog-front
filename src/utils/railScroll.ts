/**
 * ArticleRail 横滑轨道滚动的边界判定与步进计算（纯函数，便于单测）。
 * 两端各留 4px 余量，防 1px 舍入导致箭头在尽头仍可点。
 */
export const RAIL_EDGE_EPSILON = 4;

export interface RailArrowState {
  canPrev: boolean;
  canNext: boolean;
}

export function railArrowState(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number
): RailArrowState {
  return {
    canPrev: scrollLeft > RAIL_EDGE_EPSILON,
    canNext: scrollLeft + clientWidth < scrollWidth - RAIL_EDGE_EPSILON,
  };
}

/** 箭头单次步进 = 可视宽度的 80%（约一屏少一点，便于看到上下文） */
export function railStepPx(clientWidth: number): number {
  return Math.round(clientWidth * 0.8);
}