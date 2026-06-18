import request from '@/utils/request'
import type { Application } from '@/types'

export const createApplication = (formData: FormData) => {
  return request.post<any, Application>('/applications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
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

export const downloadMaterial = (fileId: number) => {
  return `/api/upload/download/${fileId}`
}

export const previewMaterial = (fileId: number) => {
  return `/api/upload/preview/${fileId}`
}
