import { describe, it, expect } from 'vitest';
import { splitHotTags } from './tagDisplay';

interface T {
  id: string;
  isCommon?: number;
}
const tag = (id: string, isCommon?: number): T => ({ id, ...(isCommon !== undefined ? { isCommon } : {}) });

describe('splitHotTags 官方 / 用户自创 拆分', () => {
  it('默认上限：官方取前20、自创取前12（25 官方 + 15 自创 → 20+12）', () => {
    const official = Array.from({ length: 25 }, (_, i) => tag('o' + (i + 1), 1));
    const user = Array.from({ length: 15 }, (_, i) => tag('u' + (i + 1), 0));
    const { official: off, userCreated: usr } = splitHotTags([...official, ...user]);
    expect(off).toHaveLength(20);
    expect(usr).toHaveLength(12);
    expect(off.map((t) => t.id)).toEqual(official.slice(0, 20).map((t) => t.id));
    expect(usr.map((t) => t.id)).toEqual(user.slice(0, 12).map((t) => t.id));
  });

  it('官方不足上限时按实际数量，自创取满', () => {
    const { official: off, userCreated: usr } = splitHotTags([
      tag('o1', 1), tag('o2', 1), tag('o3', 1),
      ...Array.from({ length: 15 }, (_, i) => tag('u' + (i + 1), 0)),
    ]);
    expect(off.map((t) => t.id)).toEqual(['o1', 'o2', 'o3']);
    expect(usr).toHaveLength(12);
  });

  it('显式传限时按传入值截断（官方10 + 自创5）', () => {
    const official = Array.from({ length: 15 }, (_, i) => tag('o' + (i + 1), 1));
    const user = Array.from({ length: 8 }, (_, i) => tag('u' + (i + 1), 0));
    const { official: off, userCreated: usr } = splitHotTags([...official, ...user], 10, 5);
    expect(off.map((t) => t.id)).toEqual(official.slice(0, 10).map((t) => t.id));
    expect(usr.map((t) => t.id)).toEqual(user.slice(0, 5).map((t) => t.id));
  });

  it('旧后端未下发 isCommon 时，全部视为官方，自创云为空', () => {
    const all = Array.from({ length: 26 }, (_, i) => tag('t' + (i + 1)));
    const { official: off, userCreated: usr } = splitHotTags(all);
    expect(off).toHaveLength(20);
    expect(off[0].id).toBe('t1');
    expect(off[19].id).toBe('t20');
    expect(usr).toEqual([]);
  });

  it('空数组 / undefined 输入安全返回两个空数组', () => {
    expect(splitHotTags(undefined as unknown as T[])).toEqual({ official: [], userCreated: [] });
    expect(splitHotTags([])).toEqual({ official: [], userCreated: [] });
  });
});