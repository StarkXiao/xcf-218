import request from '@/utils/request'
import type { Message } from '@/types'

export const getMessages = (userId: number) => {
  return request.get<any, Message[]>('/messages', { params: { userId } })
}

export const getUnreadCount = (userId: number) => {
  return request.get<any, number>('/messages/unread-count', { params: { userId } })
}

export const markAsRead = (id: number) => {
  return request.put<any, { success: boolean }>(`/messages/${id}/read`)
}

export const markAllAsRead = (userId: number) => {
  return request.put<any, { success: boolean }>('/messages/read-all', { params: { userId } })
}
