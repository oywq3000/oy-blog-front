import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { h } from 'vue';
import ArticleRailCard from './ArticleRailCard.vue';

// 无封面角标胶囊内的占位图标：render 函数组件，避免单测环境依赖运行时模板编译
const ArtStub = {
  name: 'ArtStub',
  render: () => h('svg', { class: 'art-stub-icon', 'aria-hidden': 'true' }),
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: {} }],
  });
}

const base = {
  id: 'a1',
  title: '理解 Vue 响应式原理',
  summary: '一次讲透 ref 与 reactive 背后的依赖收集与派发更新机制。',
  tags: ['Vue', 'i18n', 'test', 'extra'],
  image: 'http://x/cover.jpg',
  viewCount: 1234,
  likeCount: 567,
  readingTimeMinutes: 8,
  authorName: 'OY',
  authorAvatar: 'http://x/oy.png',
  authorId: 'u1',
};

function mountCard(props: Record<string, unknown>, router = makeRouter()) {
  return mount(ArticleRailCard, {
    props: ({ id: 'x', title: '', ...props } as unknown) as never,
    global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('ArticleRailCard 横向信息卡', () => {
  it('有封面：整卡即封面图 + 底部最小信息（标题/浏览/点赞），剥离摘要/标签/作者/角标', () => {
    const wrapper = mountCard(base);
    expect(wrapper.classes()).toContain('rail-card--cover');
    expect(wrapper.find('.rail-card__cover').attributes('src')).toBe('http://x/cover.jpg');
    expect(wrapper.find('.rail-card__title').text()).toBe('理解 Vue 响应式原理');

    const stats = wrapper.find('.rail-card__cover-stats').text();
    expect(stats).toContain('1.2k');
    expect(stats).toContain('567');

    // 封面态只展示必要信息
    expect(wrapper.find('.rail-card__summary').exists()).toBe(false);
    expect(wrapper.find('.rail-card__tags').exists()).toBe(false);
    expect(wrapper.find('.rail-card__author').exists()).toBe(false);
    expect(wrapper.find('.rail-card__art-pill').exists()).toBe(false);
  });

  it('无封面：整卡渐变，信息全部直接写在渐变上（角标/标题/摘要/标签/作者/数据）', () => {
    const { image: _omit, ...noCover } = base;
    const wrapper = mountCard({ ...noCover, artIcon: ArtStub, artLabel: '猜你喜欢' });
    expect(wrapper.classes()).toContain('rail-card--flat');
    expect(wrapper.find('.rail-card__cover').exists()).toBe(false);

    // 左上角小胶囊角标：图标 + 文案
    const pill = wrapper.find('.rail-card__art-pill');
    expect(pill.exists()).toBe(true);
    expect(pill.find('.art-stub-icon').exists()).toBe(true);
    expect(pill.find('.rail-card__art-label').text()).toBe('猜你喜欢');

    expect(wrapper.find('.rail-card__title').text()).toBe('理解 Vue 响应式原理');
    expect(wrapper.find('.rail-card__summary').text()).toContain('依赖收集');

    // 标签最多 3 个（传 4 个只渲染 3 个）
    const badges = wrapper.findAll('.rail-card__tags .tag-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0].text()).toBe('Vue');

    // 作者：名字 + 头像图 + 作者主页链接（卡片内链接：作者 1 条 + 标签 3 条）
    expect(wrapper.find('.rail-card__author-name').text()).toBe('OY');
    expect(wrapper.find('.rail-card__author-avatar').attributes('src')).toBe('http://x/oy.png');
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(
      links.filter((l) => (l.props('to') as { name?: string }).name === 'user-profile')
    ).toHaveLength(1);

    // 数据行：浏览 1234 → 1.2k，点赞 567 → 567，阅读时长 8
    const meta = wrapper.find('.rail-card__meta').text();
    expect(meta).toContain('1.2k');
    expect(meta).toContain('567');
    expect(meta).toContain('8');
  });

  it('无封面缺摘要/标签/作者/数据时对应区块隐藏，仅剩标题 + 角标', () => {
    const wrapper = mountCard({ id: 'a2', title: '仅标题', artLabel: '趋势' });
    expect(wrapper.find('.rail-card__title').text()).toBe('仅标题');
    expect(wrapper.find('.rail-card__art-pill').exists()).toBe(true);
    expect(wrapper.find('.rail-card__summary').exists()).toBe(false);
    expect(wrapper.find('.rail-card__tags').exists()).toBe(false);
    expect(wrapper.find('.rail-card__meta').exists()).toBe(false);
  });

  it('尺寸 class：sm 默认，lg 可切换', () => {
    const sm = mountCard({ id: 'a', title: 't' });
    expect(sm.classes()).toContain('rail-card--sm');
    const lg = mountCard({ id: 'a', title: 't', size: 'lg' });
    expect(lg.classes()).toContain('rail-card--lg');
  });

  it('点击卡片跳转文章详情', async () => {
    const router = makeRouter();
    const push = vi.spyOn(router, 'push').mockResolvedValue();
    const wrapper = mountCard(base, router);
    await wrapper.find('.rail-card').trigger('click');
    await flushPromises();
    expect(push).toHaveBeenCalledWith({ name: 'article-detail', params: { id: 'a1' } });
  });
});