import request from '@/utils/request'
import type { Complaint, ComplaintStatistics, Callback } from '@/types'

export const createComplaint = (data: {
  userId: number
  applicationId?: number
  serviceItemId?: number
  type: string
  title: string
  content: string
}) => request.post<any, Complaint>('/complaints', data)

export const getComplaints = (userId?: number, status?: string, type?: string) =>
  request.get<any, Complaint[]>('/complaints', { params: { userId, status, type } })

export const getComplaint = (id: number) =>
  request.get<any, Complaint>(`/complaints/${id}`)

export const handleComplaint = (id: number, status: string, handlerId: number, handleResult: string) =>
  request.put<any, Complaint>(`/complaints/${id}/handle`, { status, handlerId, handleResult })

export const addCallback = (id: number, data: {
  adminId: number
  callbackType: string
  content: string
  satisfaction?: number
  callbackAt: string
}) => request.post<any, Complaint>(`/complaints/${id}/callbacks`, data)

export const getComplaintStatistics = () =>
  request.get<any, ComplaintStatistics>('/complaints/statistics')
