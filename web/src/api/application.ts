import request from '@/utils/request'
import type { Application } from '@/types'

export interface WithdrawRequest {
  applicationId: number
  userId: number
  reason: string
}

export interface WithdrawReviewRequest {
  withdrawalId: number
  reviewerId: number
  status: 'approved' | 'rejected'
  comment?: string
}

export interface ResubmitRequest {
  originalApplicationId: number
  userId: number
  formData: any
  materialsInfo: any[]
  retainedFileIds?: number[]
}

export interface WithdrawalRecord {
  id: number
  applicationId: number
  userId: number
  reason: string
  status: string
  reviewerId?: number
  reviewComment?: string
  reviewedAt?: string
  resubmitCount: number
  snapshot?: any
  createdAt: string
}

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

  requestWithdraw: (data: WithdrawRequest) =>
    request.post<any, { success: boolean; withdrawalId: number; message: string }>(
      '/applications/withdraw',
      data,
    ),

  reviewWithdraw: (data: WithdrawReviewRequest) =>
    request.post<any, { success: boolean; withdrawalId: number; status: string }>(
      '/applications/withdraw/review',
      data,
    ),

  resubmit: (formData: FormData) =>
    request.post<any, Application>('/applications/resubmit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  listPendingWithdrawals: () =>
    request.get<any, WithdrawalRecord[]>('/applications/withdrawals/pending'),

  getWithdrawalDetail: (id: number) =>
    request.get<any, WithdrawalRecord>(`/applications/withdrawals/${id}`),

  getWithdrawalRecords: (applicationId: number) =>
    request.get<any, WithdrawalRecord[]>(`/applications/${applicationId}/withdrawal-records`),

  canWithdraw: (applicationId: number, userId: number) =>
    request.get<any, { canWithdraw: boolean; reason: string }>(
      `/applications/${applicationId}/can-withdraw`,
      { params: { userId } },
    ),

  canResubmit: (applicationId: number, userId: number) =>
    request.get<any, { canResubmit: boolean; reason: string }>(
      `/applications/${applicationId}/can-resubmit`,
      { params: { userId } },
    ),
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

export const requestWithdraw = (data: WithdrawRequest) => {
  return request.post<any, { success: boolean; withdrawalId: number; message: string }>(
    '/applications/withdraw',
    data,
  )
}

export const reviewWithdraw = (data: WithdrawReviewRequest) => {
  return request.post<any, { success: boolean; withdrawalId: number; status: string }>(
    '/applications/withdraw/review',
    data,
  )
}

export const resubmitApplication = (formData: FormData) => {
  return request.post<any, Application>('/applications/resubmit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const listPendingWithdrawals = () => {
  return request.get<any, WithdrawalRecord[]>('/applications/withdrawals/pending')
}

export const getWithdrawalDetail = (id: number) => {
  return request.get<any, WithdrawalRecord>(`/applications/withdrawals/${id}`)
}

export const getWithdrawalRecords = (applicationId: number) => {
  return request.get<any, WithdrawalRecord[]>(`/applications/${applicationId}/withdrawal-records`)
}

export const canWithdraw = (applicationId: number, userId: number) => {
  return request.get<any, { canWithdraw: boolean; reason: string }>(
    `/applications/${applicationId}/can-withdraw`,
    { params: { userId } },
  )
}

export const canResubmit = (applicationId: number, userId: number) => {
  return request.get<any, { canResubmit: boolean; reason: string }>(
    `/applications/${applicationId}/can-resubmit`,
    { params: { userId } },
  )
}
