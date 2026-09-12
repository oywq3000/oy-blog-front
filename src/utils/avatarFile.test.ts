import { describe, it, expect } from 'vitest';
import {
  AVATAR_EXPORT_QUALITY,
  AVATAR_MAX_FILE_BYTES,
  AVATAR_MAX_SIDE,
  AVATAR_MIN_SIDE,
  validateAvatarFile,
  pickAvatarOutputSize,
  pickAvatarExportFormat,
} from './avatarFile';

describe('validateAvatarFile', () => {
  it('accepts common image mime types', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) {
      expect(validateAvatarFile({ type, size: 1024 })).toEqual({ valid: true });
    }
  });

  it('rejects non-image types', () => {
    expect(validateAvatarFile({ type: 'application/pdf', size: 1024 })).toEqual({
      valid: false,
      issue: 'not-image',
    });
  });

  it('rejects empty type', () => {
    expect(validateAvatarFile({ type: '', size: 1024 })).toEqual({
      valid: false,
      issue: 'not-image',
    });
  });

  it('rejects files larger than the limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_FILE_BYTES + 1 })).toEqual({
      valid: false,
      issue: 'too-large',
    });
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateAvatarFile({ type: 'image/png', size: AVATAR_MAX_FILE_BYTES })).toEqual({
      valid: true,
    });
  });
});

describe('pickAvatarOutputSize', () => {
  it('caps large crops at the export limit', () => {
    expect(pickAvatarOutputSize(2000)).toBe(AVATAR_MAX_SIDE);
    expect(pickAvatarOutputSize(AVATAR_MAX_SIDE)).toBe(AVATAR_MAX_SIDE);
  });

  it('keeps small crops at their natural size (no upscaling)', () => {
    expect(pickAvatarOutputSize(300)).toBe(300);
    expect(pickAvatarOutputSize(1)).toBe(1);
  });

  it('returns 0 for non-positive or non-finite input', () => {
    expect(pickAvatarOutputSize(0)).toBe(0);
    expect(pickAvatarOutputSize(-5)).toBe(0);
    expect(pickAvatarOutputSize(Number.NaN)).toBe(0);
    expect(pickAvatarOutputSize(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('pickAvatarExportFormat', () => {
  it('exports WebP when the browser can encode it', () => {
    expect(pickAvatarExportFormat(true)).toEqual({
      mimeType: 'image/webp',
      extension: 'webp',
      quality: AVATAR_EXPORT_QUALITY,
    });
  });

  it('falls back to JPEG when WebP encoding is unavailable', () => {
    expect(pickAvatarExportFormat(false)).toEqual({
      mimeType: 'image/jpeg',
      extension: 'jpg',
      quality: AVATAR_EXPORT_QUALITY,
    });
  });

  it('uses a lossy quality in (0, 1) so photographic crops stay small', () => {
    expect(AVATAR_EXPORT_QUALITY).toBeGreaterThan(0);
    expect(AVATAR_EXPORT_QUALITY).toBeLessThan(1);
  });
});

describe('size constants', () => {
  it('keeps min-side sanity below export cap', () => {
    expect(AVATAR_MIN_SIDE).toBeLessThan(AVATAR_MAX_SIDE);
  });
});
