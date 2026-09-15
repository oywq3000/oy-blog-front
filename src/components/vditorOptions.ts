/**
 * Vditor 选项工厂:把组件配置聚合成 Vditor options。
 * 独立成纯函数便于 happy-dom 单测(不实例化 Vditor 自身)。
 * 用 import type 避免在测试/运行时引入 vditor 模块顶层副作用。
 */
import type Vditor from 'vditor';

// vditor 的构造函数签名是 `(id, options?: IOptions)`,第 2 参含 `| undefined`;
// NonNullable 收窄后工厂返回类型与测试里的 `opts.*` 都不再可能是 undefined。
type VditorOptions = NonNullable<ConstructorParameters<typeof Vditor>[1]>;

export interface BuildVditorConfig {
  mode: 'ir' | 'sv' | 'wysiwyg';
  theme: 'classic' | 'dark' | 'current';
  placeholder: string;
  initialValue: string;
  /** 静态本地化文案对象:vditor 初始化时若有 i18n 会直接走 `window.VditorI18n = i18n; init()`,
   *  不再从 CDN 拉 i18n 脚本(离线初始化修复的关键)。 */
  i18n?: Record<string, string>;
  /** Lute 引擎本地资源地址(vite `?url` 打包产物),避免 init 时从 CDN 加载 lute.min.js。 */
  _lutePath?: string;
  /** 图标:传空串 '' 关闭 vditor 内部的 CDN 图标同步 XHR(图标已在组件内静态注入)。 */
  icon?: string;
  onInput: (value: string) => void;
  onUpload: (files: File[]) => void | Promise<void>;
}

export function buildVditorOptions(config: BuildVditorConfig): VditorOptions {
  return {
    mode: config.mode,
    // vditor 的 IOptions.theme 只声明 'classic' | 'dark';工厂保留更宽的 'current' 约定,
    // 组件实际只会传 classic/dark,运行时透传原值,这里收窄到 vditor 接受的合法值域。
    theme: config.theme as 'classic' | 'dark',
    placeholder: config.placeholder,
    value: config.initialValue,
    // vditor 的 IOptions.cache 声明为对象类型(带 enable/id),但运行期支持布尔关闭;
    // 沿用下方 as never 手法,让编译通过的同时运行时值仍为 false(草稿走后端)。
    cache: false as never,
    // 默认 'auto' 会在 init 时写成 vditor.element.style.height = "auto"(index.js:7084),
    // 内联样式优先级高于任何 CSS,把 scoped 的 height:100% 顶掉 → 编辑区随行数变长而非
    // 撑满.改 '100%' 让 inline 也成百分比,相对 .editor-wrapper(flex:1 高度确定)闭合;
    // 高度确定后 .vditor-content/.vditor-ir 内部 flex 自适应滚动。
    height: '100%',
    // 全屏层级:vditor 默认 .vditor--fullscreen z-index 90,站点头部 NavBar 是 100,
    // 全屏时工具条被 topbar 遮住;提到超过 NavBar 的层级(站点 NavBar z-index 100)。
    fullscreen: {
      index: 101,
    },
    // IOptions.i18n 是具名对象类型 ITips(全必填键),Config 侧保留更宽的 Record 约定;
    // 运行时透传原对象(组件传静态 zhCN),as never 仅用于让编译通过。
    i18n: config.i18n as never,
    // IOptions._lutePath 就是该字段名(dist/types/index.d.ts:695),string 直通无需收窄。
    _lutePath: config._lutePath,
    // IOptions.icon 只收 'ant' | 'material' 字面量;组件传 '' 关闭 CDN 图标加载,
    // 仍保持 Config 侧 string 约定,运行时值原样透传。
    icon: config.icon as never,
    input: config.onInput,
    upload: {
      handler: config.onUpload as never,
    },
  };
}