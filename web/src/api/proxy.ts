import request from '@/utils/request'
import type { ProxyApplication, ProxyRelation, ProxyStatistics, ProxyProgressRecord } from '@/types'

export const createProxyApplication = (formData: FormData) => {
  return request.post<any, ProxyApplication>('/proxy/applications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const getMyProxyApplications = (principalId: number) => {
  return request.get<any, ProxyApplication[]>('/proxy/applications/mine', {
    params: { principalId },
  })
}

export const getAllProxyApplications = (status?: string) => {
  return request.get<any, ProxyApplication[]>('/proxy/applications', {
    params: { status },
  })
}

export const getProxyApplicationById = (id: number) => {
  return request.get<any, ProxyApplication>(`/proxy/applications/${id}`)
}

export const reviewProxyApplication = (
  id: number,
  action: 'approve' | 'reject' | 'reviewing',
  comment: string,
  reviewerId: number
) => {
  return request.post<any, ProxyApplication>(`/proxy/applications/${id}/review`, {
    action,
    comment,
    reviewerId,
  })
}

export const getProxyRelations = (principalId: number) => {
  return request.get<any, ProxyRelation[]>('/proxy/relations', {
    params: { principalId },
  })
}

export const getMyPrincipals = (proxyId: number) => {
  return request.get<any, ProxyRelation[]>('/proxy/relations/mine', {
    params: { proxyId },
  })
}

export const deactivateProxyRelation = (id: number, principalId: number) => {
  return request.put<any, { success: boolean }>(`/proxy/relations/${id}/deactivate`, {
    principalId,
  })
}

export const getProxyProgressRecords = (id: number) => {
  return request.get<any, ProxyProgressRecord[]>(`/proxy/applications/${id}/progress`)
}

export const getProxyStatistics = () => {
  return request.get<any, ProxyStatistics>('/proxy/statistics')
}

export const getProxyFileUrl = (filename: string) => {
  return `/api/upload/proxy/${filename}`
}
