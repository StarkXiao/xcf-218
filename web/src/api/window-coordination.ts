import request from '@/utils/request'
import type { WindowHandling, QueueCall, WindowHandlingStats, DisplayCalls } from '@/types'

export const createWindowHandling = (data: {
  windowNumber: string
  userId: number
  serviceItemId: number
  applicantName?: string
  applicantIdCard?: string
  applicantPhone?: string
  formData?: string
  materials?: string
  handlerId?: number
}) => {
  return request.post<any, WindowHandling>('/window-coordination/handlings', data)
}

export const getWindowHandlings = (params?: {
  windowNumber?: string
  serviceItemId?: number
  status?: string
  date?: string
  userId?: number
}) => {
  return request.get<any, WindowHandling[]>('/window-coordination/handlings', { params })
}

export const getWindowHandlingStats = (date?: string) => {
  return request.get<any, WindowHandlingStats[]>('/window-coordination/handlings/stats', { params: { date } })
}

export const getQueueList = (params?: {
  windowNumber?: string
  serviceItemId?: number
}) => {
  return request.get<any, WindowHandling[]>('/window-coordination/handlings/queue', { params })
}

export const getWindowHandlingById = (id: number) => {
  return request.get<any, WindowHandling>(`/window-coordination/handlings/${id}`)
}

export const updateWindowHandlingStatus = (
  id: number,
  status: string,
  remark?: string,
  handlerId?: number
) => {
  return request.put<any, WindowHandling>(`/window-coordination/handlings/${id}/status`, { status, remark, handlerId })
}

export const syncWindowHandlingToOnline = (id: number, operatorId?: number) => {
  return request.put<any, WindowHandling>(`/window-coordination/handlings/${id}/sync`, { operatorId })
}

export const createQueueCall = (data: {
  windowNumber: string
  windowHandlingId?: number
  queueNumber?: string
  callerId?: number
}) => {
  return request.post<any, QueueCall>('/window-coordination/calls', data)
}

export const getQueueCalls = (params?: {
  windowNumber?: string
  status?: string
  date?: string
}) => {
  return request.get<any, QueueCall[]>('/window-coordination/calls', { params })
}

export const getRecentQueueCalls = (limit?: number) => {
  return request.get<any, QueueCall[]>('/window-coordination/calls/recent', { params: { limit } })
}

export const getDisplayCalls = () => {
  return request.get<any, DisplayCalls>('/window-coordination/calls/display')
}

export const updateQueueCallStatus = (id: number, status: string) => {
  return request.put<any, QueueCall>(`/window-coordination/calls/${id}/status`, { status })
}

export const recallQueueCall = (id: number, callerId?: number) => {
  return request.post<any, QueueCall>(`/window-coordination/calls/${id}/recall`, { callerId })
}

export const callNextQueue = (data: {
  windowNumber: string
  serviceItemId?: number
  callerId?: number
}) => {
  return request.post<any, QueueCall>('/window-coordination/calls/next', data)
}
