import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkillEditor from './SkillEditor.vue';

const mountSkillEditor = (skills: string[] = [], placeholder = '') =>
  mount(SkillEditor, {
    props: { modelValue: [...skills], placeholder },
  });

/** 最近一次 update:modelValue 载荷 */
const lastEmit = (wrapper: ReturnType<typeof mountSkillEditor>) => {
  const events = wrapper.emitted('update:modelValue') ?? [];
  return events[events.length - 1]?.[0] as string[] | undefined;
};

/** 输入并回车添加 */
const typeSkill = async (wrapper: ReturnType<typeof mountSkillEditor>, value: string) => {
  await wrapper.find('input').setValue(value);
  await wrapper.find('input').trigger('keydown.enter');
};

describe('SkillEditor 技能编辑器', () => {
  it('支持 placeholder 占位文案', () => {
    const wrapper = mountSkillEditor([], '输入技能名，回车添加');
    expect((wrapper.find('input').element as HTMLInputElement).placeholder).toBe('输入技能名，回车添加');
  });

  it('渲染已有技能为 chips（含品牌图标）', () => {
    const wrapper = mountSkillEditor(['Vue.js', 'Spring Boot']);
    const names = wrapper.findAll('.skill-chip__name').map((c) => c.text());
    expect(names).toEqual(['Vue.js', 'Spring Boot']);
    expect(wrapper.findAll('.skill-chip').every((c) => c.find('.tech-icon').exists())).toBe(true);
  });

  it('输入回车添加技能并清空输入框（trim）', async () => {
    const wrapper = mountSkillEditor(['Vue.js']);
    await typeSkill(wrapper, '   Spring Boot  ');

    expect(lastEmit(wrapper)).toEqual(['Vue.js', 'Spring Boot']);
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('');
  });

  it('空白输入不添加', async () => {
    const wrapper = mountSkillEditor();
    await typeSkill(wrapper, '   ');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('大小写不敏感去重：已存在同名义项时不重复添加', async () => {
    const wrapper = mountSkillEditor(['Vue.js']);
    await typeSkill(wrapper, 'vue.js');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('单条超过 30 字不添加', async () => {
    const wrapper = mountSkillEditor();
    await typeSkill(wrapper, 'a'.repeat(31));

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('达到 20 项上限时不接受新技能', async () => {
    const many = Array.from({ length: 20 }, (_, i) => `技能${i + 1}`);
    const wrapper = mountSkillEditor(many);
    await typeSkill(wrapper, '多出一个');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('点击 × 删除对应技能', async () => {
    const wrapper = mountSkillEditor(['A', 'B', 'C']);
    await wrapper.findAll('.skill-chip__remove')[1].trigger('click');

    expect(lastEmit(wrapper)).toEqual(['A', 'C']);
  });

  it('下移/上移按钮按序调整并列', async () => {
    const wrapper = mountSkillEditor(['A', 'B', 'C']);
    await wrapper.findAll('.skill-chip__down')[0].trigger('click');
    expect(lastEmit(wrapper)).toEqual(['B', 'A', 'C']);

    // 模拟父组件 v-model 回写后再操作（否则子组件仍读旧 props）
    await wrapper.setProps({ modelValue: lastEmit(wrapper) as string[] });
    await wrapper.findAll('.skill-chip__up')[2].trigger('click'); // 'C' 上移
    expect(lastEmit(wrapper)).toEqual(['B', 'C', 'A']);
  });

  it('首项不可上移、末项不可下移（越界 no-op）', async () => {
    const wrapper = mountSkillEditor(['A', 'B']);
    await wrapper.findAll('.skill-chip__up')[0].trigger('click');
    await wrapper.findAll('.skill-chip__down')[1].trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});