# 写文章编辑器改造成 Obsidian 式实时预览 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 [ArticleEditor.vue](../../src/views/ArticleEditor.vue) 的分栏 markdown 编辑器换成 Vditor IR 即时渲染(Live Preview),头部提供"源码 / 实时预览"切换,后端 contentMd + contentHtml 双字段契约不变。

**Architecture:** 新增 `vditor` 依赖 + 自封装薄组件 [MarkdownLiveEditor.vue](../../src/components/MarkdownLiveEditor.vue)(持有 Vditor 实例,对外 `v-model` / `html-changed` / `setMode`)。图片上传逻辑迁入组件内复用现成 `imageUpload.ts` 管线;ArticleEditor 只把 `<MdEditor>` 换成新组件并加头部切换按钮。详情展示侧 MarkdownViewer 不动。

**Tech Stack:** Vue 3.4(SFC + `<script setup>`)、Vite 5、Vditor ^4、marked(展示侧不受影响)、vitest/happy-dom(仅纯逻辑测试)。

**Spec:** `docs/superpowers/specs/2026-09-15-article-editor-live-preview-design.md`

## Global Constraints

- 后端零改动;仍提交 `contentMd` + `contentHtml`
- [MarkdownViewer.vue](../../src/components/MarkdownViewer.vue) / 详情展示不动;草稿 / 发布 / 专栏 / 标签逻辑不动
- 移动端 `<768px` 早退逻辑不动
- 项目消息文案禁含裸 `@`(见仓库记忆 vue-i18n)
- 组件不做 happy-dom 实例化测试(Vditor 为重型 DOM 库;本仓已有 happy-dom 陷阱经验)
- 全量 vitest 须用 `--no-file-parallelism`
- git 提交信息末尾附 `Co-Authored-By: Claude Code <noreply@anthropic.com>`

---

### Task 1: 图片插入 markdown 组装纯函数(含 TDD)

**Files:**
- Create: `src/utils/imageInsert.ts`
- Test: `src/utils/imageInsert.test.ts`

**Interfaces:**
- Consumes:(无外部依赖,纯函数)
- Produces: `buildImageInsertMarkdown(urls: string[]): string` —— 把上传返回的 URL 列表组装为 markdown 图片文本,`![]()` 每张一行,供 Vditor `insertValue` 使用。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { buildImageInsertMarkdown } from './imageInsert';

