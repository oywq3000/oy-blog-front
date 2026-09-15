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
});