import { describe, it, expect } from 'vitest';
import { buildImageInsertMarkdown } from './imageInsert';

describe('buildImageInsertMarkdown', () => {
  it('将单个 url 组装成图片 markdown 行', () => {
    expect(buildImageInsertMarkdown(['https://cdn.example.com/a.png']))
      .toBe('![](https://cdn.example.com/a.png)');
  });

  it('多个 url 每张一行、换行拼接', () => {
    expect(buildImageInsertMarkdown([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.webp',
    ])).toBe('![](https://cdn.example.com/a.png)\n![](https://cdn.example.com/b.webp)');
  });

  it('空列表返回空字符串(不产生多余换行)', () => {
    expect(buildImageInsertMarkdown([])).toBe('');
  });
});