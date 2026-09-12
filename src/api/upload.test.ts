import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock 工厂被提升到文件顶部，引用外层 const 会 TDZ 报错，须用 vi.hoisted 定义
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock('./request', () => ({ default: { post: postMock } }));

import { uploadAvatar, AVATAR_UPLOAD_TIMEOUT_MS } from './upload';

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
    expect(config.timeout).toBe(AVATAR_UPLOAD_TIMEOUT_MS);
    expect(AVATAR_UPLOAD_TIMEOUT_MS).toBeGreaterThan(10000);
  });

  it('以 multipart 发送 file 字段', async () => {
    const file = new File(['x'], 'avatar.webp', { type: 'image/webp' });
    await uploadAvatar(file);

    const body = postMock.mock.calls[0][1] as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
  });
});
