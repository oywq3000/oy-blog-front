/**
 * 头像裁剪上传的纯逻辑 —— 前置校验与导出尺寸决策。
 *
 * 约定：裁剪结果只在浏览器端截取并降采样后上传（原图不直接上传）；
 * 展示层统一用 CSS border-radius 裁圆，导出物为标准正方形 PNG。
 */

/** 原图大小上限（超出直接拒绝，避免浏览器解码超大图片） */
export const AVATAR_MAX_FILE_BYTES = 10 * 1024 * 1024;
/** 最短边下限（小于它裁出来会明显发糊，拒绝进入裁剪框） */
export const AVATAR_MIN_SIDE = 200;
/** 导出边长上限：全站头像最大展示约 150px CSS 宽，512 已覆盖 3x 高分屏 */
export const AVATAR_MAX_SIDE = 512;

export type AvatarPickIssue = 'not-image' | 'too-large';

export type AvatarPickCheck =
  | { valid: true }
  | { valid: false; issue: AvatarPickIssue };

/** 文件级校验：必须是图片且不超过大小上限（尺寸校验需解码，见 readAvatarDimensions） */
export function validateAvatarFile(file: {
  type: string;
  size: number;
}): AvatarPickCheck {
  if (!file.type.startsWith('image/')) {
    return { valid: false, issue: 'not-image' };
  }
  if (file.size > AVATAR_MAX_FILE_BYTES) {
    return { valid: false, issue: 'too-large' };
  }
  return { valid: true };
}

/**
 * 决定导出正方形的边长：大图压到 AVATAR_MAX_SIDE，小图按原尺寸导出，
 * 不做插值放大（否则发糊）。cropSize 为截取区在自然分辨率下的边长。
 */
export function pickAvatarOutputSize(cropSize: number): number {
  if (!Number.isFinite(cropSize) || cropSize <= 0) return 0;
  return Math.min(AVATAR_MAX_SIDE, Math.floor(cropSize));
}

/**
 * 解码图片尺寸（浏览器环境，DOM 依赖故无单测、人工验证）。
 * 返回 null 表示该文件无法作为图片解码。
 */
export function readAvatarImageSize(
  file: File
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (result: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = url;
  });
}
