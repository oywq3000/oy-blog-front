import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ArticleRail from './ArticleRail.vue';

describe('ArticleRail 横滑轨道容器', () => {
  it('渲染标题插槽与轨道内容插槽；初始两侧箭头均禁用且有正确 aria 标签', () => {
    const wrapper = mount(ArticleRail, {
      props: { prevLabel: '向左滚动', nextLabel: '向右滚动', regionLabel: '正在暴涨' },
      slots: {
        title: '<h2 class="rail-test-title">正在暴涨</h2>',
        default: '<div class="rail-test-card">卡一</div>',
      },
    });
    expect(wrapper.find('.rail-test-title').text()).toBe('正在暴涨');
    expect(wrapper.find('.rail-test-card').text()).toBe('卡一');
    expect(wrapper.attributes('aria-label')).toBe('正在暴涨');

    const prev = wrapper.find('.rail-arrow--prev');
    const next = wrapper.find('.rail-arrow--next');
    expect(prev.attributes('aria-label')).toBe('向左滚动');
    expect(next.attributes('aria-label')).toBe('向右滚动');
    expect(prev.attributes('disabled')).toBeDefined();
    expect(next.attributes('disabled')).toBeDefined();
  });
});