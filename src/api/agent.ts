import request from './request'
import type { Conversation, Message, SuggestedQuestion } from '../types/agent'

const BASE = '/api/agent-service'

/**
 * Get conversation list (paginated)
 *
 * axios 拦截器返回整个 Result 信封 {errCode, errMsg, isSuccess, data}，
 * 本端点 data 为 PageVo {data: Conversation[], total, currentPage, totalPages}
 */
export async function getConversations(pageNum = 1, pageSize = 20): Promise<{
  data?: { data: Conversation[]; total: number; currentPage: number; totalPages: number }
}> {
  return request.get(`${BASE}/conversations`, { params: { pageNum, pageSize } }) as any
}

/** Get conversation history messages */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const res = await request.get(`${BASE}/conversations/${conversationId}/messages`) as any
  return res.data ?? res
}

/** Delete a conversation */
export async function deleteConversation(id: string): Promise<void> {
  return request.delete(`${BASE}/conversations/${id}`) as any
}

/** Rename a conversation */
export async function renameConversation(id: string, title: string): Promise<void> {
  return request.patch(`${BASE}/conversations/${id}`, { title }) as any
}

/** Stop generating */
export async function stopGeneration(conversationId: string): Promise<void> {
  return request.post(`${BASE}/conversations/${conversationId}/stop`) as any
}

/** Get suggested questions */
export async function getSuggestedQuestions(): Promise<SuggestedQuestion[]> {
  const res = await request.get(`${BASE}/suggestions`) as any
  return res.data ?? res
}

/** Submit message feedback (like/dislike) */
export async function submitFeedback(
  messageId: string,
  feedback: 'like' | 'dislike'
): Promise<void> {
  return request.post(`${BASE}/messages/${messageId}/feedback`, { feedback }) as any
}
