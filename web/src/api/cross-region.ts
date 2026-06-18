import request from '@/utils/request'
import type {
  CrossRegionApplication,
  CrossRegionDepartment,
  CrossRegionProgressShare,
  CrossRegionMessageLog,
  JurisdictionCheckResult,
  CrossRegionStatistics,
} from '@/types'

export const crossRegionApi = {
  getDepartments: () =>
    request.get<any, CrossRegionDepartment[]>('/cross-region/departments'),

  checkJurisdiction: (serviceItemId: number, applicantLocation: string) =>
    request.get<any, JurisdictionCheckResult>('/cross-region/check-jurisdiction', {
      params: { serviceItemId, applicantLocation },
    }),

  createApplication: (formData: FormData) =>
    request.post<any, CrossRegionApplication>('/cross-region', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  verifyJurisdiction: (data: {
    crossRegionApplicationId: number
    verifierId: number
    passed: boolean
    reason?: string
  }) =>
    request.post<any, CrossRegionApplication>('/cross-region/verify-jurisdiction', data),

  switchDepartment: (data: {
    crossRegionApplicationId: number
    operatorId: number
    targetHandler: 'local' | 'remote'
    reason: string
  }) =>
    request.post<any, CrossRegionApplication>('/cross-region/switch-department', data),

  updateStatus: (id: number, status: string, comment?: string, operatorId?: number) =>
    request.put<any, CrossRegionApplication>(`/cross-region/${id}/status`, {
      status,
      comment,
      operatorId,
    }),

  getProgressShares: (id: number, viewerRole: string = 'all') =>
    request.get<any, CrossRegionProgressShare[]>(`/cross-region/${id}/progress`, {
      params: { viewerRole },
    }),

  getMessageLogs: (id: number) =>
    request.get<any, CrossRegionMessageLog[]>(`/cross-region/${id}/message-logs`),

  getMyApplications: (userId: number) =>
    request.get<any, CrossRegionApplication[]>('/cross-region/my', {
      params: { userId },
    }),

  getAllApplications: (params?: { status?: string; currentHandler?: string }) =>
    request.get<any, CrossRegionApplication[]>('/cross-region', { params }),

  getApplication: (id: number) =>
    request.get<any, CrossRegionApplication>(`/cross-region/${id}`),

  getStatistics: () =>
    request.get<any, CrossRegionStatistics>('/cross-region/statistics'),
}
