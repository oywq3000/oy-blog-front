# 写文章编辑器改造成 Obsidian 式实时预览 — 设计

日期:2026-09-15
状态:已确认(设计评审通过)

## 1. 背景与目标

当前 [ArticleEditor.vue](../../src/views/ArticleEditor.vue) 使用 `md-editor-v3` 的 `MdEditor`,是经典"左源码 + 右预览"分栏。md-editor-v3 本身**没有** IR/实时预览模式(其 `previewMode` 只有 `preview` / `editOnly` / `htmlOnly` 三态,`htmlOnly` 仅是只读预览),因此要达成 Obsidian Live Preview 体验必须更换编辑器实现。

改造目标(用户确认):
- 编辑手感改为 **Live Preview / IR 即时渲染**:行内格式(粗体/斜体/链接/图片)边写边渲染,块级标记(`#`、`-`、`>`、代码块)保留但弱化,光标进块可改原始语法
- 头部保留一个 **"源码 / 实时预览" 切换入口**,仿 Obsidian:默认实时渲染,可切到源码优先视图
- **后端数据契约零改动**:仍提交 `contentMd` + `contentHtml` 双字段

## 2. 选型结论

方案 A:**Vditor(v4.x)+ 封装组件**,在评审中选定。

- `vditor` 默认 `mode: 'ir'`(即时渲染)即 Obsidian Live Preview 体验,支持 `sv` 分屏源码模式、`setPreviewMode()` 编程切换
- 内置代码高亮(`highlight.js`)、图片上传回调、XSS 过滤、明暗主题
- Vue 3 集成方式:自封装薄组件(不依赖第三方 vue wrapper,避免维护风险)

被否决的方案:
- **Milkdown Crepe**:ProseMirror 系、Notion 风格全 WYSIWYG,与用户选择的 Live Preview 体验有偏差;包多、集成成本高
- **保留 md-editor-v3 魔改**:无 IR 内核,硬做成本极高,不可行

## 3. 架构概要

```
package.json  +vditor(^4.0.0)
src/components/MarkdownLiveEditor.vue   ← 新增,Vditor 薄封装
src/views/ArticleEditor.vue             ← 改,换掉 <MdEditor>
src/locales/zh.ts en.ts                 ← 增,切换按钮文案键
src/styles/markdown(样式变量)           ← 复用不删
```

后端接口、详情页展示([MarkdownViewer.vue](../../src/components/MarkdownViewer.vue))、草稿/发布/专栏/标签逻辑**均不动**。

## 4. 组件设计:MarkdownLiveEditor.vue

### Props / Events
- Prop `modelValue: string`(markdown);Prop `theme: 'light' | 'dark'`
- Event `update:modelValue`(markdown);Event `html-changed`(渲染后 HTML)
- 对外暴露 `setMode(mode: 'ir' | 'sv')`(经 `defineExpose`,父组件调用切模式)

### 初始化
```
new Vditor(el, {
  mode: 'ir',
  theme,
  placeholder,
  cache: false,          // 不用 vditor 本地缓存,草稿走后端
  upload: { handler(files) {...} },   // 见下方图片上传节
  preview: { markdown: { toc: true } }, // 保留代码高亮等默认能力
})
```

toolbar 采用 Vditor 默认项(覆盖常用 markdown 操作),实现时若有与本站交互冲突的项再按 `toolbarsExclude` 过滤。

### 数据流
- Vditor `input(value, vditor)` 回调 → `emit('update:modelValue', value)` + `emit('html-changed', vditor.getHTML())`
- 由此替代原 `@onHtmlChanged` 契约:ArticleEditor 侧 `contentHtml` ref 照常更新

### 图片上传
- `upload.handler(files)` 内复用现有 [handleUploadImage](../../src/views/ArticleEditor.vue) 同款逻辑:`prepareImageFiles` → `uploadContentImage`,成功后 `vditor.insertValue()` 插入图片 markdown
- 完全不重造 `imageUpload.ts` 前处理管线(1MB 上限降采样等策略沿用)

### 主题
- `watch(theme)` → `vditor.setTheme(theme === 'dark' ? 'dark' : 'classic')`
- 跟随 `useTheme` 的 `currentTheme` 响应式明暗切换

## 5. ArticleEditor.vue 改动

- `<MdEditor>` 整块替换为 `<MarkdownLiveEditor v-model="content" :theme="theme" @html-changed="...">`
- 头部新增"源码 / 实时预览"toggle 按钮,调用封装组件的 `setMode('ir' | 'sv')`
- 移除针对 md-editor 的 scoped 样式覆盖(`:deep(.md-editor-*)`、`.cm-scroller` 等),改为 Vditor 对应的极少量覆盖
- 其余(标题、发布弹窗、草稿、CTRL+S、编辑回显)不做逻辑改动

> 诚实约束:Vditor 无"纯源码单栏",`'sv'` 是"左源码 + 右预览"分屏。实现上弱化右侧预览,让其接近 Obsidian 源码视图形态。

## 6. i18n

- `editor` 段新增少量键(源码 / 实时预览的按钮文案或 title),zh.ts 与 en.ts **同步**新增
- 遵守既有仓库约束:消息不得含裸 `@`

## 7. 测试与验证

- Vditor 为重型 DOM 库,**封装组件不做 happy-dom 全量实例化测试**(与 repo 既有 happy-dom 陷阱经验一致)
- 新增/保留纯逻辑单测:图片上传 `handler` 组装插入 markdown 的逻辑(纯函数,可测)
- 回归:vitest 全量用 `--no-file-parallelism`;dev 手测明/暗主题、图片上传、源码/实时切换、编辑回显

## 8. 范围边界(刻意不改)

- 不碰后端;不碰 MarkdownViewer / 详情展示;不碰草稿/发布/专栏/标签逻辑
- 移动端 `<768px` 早退逻辑保持现状

## 9. 验证清单

- [ ] `npm install` 新增 vditor 后 `npm run dev` 无编译错误
- [ ] IR 实时预览编辑手感符合预期(粗体/列表/链接即时渲染)
- [ ] 头部 toggle 可在 实时 ↔ 源码 间切换
- [ ] 图片粘贴/拖拽上传可用,插入 markdown 正确
- [ ] 明暗主题跟随站点切换
- [ ] 编辑回显(打开已有文章)markdown 正确载入
- [ ] 保存/发布仍提交 contentMd + contentHtml,后端可用
- [ ] vitest( --no-file-parallelism )既有测试不回归