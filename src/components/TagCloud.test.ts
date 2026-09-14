import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import TagCloud from './TagCloud.vue';
import { getPopularTags } from '../api/article';
import type { TagStat } from '../api/article';

vi.mock('../api/article', () => ({
  getPopularTags: vi.fn(),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  messages: {
    zh: { sidebar: { hotTags: '热门标签' } },
  },
  missingWarn: false,
  fallbackWarn: false,
});

const tag = (name: string, articleCount: number, isCommon?: number): TagStat => {
  const t: TagStat = { id: 'id-' + name, name, articleCount };
  if (isCommon !== undefined) t.isCommon = isCommon;
  return t;
};

const mountTagCloud = () =>
  mount(TagCloud, {
    global: {
      plugins: [i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });

/** 25 个官方（isCommon=1）+ 15 个自创（isCommon=0），各自文章数降序 */
const mkTags = () => [
  ...Array.from({ length: 25 }, (_, i) => tag('官方标签' + (i + 1), 100 - i, 1)),
  ...Array.from({ length: 15 }, (_, i) => tag('自创标签' + (i + 1), 50 - i, 0)),
];

describe('TagCloud 官方云 / 用户自创云 双云展示', () => {
  beforeEach(() => {
    vi.mocked(getPopularTags).mockReset();
  });

  it('官方云渲染前20、用户云渲染前12，均用品牌图标；两朵云紧挨、无多余标记', async () => {
    vi.mocked(getPopularTags).mockResolvedValue({ isSuccess: true, errCode: 0, errMsg: '', data: mkTags() });
    const wrapper = mountTagCloud();
    await flushPromises();

    // 官方云：20 个 chip，全部 tech 图标，无 user-tag 图标
    const officialChips = wrapper.findAll('.tag-cloud__official .tag-chip');
    expect(officialChips).toHaveLength(20);
    expect(officialChips[0].find('.tag-chip__name').text()).toBe('官方标签1');
    expect(officialChips[19].find('.tag-chip__name').text()).toBe('官方标签20');
    expect(officialChips.every((c) => c.find('.tech-icon').exists())).toBe(true);

    // 用户云：12 个 chip，也走品牌图标，带「用户自创标签」标题
    const userChips = wrapper.findAll('.tag-cloud__user .tag-chip');
    expect(userChips).toHaveLength(12);
    expect(userChips[0].find('.tag-chip__name').text()).toBe('自创标签1');
    expect(userChips[11].find('.tag-chip__name').text()).toBe('自创标签12');
    expect(userChips.every((c) => c.find('.tech-icon').exists())).toBe(true);
    expect(userChips.some((c) => c.find('.user-tag-icon').exists())).toBe(false);
    // 用户云紧挨官方云，不再渲染独立标题/图标
    expect(wrapper.find('.tag-cloud__user .tag-cloud__subtitle').exists()).toBe(false);

    // vm 数据层
    const vm = wrapper.vm as unknown as { officialTags: TagStat[]; userTags: TagStat[] };
    expect(vm.officialTags).toHaveLength(20);
    expect(vm.userTags).toHaveLength(12);
    expect(vm.officialTags[0].name).toBe('官方标签1');
    expect(vm.userTags[0].name).toBe('自创标签1');
  });

  it('旧后端（无 isCommon）时全部落入官方云，用户云不渲染，避免官方空白', async () => {
    const data = Array.from({ length: 26 }, (_, i) => tag('Tag' + (i + 1), 100 - i));
    vi.mocked(getPopularTags).mockResolvedValue({ isSuccess: true, errCode: 0, errMsg: '', data });
    const wrapper = mountTagCloud();
    await flushPromises();

    expect(wrapper.findAll('.tag-chip')).toHaveLength(20);
    expect(wrapper.findAll('.tag-cloud__official .tag-chip')).toHaveLength(20);
    expect(wrapper.findAll('.tag-cloud__user .tag-chip')).toHaveLength(0);
    expect(wrapper.find('.tag-cloud__user').exists()).toBe(false);
    expect(wrapper.findAll('.tag-chip')[0].find('.tag-chip__name').text()).toBe('Tag1');
  });
});