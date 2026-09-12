/**
 * 封面 / 正文图上传前的降采样与前置校验。
 *
 * 背景：原图直传会同时踩两个坑 —— article-service 没配 multipart 上限（吃 Spring 默认
 * 1MB，线上实测 1.75MB 的专栏封面被 MaxUploadSizeExceededException 拒成 500），以及
 * 全局 10s 请求超时（线上上行实测约 40~100KB/s，256KB 就要 2.6~6.4s）。
 *
 * 分层与 avatarFile.ts 一致：判定逻辑全是纯函数（有单测），碰 canvas 的只有一个薄函数
 * （DOM 依赖故无单测、人工验证）。
 */
import { canEncodeAvatarWebp, pickAvatarExportFormat } from './avatarFile';

/** 上传策略：目前只有最长边一个口径（体积阈值两类图共用，见 IMAGE_PASS_THROUGH_BYTES） */
export interface ImagePolicy {
  /** 导出后的最长边上限；原图小于它时不放大 */
  maxSide: number;
}

/** 源头体积上限：超过直接拒，避免浏览器去解码一个超大图把标签页拖死 */
export const IMAGE_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** 直传阈值：不超过它就连解码都不做、原图直传（省一次解码与一次有损重编码） */
export const IMAGE_PASS_THROUGH_BYTES = 256 * 1024;

/**
 * 重编码会破坏语义的类型，一律原图直传：GIF 会丢动画，SVG 会被栅格化。
 * （动图 WebP 同理但需要解析字节才能识别，暂不覆盖，已知限制。）
 */
export const IMAGE_PASS_THROUGH_TYPES = ['image/gif', 'image/svg+xml'];

/** 封面：卡片/专栏以约 640px CSS 宽展示，1280 覆盖 2x 高分屏 */
export const COVER_IMAGE_POLICY: ImagePolicy = { maxSide: 1280 };
/** 正文图：内容栏约 800px CSS 宽，1600 覆盖 2x 高分屏 */
export const CONTENT_IMAGE_POLICY: ImagePolicy = { maxSide: 1600 };

export type ImageUploadIssue = 'not-image' | 'too-large' | 'decode-failed';

const ISSUE_MESSAGE_KEYS: Record<ImageUploadIssue, string> = {
  'not-image': 'imageUpload.notImage',
  'too-large': 'imageUpload.tooLarge',
  'decode-failed': 'imageUpload.decodeFailed',
};

/**
 * issue → i18n key。三个上传调用点共用，新增 issue 时只需改这里的映射表
 * （漏配会在 t() 上暴露为缺键警告，不会静默）。
 */
export function imageIssueMessageKey(issue: ImageUploadIssue): string {
  return ISSUE_MESSAGE_KEYS[issue];
}

export type ImageFileCheck =
  | { valid: true }
  | { valid: false; issue: 'not-image' | 'too-large' };

export type PreparedImage =
  | { ok: true; file: File }
  | { ok: false; issue: ImageUploadIssue };

/**
 * 文件级校验：必须是图片且不超过源头体积上限。
 * 尺寸校验需要解码，故不在这里做（见 pickScaledSize / prepareImageFile）。
 */
export function validateImageFile(file: { type: string; size: number }): ImageFileCheck {
  if (!file.type.startsWith('image/')) {
    return { valid: false, issue: 'not-image' };
  }
  if (file.size > IMAGE_MAX_SOURCE_BYTES) {
    return { valid: false, issue: 'too-large' };
  }
  return { valid: true };
}

/**
 * 等比缩放后的导出尺寸：不放大（原图已在 maxSide 内即原样返回），
 * 极端比例下把短边夹在 1 像素而不是 0（canvas 宽度 0 会画不出来）。
 * 宽高或上限非法时返回 null，由调用方按"无法处理"处置。
 */
export function pickScaledSize(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (!Number.isFinite(maxSide) || maxSide <= 0) return null;

  const longSide = Math.max(width, height);
  if (longSide <= maxSide) {
    return { width: Math.floor(width), height: Math.floor(height) };
  }
  const ratio = maxSide / longSide;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * 是否需要过 canvas 重编码。按体积而非尺寸判定：尺寸要解码才知道，而解码恰恰是
 * 重编码唯一值得做的事 —— 体积已经很小就整个跳过。
 */
export function shouldReencode(file: { type: string; size: number }): boolean {
  if (IMAGE_PASS_THROUGH_TYPES.includes(file.type)) return false;
  return file.size > IMAGE_PASS_THROUGH_BYTES;
}

/** 解码图片（浏览器环境，DOM 依赖故无单测）。返回 null 表示该文件无法作为图片解码。 */
function decodeImage(file: File): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (result: HTMLImageElement | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** 按目标尺寸重绘并导出（浏览器环境，DOM 依赖故无单测）。 */
function drawToBlob(
  img: HTMLImageElement,
  size: { width: number; height: number },
  format: { mimeType: string; quality: number }
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, 0, 0, size.width, size.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format.mimeType, format.quality);
  });
}

/** 换扩展名（导出格式可能与源文件不同，文件名要跟着走） */
function withExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base || name}.${extension}`;
}

/**
 * 上传前的准备：校验 → 需要时解码降采样 → 返回可直接送上传的文件。
 * 已经足够小、无需重编码的（含 GIF/SVG）原样返回同一个 File 对象。
 *
 * 重编码链路上任何一步失败都返回 `decode-failed` 而不是回退原图：此时上传一个必然
 * 超过服务端上限的文件，用户只会拿到一个语义不清的 500，不如直接告诉他这张图处理不了。
 */
export async function prepareImageFile(file: File, policy: ImagePolicy): Promise<PreparedImage> {
  const check = validateImageFile(file);
  if (!check.valid) return { ok: false, issue: check.issue };

  if (!shouldReencode(file)) return { ok: true, file };

  const img = await decodeImage(file);
  if (!img) return { ok: false, issue: 'decode-failed' };

  const target = pickScaledSize(img.naturalWidth, img.naturalHeight, policy.maxSide);
  if (!target) return { ok: false, issue: 'decode-failed' };

  // WebP 优先（同观感体积约为 JPEG 的 7 折），老浏览器退 JPEG —— 与头像同一决策，
  // 直接复用 avatarFile 里的实现，两处不要各写一份。
  const format = pickAvatarExportFormat(canEncodeAvatarWebp());
  const blob = await drawToBlob(img, target, format);
  if (!blob) return { ok: false, issue: 'decode-failed' };

  return {
    ok: true,
    file: new File([blob], withExtension(file.name, format.extension), { type: format.mimeType }),
  };
}

export interface PreparedImageBatch {
  /** 可送上传的文件，顺序与入参一致（已剔除不合规的） */
  files: File[];
  /** 被剔除的原因，按出现顺序 */
  issues: ImageUploadIssue[];
}

/**
 * 批量准备（正文图一次可选多张）：逐个走 prepareImageFile，把不合规的挑出来，
 * 合规的照常上传 —— 一张不合格不该连累同批其它图。
 */
export async function prepareImageFiles(
  files: File[],
  policy: ImagePolicy
): Promise<PreparedImageBatch> {
  const prepared = await Promise.all(files.map((file) => prepareImageFile(file, policy)));

  const ready: File[] = [];
  const issues: ImageUploadIssue[] = [];
  for (const item of prepared) {
    if (item.ok) ready.push(item.file);
    else issues.push(item.issue);
  }
  return { files: ready, issues };
}
