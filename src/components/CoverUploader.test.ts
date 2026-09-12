import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import CoverUploader from './CoverUploader.vue';
import { uploadSeriesCover } from '../api/upload';
import type { ImageInfo, ResultImageInfo } from '../api/upload';
import { IMAGE_MAX_SOURCE_BYTES } from '../utils/imageUpload';
import zh from '../locales/zh';

const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));

vi.mock('../api/upload', () => ({
  uploadSeriesCover: vi.fn(),
}));

vi.mock('../composables/useToast', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  messages: { zh },
  missingWarn: false,
  fallbackWarn: false,
});

const okEnvelope = (data: ImageInfo): ResultImageInfo => ({
  errCode: 200,
  errMsg: '',
  isSuccess: true,
  data,
});

const fileOf = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type });

/** 造一个"体积超大但不用真分配那么多内存"的文件 */
const oversized = (name: string, type: string) => {
  const file = fileOf(name, type, 8);
  Object.defineProperty(file, 'size', { value: IMAGE_MAX_SOURCE_BYTES + 1 });
  return file;
};

async function pickFile(wrapper: VueWrapper, file: File) {
  const input = wrapper.find('.cover-file');
  Object.defineProperty(input.element, 'files', { value: [file] });
  await input.trigger('change');
  await flushPromises();
}

const mountUploader = () =>
  mount(CoverUploader, { props: { modelValue: '' }, global: { plugins: [i18n] } });

describe('CoverUploader', () => {
  beforeEach(() => {
    addToastMock.mockReset();
    vi.mocked(uploadSeriesCover).mockReset();
    vi.mocked(uploadSeriesCover).mockResolvedValue(
      okEnvelope({ key: 'k', url: 'http://up/c.webp', contentType: 'image/webp', size: 1024 }),
    );
  });

  it('小图原样直传（体积已在直传阈值内，不做解码重编码）', async () => {
    const wrapper = mountUploader();
    const file = fileOf('cover.png', 'image/png', 2048);

    await pickFile(wrapper, file);

    // 同一个 File 实例：证明走的是"直传"分支而不是重编码后新建的对象
    expect(uploadSeriesCover).toHaveBeenCalledWith(file);
  });

  it('超过源头体积上限：不发请求，提示图片过大', async () => {
    const wrapper = mountUploader();

    await pickFile(wrapper, oversized('huge.png', 'image/png'));

    expect(uploadSeriesCover).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('图片不能超过 20MB', 'warning');
  });

  it('非图片文件：不发请求，提示只支持图片', async () => {
    const wrapper = mountUploader();

    await pickFile(wrapper, fileOf('doc.pdf', 'application/pdf', 2048));

    expect(uploadSeriesCover).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith('只能上传图片文件', 'warning');
  });
});
