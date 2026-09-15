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
    // 沿用上方 handler 的 as never 手法,让编译通过的同时运行时值仍为 false(草稿走后端)。
    cache: false as never,
    input: config.onInput,
    upload: {
      handler: config.onUpload as never,
    },
  };
}