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

  it('全屏模式层级高于站点 NavBar(z-index 100), 不被 topbar 遮住工具条', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    // NavBar z-index 100,vditor 全屏默认 90 —— 需提到 100 以上。
    expect((opts.fullscreen as { index?: number } | undefined)?.index ?? 90)
      .toBeGreaterThan(100);
  });
});