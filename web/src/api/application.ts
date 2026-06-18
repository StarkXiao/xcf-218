import request from '@/utils/request'
import type { Application } from '@/types'

export const applicationApi = {
  createApplication: (formData: FormData) =>
    request.post<any, Application>('/applications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getApplications: (userId?: number, status?: string) =>
    request.get<any, Application[]>('/applications', { params: { userId, status } }),

  getApplication: (id: number) =>
    request.get<any, Application>(`/applications/${id}`),

  updateApplicationStatus: (id: number, status: string, comment?: string, reviewerId?: number) =>
    request.put<any, Application>(`/applications/${id}/status`, { status, comment, reviewerId }),

  downloadMaterial: (fileId: number) => `/api/upload/download/${fileId}`,

  previewMaterial: (fileId: number) => `/api/upload/preview/${fileId}`,
}

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
