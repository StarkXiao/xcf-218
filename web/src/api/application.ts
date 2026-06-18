import request from '@/utils/request'
import type { Application } from '@/types'

export const createApplication = (data: {
  userId: number
  serviceItemId: number
  formData: any
  materials?: any[]
}) => {
  return request.post<any, Application>('/applications', data)
}

export const getApplications = (userId?: number, status?: string) => {
  return request.get<any, Application[]>('/applications', { params: { userId, status } })
}

export const getApplicationById = (id: number) => {
  return request.get<any, Application>(`/applications/${id}`)
}

export const updateApplicationStatus = (
  id: number,
  status: string,
  comment?: string,
  reviewerId?: number
) => {
  return request.put<any, Application>(`/applications/${id}/status`, { status, comment, reviewerId })
}
