// 页面外框（Footer 等）可见性控制。
// 聊天页（/agent）是整屏应用页，消息在内部滚动，
// Footer 渲染会让 body 始终多出高度、页面永远可整体滚动。
const FULLSCREEN_ROUTES = ['agent', 'agent-conversation']

export function shouldShowFooter(routeName: unknown): boolean {
  return !FULLSCREEN_ROUTES.includes(routeName as string)
}
