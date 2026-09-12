import { describe, it, expect } from 'vitest';
import {
  COVER_IMAGE_POLICY,
  CONTENT_IMAGE_POLICY,
  IMAGE_MAX_SOURCE_BYTES,
  IMAGE_PASS_THROUGH_BYTES,
  validateImageFile,
  pickScaledSize,
  shouldReencode,
  prepareImageFiles,
} from './imageUpload';

const KB = 1024;
/** 只关心 type/size 两个字段，其余（name/lastModified）与判定无关 */
const file = (type: string, size: number) => ({ type, size });

/** 真实 File（prepareImageFiles 走 prepareImageFile，会把直传原件透传出来） */
const realFile = (name: string, type: string, bytes = 2048) =>
  new File([new Uint8Array(bytes)], name, { type });

/** 体积超大但不用真分配内存 */
const oversizedFile = (name: string, type: string) => {
  const f = realFile(name, type, 8);
  Object.defineProperty(f, 'size', { value: IMAGE_MAX_SOURCE_BYTES + 1 });
  return f;
};

describe('validateImageFile', () => {
  it('accepts common image mime types', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) {
      expect(validateImageFile(file(type, 1024))).toEqual({ valid: true });
    }
  });

  it('rejects non-image types', () => {
    expect(validateImageFile(file('application/pdf', 1024))).toEqual({
      valid: false,
      issue: 'not-image',
    });
  });

  it('rejects empty type', () => {
    expect(validateImageFile(file('', 1024))).toEqual({ valid: false, issue: 'not-image' });
  });

  it('rejects files above the source ceiling', () => {
    expect(validateImageFile(file('image/png', IMAGE_MAX_SOURCE_BYTES + 1))).toEqual({
      valid: false,
      issue: 'too-large',
    });
  });

  it('accepts a file exactly at the source ceiling', () => {
    expect(validateImageFile(file('image/png', IMAGE_MAX_SOURCE_BYTES))).toEqual({ valid: true });
  });
});

describe('pickScaledSize', () => {
  it('does not upscale an image already within the ceiling', () => {
    expect(pickScaledSize(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });

  it('scales a landscape image by its long side', () => {
    expect(pickScaledSize(4000, 2000, 1280)).toEqual({ width: 1280, height: 640 });
  });

  it('scales a portrait image by its long side', () => {
    expect(pickScaledSize(2000, 4000, 1280)).toEqual({ width: 640, height: 1280 });
  });

  it('keeps a square square', () => {
    expect(pickScaledSize(3000, 3000, 1280)).toEqual({ width: 1280, height: 1280 });
  });

  it('never collapses a side to zero on extreme ratios', () => {
    expect(pickScaledSize(4000, 3, 1280)).toEqual({ width: 1280, height: 1 });
    expect(pickScaledSize(3, 4000, 1280)).toEqual({ width: 1, height: 1280 });
  });

  it('returns null for non-positive or non-finite dimensions', () => {
    expect(pickScaledSize(0, 100, 1280)).toBeNull();
    expect(pickScaledSize(100, 0, 1280)).toBeNull();
    expect(pickScaledSize(-100, 100, 1280)).toBeNull();
    expect(pickScaledSize(NaN, 100, 1280)).toBeNull();
    expect(pickScaledSize(Infinity, 100, 1280)).toBeNull();
  });

  it('returns null for a non-positive ceiling', () => {
    expect(pickScaledSize(100, 100, 0)).toBeNull();
  });
});

describe('shouldReencode', () => {
  it('passes through files at or below the pass-through threshold', () => {
    expect(shouldReencode(file('image/jpeg', IMAGE_PASS_THROUGH_BYTES))).toBe(false);
    expect(shouldReencode(file('image/jpeg', 8))).toBe(false);
  });

  it('re-encodes files above the pass-through threshold', () => {
    expect(shouldReencode(file('image/jpeg', IMAGE_PASS_THROUGH_BYTES + 1))).toBe(true);
  });

  it('passes through GIF so animation survives', () => {
    expect(shouldReencode(file('image/gif', 2 * 1024 * KB))).toBe(false);
  });

  it('passes through SVG so vector output is not rasterized', () => {
    expect(shouldReencode(file('image/svg+xml', 2 * 1024 * KB))).toBe(false);
  });

  it('re-encodes an oversized PNG', () => {
    expect(shouldReencode(file('image/png', 1_755_680))).toBe(true);
  });
});

describe('image policies', () => {
  // 这两个数字是有意的产品取值（封面按卡片展示宽度、正文图按内容栏宽度的 2x 高分屏），
  // 改动即为决策变更，所以在这里钉住。
  it('caps cover images at 1280 and content images at 1600', () => {
    expect(COVER_IMAGE_POLICY.maxSide).toBe(1280);
    expect(CONTENT_IMAGE_POLICY.maxSide).toBe(1600);
  });

  it('gives content images at least as much room as covers', () => {
    const cover = pickScaledSize(4000, 3000, COVER_IMAGE_POLICY.maxSide)!;
    const content = pickScaledSize(4000, 3000, CONTENT_IMAGE_POLICY.maxSide)!;
    expect(content.width).toBeGreaterThanOrEqual(cover.width);
  });
});

describe('prepareImageFiles', () => {
  it('挑出可上传的文件，把不合规的收成 issue（一次选多张正文图时有对有错）', async () => {
    const ok1 = realFile('a.png', 'image/png');
    const tooBig = oversizedFile('huge.png', 'image/png');
    const ok2 = realFile('b.jpg', 'image/jpeg');

    const result = await prepareImageFiles([ok1, tooBig, ok2], CONTENT_IMAGE_POLICY);

    expect(result.files).toEqual([ok1, ok2]);
    expect(result.issues).toEqual(['too-large']);
  });

  it('全部不合规时不产生待上传文件，逐个报 issue', async () => {
    const result = await prepareImageFiles(
      [oversizedFile('huge.png', 'image/png'), realFile('doc.pdf', 'application/pdf')],
      CONTENT_IMAGE_POLICY
    );

    expect(result.files).toEqual([]);
    expect(result.issues).toEqual(['too-large', 'not-image']);
  });

  it('空输入返回空结果', async () => {
    expect(await prepareImageFiles([], CONTENT_IMAGE_POLICY)).toEqual({ files: [], issues: [] });
  });
});