describe('buildImageInsertMarkdown', () => {
  it('将单个 url 组装成图片 markdown 行', () => {
    expect(buildImageInsertMarkdown(['https://cdn.example.com/a.png']))
      .toBe('![](https://cdn.example.com/a.png)');
  });

  it('多个 url 每张一行、换行拼接', () => {
    expect(buildImageInsertMarkdown([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.webp',
    ])).toBe('![](https://cdn.example.com/a.png)\n![](https://cdn.example.com/b.webp)');
  });

  it('空列表返回空字符串(不产生多余换行)', () => {
    expect(buildImageInsertMarkdown([])).toBe('');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/imageInsert.test.ts --no-file-parallelism`
Expected: FAIL("Cannot find module './imageInsert'")

- [ ] **Step 3: 写最小实现**

```ts
/**
 * 把上传返回的图片 URL 列表组装成 markdown 图片片段(每张一行)。
 * 供编辑器上传成功后 insertValue 使用;空列表返回空串。
 */
export function buildImageInsertMarkdown(urls: string[]): string {
  return urls.map((url) => `![](${url})`).join('\n');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/imageInsert.test.ts --no-file-parallelism`
Expected: PASS(3 tests)

- [ ] **Step 5: 提交**

```bash
git add src/utils/imageInsert.ts src/utils/imageInsert.test.ts
git commit -m "feat: 编辑器图片上传的 markdown 插入组装纯函数

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: 新增 MarkdownLiveEditor.vue(Vditor 薄封装)

**Files:**
- Modify: `package.json`(dependencies + `vditor`)
- Create: `src/components/vditorOptions.ts`
- Test: `src/components/vditorOptions.test.ts`
- Create: `src/components/MarkdownLiveEditor.vue`
- Modify: `vite.config.ts`(manualChunks 给 vditor 分包)

**Interfaces:**
- Consumes:
  - Task 1: `buildImageInsertMarkdown(urls)` from `src/utils/imageInsert`
  - 现有:`CONTENT_IMAGE_POLICY, imageIssueMessageKey, prepareImageFiles` from `src/utils/imageUpload`;`uploadContentImage` from `src/api/upload`;`useToast` from `src/composables/useToast`
- Produces:
  - `src/components/vditorOptions.ts`:`buildVditorOptions(config): VditorOptions`(工厂,不实例化 Vditor,可被 happy-dom 单测)
  - `MarkdownLiveEditor.vue`:Props `modelValue: string`、`theme: 'light' | 'dark'`、`placeholder?: string`;Emits `update:modelValue`、`html-changed`;暴露方法 `setMode(mode: 'ir' | 'sv')`
  - 后续 Task 3 依赖:`<MarkdownLiveEditor v-model="content" :theme="theme" :placeholder="..." @html-changed="...">` + ref 实例的 `setMode('ir' | 'sv')`

- [ ] **Step 1: 安装 vditor 依赖**

```bash
npm install vditor@^4
```

Expected:package.json dependencies 出现 `"vditor": "^4.x.x"`

- [ ] **Step 2: 写失败测试(选项工厂的纯逻辑)**

```ts
import { describe, it, expect, vi } from 'vitest';
import { buildVditorOptions } from './vditorOptions';

describe('buildVditorOptions', () => {
  it('透传 mode/theme/placeholder/初始值', () => {
    const opts = buildVditorOptions({
      mode: 'ir',
      theme: 'dark',
      placeholder: '请输入内容',
      initialValue: '# 标题',
      onInput: () => {},
      onUpload: async () => {},
    });
    expect(opts.mode).toBe('ir');
    expect(opts.theme).toBe('dark');
    expect(opts.placeholder).toBe('请输入内容');
    expect(opts.value).toBe('# 标题');
  });

  it('关闭本地缓存(草稿走后端而非 vditor storage)', () => {
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput: () => {}, onUpload: async () => {},
    });
    expect(opts.cache).toBe(false);
  });

  it('把 onInput/onUpload 挂到 input 与 upload.handler', () => {
    const onInput = vi.fn();
    const onUpload = vi.fn();
    const opts = buildVditorOptions({
      mode: 'ir', theme: 'classic', placeholder: '', initialValue: '',
      onInput, onUpload,
    });
    expect(opts.input).toBe(onInput);
    expect(opts.upload?.handler).toBe(onUpload);
  });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/components/vditorOptions.test.ts --no-file-parallelism`
Expected: FAIL("Cannot find module './vditorOptions'")

- [ ] **Step 4: 写最小实现(过滤器工厂)**

```ts
/**
 * Vditor 选项工厂:把组件配置聚合成 Vditor options。
 * 独立成纯函数便于 happy-dom 单测(不实例化 Vditor 自身)。
 * 用 import type 避免在测试/运行时引入 vditor 模块顶层副作用。
 */
import type Vditor from 'vditor';

type VditorOptions = ConstructorParameters<typeof Vditor>[1];

export interface BuildVditorConfig {
  mode: 'ir' | 'sv' | 'wysiwyg';
  theme: 'classic' | 'dark' | 'current';
  placeholder: string;
  initialValue: string;
  onInput: (value: string) => void;
  onUpload: (files: File[]) => void | Promise<void>;
}

export function buildVditorOptions(config: BuildVditorConfig): VditorOptions {
  return {
    mode: config.mode,
    theme: config.theme,
    placeholder: config.placeholder,
    value: config.initialValue,
    cache: false, // 草稿走后端,不启用 vditor localStorage
    input: config.onInput,
    upload: {
      handler: config.onUpload as never,
    },
  };
}
```

> 重要:若 `import type Vditor from 'vditor'` 报"vditor 无默认类型导出",则改用命名空间导入:
> `import type * as VditorModule from 'vditor'` 并把上面类型改为如下(二选一,以 vue-tsc 类型推断为准):
> `type VditorOptions = NonNullable<ConstructorParameters<typeof VditorModule.default>[1]>;`
> 若 vditor 未携带 d.ts,则先在 `src/types/vditor.d.ts` 添加最小声明:
> `declare module 'vditor' { const Vditor: any; export default Vditor; }`
> (测试不依赖类型,以上均不影响 Step 5 测试通过。)

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/components/vditorOptions.test.ts --no-file-parallelism`
Expected: PASS(3 tests)

- [ ] **Step 6: 新建 MarkdownLiveEditor.vue(组件主体)**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { buildVditorOptions } from './vditorOptions';
import { buildImageInsertMarkdown } from '../utils/imageInsert';
import {
  CONTENT_IMAGE_POLICY,
  imageIssueMessageKey,
  prepareImageFiles,
} from '../utils/imageUpload';
import { uploadContentImage } from '../api/upload';
import { useToast } from '../composables/useToast';

const props = withDefaults(defineProps<{
  modelValue: string;
  theme: 'light' | 'dark';
  placeholder?: string;
}>(), {
  placeholder: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'html-changed', html: string): void;
}>();

const { t } = useI18n();
const { addToast } = useToast();
const editorEl = ref<HTMLElement | null>(null);
let vditor: Vditor | null = null;

/** 正文图上传:复用既有 imageUpload 前处理管线(1MB 上限降采样等),成功后插入图片 markdown */
const handleUpload = async (files: File[]) => {
  const prepared = await prepareImageFiles(files, CONTENT_IMAGE_POLICY);
  prepared.issues.forEach((issue) => addToast(t(imageIssueMessageKey(issue)), 'warning'));
  if (prepared.files.length === 0) return;
  const results = await Promise.all(prepared.files.map((file) => uploadContentImage(file)));
  const urls = results.filter((r) => r.isSuccess).map((r) => r.data);
  if (urls.length && vditor) {
    vditor.insertValue(`${buildImageInsertMarkdown(urls)}\n`);
  }
};

onMounted(() => {
  if (!editorEl.value) return;
  vditor = new Vditor(editorEl.value, buildVditorOptions({
    mode: 'ir',
    theme: props.theme === 'dark' ? 'dark' : 'classic',
    placeholder: props.placeholder,
    initialValue: props.modelValue,
    onInput: (value: string) => {
      emit('update:modelValue', value);
      if (vditor) emit('html-changed', vditor.getHTML());
    },
    onUpload: handleUpload,
  }));
});

// 外部回填(如编辑回显、AI 写稿):值不同才 setValue,避免与内部 input 回环
watch(() => props.modelValue, (val) => {
  if (vditor && val !== vditor.getValue()) {
    vditor.setValue(val);
  }
});

watch(() => props.theme, (next) => {
  vditor?.setTheme(next === 'dark' ? 'dark' : 'classic');
});

onBeforeUnmount(() => {
  vditor?.destroy();
  vditor = null;
});

/** by 父组件调用:实时预览(ir)↔ 源码分屏(sv) */
function setMode(mode: 'ir' | 'sv') {
  if (vditor) vditor.setPreviewMode(mode);
}
defineExpose({ setMode });
</script>

<template>
  <div ref="editorEl" class="markdown-live-editor"></div>
</template>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use '../styles/markdown' as *;

.markdown-live-editor {
  height: 100%;
  min-height: 0;

  // 透明底 + 无边框,沿用编辑器区的玻璃拟态观感
  :deep(.vditor),
  :deep(.vditor-toolbar) {
    border: none;
    background: transparent;
  }

  :deep(.vditor) {
    height: 100%;
  }

  // 内容排版复用全站 markdown 样式,保证与详情页渲染观感一致
  :deep(.vditor-content) {
    @include markdown-styles;
  }
}
</style>
```

- [ ] **Step 7: vite.config 给 vditor 单独分包(避免打进默认 vendor)**

在 `vite.config.ts` 的 `manualChunks(id)` 函数内、`md-editor-v3` 分支下面加一行:

```ts
if (id.includes('node_modules/vditor')) return 'vditor'
```

(保持与已有函数式 manualChunks 风格一致;`chunkSizeWarningLimit: 1000` 已在上方,无需改动。)

- [ ] **Step 8: 类型与单元测试验证**

Run: `npx vue-tsc -b --noEmit`
Expected: 无类型错误

Run: `npx vitest run src/components/vditorOptions.test.ts src/utils/imageInsert.test.ts --no-file-parallelism`
Expected: PASS

> 注:组件自身不做 happy-dom 实例化测试(规格明确);下面的手测项由 Task 3 完成后一并执行。

- [ ] **Step 9: 提交**

```bash
git add package.json package-lock.json src/components/vditorOptions.ts src/components/vditorOptions.test.ts src/components/MarkdownLiveEditor.vue vite.config.ts
git commit -m "feat: 新增 Vditor IR 即时渲染编辑器组件 MarkdownLiveEditor

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: ArticleEditor.vue 接入新编辑器 + 源码/实时切换 + i18n

**Files:**
- Modify: `src/views/ArticleEditor.vue`
- Modify: `src/locales/zh.ts`(editor 段)
- Modify: `src/locales/en.ts`(editor 段)

**Interfaces:**
- Consumes: Task 2 的 `MarkdownLiveEditor`(props `modelValue` / `theme` / `placeholder`,事件 `html-changed`,方法 `setMode`)
- Produces:(无对外新接口,文章保存/发布 payload 不变)

- [ ] **Step 1: 改 import 与 remove 掉 md-editor 相关**

在 [ArticleEditor.vue](../../src/views/ArticleEditor.vue) 顶部:

```ts
// 删除这两行:
// import { MdEditor } from 'md-editor-v3';
// import 'md-editor-v3/lib/style.css';

// 替换为:
import MarkdownLiveEditor from '../components/MarkdownLiveEditor.vue';
```

同时确认 `import { uploadCover } from '../api/upload';` 保留(封面仍走 uploadCover);正文图 `handleUploadImage` 函数(约 344-360 行)整体删除 —— 上传职责已迁入组件内。

- [ ] **Step 2: 加编辑模式状态与切换函数**

在 `contentHtml` ref 定义附近新增:

```ts
// 编辑器模式:即时渲染(ir)为默认,源码分屏(sv)可由头部按钮切换
const editMode = ref<'ir' | 'sv'>('ir');
const markdownEditor = ref<InstanceType<typeof MarkdownLiveEditor> | null>(null);

const toggleEditMode = () => {
  editMode.value = editMode.value === 'ir' ? 'sv' : 'ir';
  markdownEditor.value?.setMode(editMode.value);
};
```

- [ ] **Step 3: 模板换组件**

把模板中整个 `<main class="editor-main">` 里的 `<MdEditor ... />` 块(约 446-462 行)替换为:

```vue
      <div class="editor-wrapper">
        <MarkdownLiveEditor
          ref="markdownEditor"
          v-model="content"
          :theme="theme"
          :placeholder="t('editor.requiredContent')"
          @html-changed="handleHtmlChanged"
        />
      </div>
```

`theme` 来自现有 `const { theme } = useTheme();`(已是 computed ref,无需改)。

- [ ] **Step 4: 头部加"源码 / 实时预览"切换按钮**

在 `.header-right` 内、设置(齿轮)按钮之前插入:

```vue
        <button
          class="icon-btn"
          @click="toggleEditMode"
          :title="editMode === 'ir' ? t('editor.sourceView') : t('editor.livePreview')"
        >
          <svg v-if="editMode === 'ir'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 10 22 12 18 14"></polyline>
            <polyline points="6 10 2 12 6 14"></polyline>
            <path d="M13.5 4 10.5 20"></path>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
```

- [ ] **Step 5: 清理 md-editor 专属 scoped 样式**

在 `<style lang="scss" scoped>` 中删除 `.editor-wrapper` 块内所有 `:deep(.md-editor-*)`、`.cm-scroller`、`.md-editor-input-wrapper` 相关规则,保留 `.editor-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }` 布局骨架。新组件有自己的内部样式(见 Task 2),此处只留布局。

- [ ] **Step 6: 补 i18n 键**

zh.ts `editor` 段(约 289 行 `columnLoadRetry: '点击重试',` 之后)末尾加:

```ts
    sourceView: '源码',
    livePreview: '实时预览',
```

en.ts `editor` 段(与 zh.ts 对应位置,`draftSaved: 'Draft saved',` 之后的其它键之后)末尾加:

```ts
    sourceView: 'Source',
    livePreview: 'Live preview',
```

(校验:不会加入裸 `@`,满足仓库约束;en/zh 同步新增,无单测裂。)

- [ ] **Step 7: 类型与回归验证**

Run: `npx vue-tsc -b --noEmit`
Expected: 无类型错误

Run: `npx vitest run --no-file-parallelism`
Expected: 既有测试全部通过,无新增失败

- [ ] **Step 8: 手测清单(dev)**

Run: `npm run dev`,在浏览器打开写文章页:

- [ ] IR 模式输入粗体 / 列表 / 链接 / 代码块,行内格式实时渲染,块级标记以 mini-marker 弱化显示(Obsidian 手感)
- [ ] 头部切换按钮在"源码 / 实时预览"间切换,图标与 title 随之变化
- [ ] 拖拽 / 粘贴一张图,提示上传并插入 `![](url)`,预览可见图片
- [ ] 站点明暗主题切换,编辑器字体 / 背景 / 代码高亮跟随
- [ ] 打开已有文章(编辑回显),markdown 正确载入,无内容丢失
- [ ] 保存草稿 / 发布仍成功,后端收到 contentMd + contentHtml(可在 dev 网络面板确认 payload)
- [ ] 移动端(<768px)页面不报错,行为与改造前一致

- [ ] **Step 9: 提交**

```bash
git add src/views/ArticleEditor.vue src/locales/zh.ts src/locales/en.ts
git commit -m "feat: 写文章编辑器接入 Vditor 即时渲染并加源码切换入口

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: 最终验证与收尾

**Files:**
- (无新文件;执行验证)

**Interfaces:**
- Consumes: Task 2、Task 3 产物

- [ ] **Step 1: 全量测试**

Run: `npx vitest run --no-file-parallelism`
Expected: 全部通过(含 Task 1/2 新增两个测试文件)

- [ ] **Step 2: 生产级类型构建**

Run: `npx vue-tsc -b --noEmit`
Expected: 无错误

- [ ] **Step 3: 生产构建**

Run: `npx vite build`
Expected: 成功;产物中出现 vditor 独立 chunk(`vditor-*.js` / `vditor-*.css`),无 chunk 超限警告

- [ ] **Step 4: 对照 spec 验证清单逐项勾选**

对照 `docs/superpowers/specs/2026-09-15-article-editor-live-preview-design.md` 第 9 节逐项确认全绿。

- [ ] **Step 5: 若验证通过,下一步进入合并评审**

由执行者调用 superpowers:requesting-code-review 或按项目分支策略收尾。