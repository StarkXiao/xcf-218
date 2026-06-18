import request from '@/utils/request'
import type {
  JointApplication,
  JointApprovalSummary,
  JointMaterialStats,
  ServiceItem,
} from '@/types'

export const jointApplicationApi = {
  getAvailableItems: () =>
    request.get<any, ServiceItem[]>('/joint-applications/available-items'),

  createJointApplication: (formData: FormData) =>
    request.post<any, JointApplication>('/joint-applications', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getJointApplications: (userId?: number, status?: string) =>
    request.get<any, JointApplication[]>('/joint-applications', {
      params: { userId, status },
    }),

  getJointApplication: (id: number) =>
    request.get<any, JointApplication>(`/joint-applications/${id}`),

  getApprovalSummary: (id: number) =>
    request.get<any, JointApprovalSummary>(`/joint-applications/${id}/summary`),

  getMaterialStats: (id: number) =>
    request.get<any, JointMaterialStats>(`/joint-applications/${id}/material-stats`),

  syncSubApplicationStatus: (applicationId: number) =>
    request.put<any, JointApplication>(`/joint-applications/sync/${applicationId}`),
}

export const createJointApplication = (formData: FormData) => {
  return request.post<any, JointApplication>('/joint-applications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const getJointApplications = (userId?: number, status?: string) => {
  return request.get<any, JointApplication[]>('/joint-applications', {
    params: { userId, status },
  })
}

export const getJointApplicationById = (id: number) => {
  return request.get<any, JointApplication>(`/joint-applications/${id}`)
}

export const getJointApprovalSummary = (id: number) => {
  return request.get<any, JointApprovalSummary>(`/joint-applications/${id}/summary`)
}

export const getJointMaterialStats = (id: number) => {
  return request.get<any, JointMaterialStats>(`/joint-applications/${id}/material-stats`)
}

export const getAvailableJointItems = () => {
  return request.get<any, ServiceItem[]>('/joint-applications/available-items')
}
