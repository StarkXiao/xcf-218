import request from '@/utils/request'
import type { Message, TimeoutPendingItem, AdminTodoAggregation } from '@/types'

export const getMessages = (userId: number, type?: string, reminderType?: string) => {
  return request.get<any, Message[]>('/messages', {
    params: { userId, type, reminderType },
  })
}

export const getUnreadCount = (userId: number) => {
  return request.get<any, number>('/messages/unread-count', { params: { userId } })
}

export const getUnreadReminderCount = (userId: number) => {
  return request.get<any, number>('/messages/unread-reminder-count', { params: { userId } })
}

export const markAsRead = (id: number) => {
  return request.put<any, { success: boolean }>(`/messages/${id}/read`)
}

export const markAllAsRead = (userId: number) => {
  return request.put<any, { success: boolean }>('/messages/read-all', { params: { userId } })
}

export const getTimeoutPending = (hours?: number) => {
  return request.get<any, TimeoutPendingItem[]>('/messages/timeout-pending', {
    params: hours ? { hours } : {},
  })
}

export const getAdminTodos = () => {
  return request.get<any, AdminTodoAggregation>('/messages/admin-todos')
}

export const sendTimeoutReminder = (recordId: number, senderId: number) => {
  return request.post<any, { success: boolean; message: string }>(
    `/messages/remind-approver/${recordId}`,
    { senderId },
  )
}

export const sendStatusChangeNotification = (data: {
  userId: number
  applicationId: number
  oldStatus: string
  newStatus: string
  applicationNo: string
  serviceItemName?: string
  comment?: string
}) => {
  return request.post<any, { success: boolean }>('/messages/status-change', data)
}
