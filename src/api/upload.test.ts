import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock 工厂被提升到文件顶部，引用外层 const 会 TDZ 报错，须用 vi.hoisted 定义
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('./request', () => ({ default: { post: postMock } }));

import {
  uploadAvatar,
  uploadCover,
  uploadSeriesCover,
  uploadContentImage,
  UPLOAD_TIMEOUT_MS,
} from './upload';

/**
 * 回归测试：头像上传被全局 10s 超时中断（浏览器已放弃，服务端仍写完头像 → "超时但头像改了"）。
 * 头像上传单独放宽超时，避免弱网/大图下假失败。
 */
describe('uploadAvatar', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: { url: 'u' } });
  });

  it('使用加长超时（全局默认 10s 会中断上传）', async () => {
    await uploadAvatar(new File(['x'], 'avatar.webp', { type: 'image/webp' }));

    const config = postMock.mock.calls[0][2];
    expect(config.timeout).toBe(UPLOAD_TIMEOUT_MS);
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(10000);
  });

  it('以 multipart 发送 file 字段', async () => {
    const file = new File(['x'], 'avatar.webp', { type: 'image/webp' });
    await uploadAvatar(file);

    const body = postMock.mock.calls[0][1] as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
  });
});

/**
 * 回归测试：封面/正文图同样被全局 10s 超时卡住 —— 线上上行约 40~100KB/s，
 * 经降采样后的图仍有 100~250KB，要 1~6s，弱网再抖一下即触顶。服务端可能已写入，
 * 表现为"提示超时但其实传成功了"。
 */
describe('图片上传端点', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ isSuccess: true, errCode: 200, errMsg: '', data: { url: 'u' } });
  });

  const endpoints: [string, (file: File) => Promise<unknown>, string][] = [
    ['uploadCover', uploadCover, '/api/article-service/article/cover'],
    ['uploadSeriesCover', uploadSeriesCover, '/api/article-service/article/creator/series/cover'],
    ['uploadContentImage', uploadContentImage, '/api/article-service/article/image'],
  ];

  it.each(endpoints)('%s 使用加长超时', async (_name, upload, path) => {
    await upload(new File(['x'], 'cover.webp', { type: 'image/webp' }));

    const [url, , config] = postMock.mock.calls[0];
    expect(url).toBe(path);
    // 先钉住常量本身：只写 toBe(UPLOAD_TIMEOUT_MS) 的话，常量还没导出时两边同为
    // undefined 也会通过，等于没测（实测踩过）。
    expect(UPLOAD_TIMEOUT_MS).toBeGreaterThan(10000);
    expect(config.timeout).toBe(UPLOAD_TIMEOUT_MS);
  });
});
