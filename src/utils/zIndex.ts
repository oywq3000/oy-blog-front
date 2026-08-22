/**
 * 全局层级规范。
 *
 * 气泡提示必须高于所有模态层（AuthModalShell 遮罩为 z-index: 9999），
 * 并且 Toast 组件已 Teleport 到 <body>，脱离 .app-content 的
 * z-index:1 层叠上下文 —— 两者缺一不可，否则弹窗会盖住报错气泡。
 */
export const TOAST_Z_INDEX = 100000;
