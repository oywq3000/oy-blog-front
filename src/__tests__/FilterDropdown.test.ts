import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterDropdown from '../components/FilterDropdown.vue'

const options = [
  { value: 'all', label: '全部' },
  { value: 'ai_reviewing', label: 'AI 审核中' },
  { value: 'pending_review', label: '待人工审核' },
  { value: 'rejected', label: '已驳回' },
]

function mountDropdown(modelValue = 'all') {
  return mount(FilterDropdown, {
    props: { modelValue, options },
    attachTo: document.body,
  })
}

describe('FilterDropdown', () => {
  it('触发器展示当前选中项的 label', () => {
    const wrapper = mountDropdown('pending_review')
    expect(wrapper.get('.filter-dropdown__trigger').text()).toContain('待人工审核')
  })

  it('未匹配 modelValue 时展示 placeholder', () => {
    const wrapper = mount(FilterDropdown, {
      props: { modelValue: 'nope', options, placeholder: '筛选' },
    })
    expect(wrapper.get('.filter-dropdown__trigger').text()).toContain('筛选')
  })

  it('点击触发器展开菜单', async () => {
    const wrapper = mountDropdown()
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(false)
    await wrapper.get('.filter-dropdown__trigger').trigger('click')
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(true)
    expect(wrapper.get('.filter-dropdown__trigger').attributes('aria-expanded')).toBe('true')
  })

  it('点击选项 emit update:modelValue + change 并关闭', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('.filter-dropdown__trigger').trigger('click')
    await wrapper.findAll('.filter-dropdown__item')[2].trigger('click') // pending_review
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['pending_review'])
    expect(wrapper.emitted('change')![0]).toEqual(['pending_review'])
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(false)
  })

  it('点击外部关闭菜单', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('.filter-dropdown__trigger').trigger('click')
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(true)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(false)
  })

  it('Escape 关闭并聚焦回触发器', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('.filter-dropdown__trigger').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.filter-dropdown__menu').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('.filter-dropdown__trigger').element)
  })

  it('选中项带 selected 类与 aria-selected', async () => {
    const wrapper = mountDropdown('rejected')
    await wrapper.get('.filter-dropdown__trigger').trigger('click')
    const items = wrapper.findAll('.filter-dropdown__item')
    expect(items[3].classes()).toContain('filter-dropdown__item--selected')
    expect(items[3].attributes('aria-selected')).toBe('true')
    expect(items[1].attributes('aria-selected')).toBe('false')
  })
})
