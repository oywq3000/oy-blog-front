import { describe, it, expect } from 'vitest';
import { railArrowState, railStepPx } from './railScroll';

describe('railArrowState 横向轨道边界态', () => {
  it('起点：canPrev=false，canNext=true', () => {
    expect(railArrowState(0, 100, 500)).toEqual({ canPrev: false, canNext: true });
  });

  it('中间：两向都可', () => {
    expect(railArrowState(200, 100, 500)).toEqual({ canPrev: true, canNext: true });
  });

  it('终点：canPrev=true，canNext=false', () => {
    expect(railArrowState(400, 100, 500)).toEqual({ canPrev: true, canNext: false });
  });

  it('两端留 4px 舍入余量：恰好 4 视为仍在起点', () => {
    expect(railArrowState(4, 100, 500)).toEqual({ canPrev: false, canNext: true });
    expect(railArrowState(5, 100, 500)).toEqual({ canPrev: true, canNext: true });
  });

  it('距右端不足 4px 视为到尾', () => {
    expect(railArrowState(400, 96, 500)).toEqual({ canPrev: true, canNext: false });
  });
});

describe('railStepPx 步进为可视宽度的 80%', () => {
  it('300 → 240', () => {
    expect(railStepPx(300)).toBe(240);
  });

  it('320 → 256（四舍五入）', () => {
    expect(railStepPx(320)).toBe(256);
  });
});