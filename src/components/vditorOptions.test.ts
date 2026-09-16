import { describe, it, expect, vi } from 'vitest';
import { buildVditorOptions } from './vditorOptions';

describe('buildVditorOptions', () => {
  it('透传 mode/theme/placeholder/初始值', () => {
    const opts = buildVditorOptions({
      mode: 'ir',
      theme: 'dark',
      placeholder: '请输入内容',
      initialValue: '# 标题',
      onInput: () => {},
      onUpload: async () => {},
    });
    expect(opts.mode).toBe('ir');
    expect(opts.theme).toBe('dark');
    expect(opts.placeholder).toBe('请输入内容');
    expect(opts.value).toBe('# 标题');
  });

  it('关闭本地缓存(草稿走后端而非 vditor storage)', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    expect(opts.cache).toBe(false);
  });

  it('把 onInput/onUpload 挂到 input 与 upload.handler', () => {
    const onInput = vi.fn();
    const onUpload = vi.fn();
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput, onUpload,
    });
    expect(opts.input).toBe(onInput);
    expect(opts.upload?.handler).toBe(onUpload);
  });

  it('editor 高度撑满容器而非随内容增长(vditor 默认 height auto 会内联覆盖 CSS)', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    // vditor init 会用该值设 vditor.element.style.height(inline > CSS),
    // 传 '100%' 让编辑区吃满 .editor-wrapper;传 'auto' 则随行数变长。
    expect(opts.height).toBe('100%');
    expect(opts.height).not.toBe('auto');
  });

  it('全屏模式层级高于站点导航栏 .navbar(z-index 1000)', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    // 站点头部 .navbar 本体 position:fixed z-index:1000(子元素 logo/controls 1001);
    // vditor 全屏默认 90,需提到其层级树以上 —— 2000;同时配合父级 .editor-layout
    // 不建 stacking context(见 ArticleEditor.vue)才实际生效。
    expect((opts.fullscreen as { index?: number } | undefined)?.index ?? 90)
      .toBeGreaterThan(1000);
  });

  it('默认工具栏不含录音 record 项(产品不要录音功能)', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    // vditor 默认主工具栏在 upload 与 table 之间有 record;这里应被替换为去 record 的定制数组。
    const toolbar = opts.toolbar as Array<string | { name?: string; toolbar?: string[] }> | undefined;
    expect(toolbar).toBeTruthy();
    const flat: string[] = [];
    for (const item of toolbar ?? []) {
      if (typeof item === 'string') flat.push(item);
      else if (item) {
        if (item.name) flat.push(String(item.name));
        if (item.toolbar) flat.push(...item.toolbar.map(String));
      }
    }
    expect(flat).not.toContain('record');
    // 且关键项都在(替换不是残缺)
    for (const key of ['upload', 'table', 'fullscreen', 'edit-mode', 'bold', 'emoji']) {
      expect(flat).toContain(key);
    }
  });
});