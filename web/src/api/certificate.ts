import request from '@/utils/request'
import type { Certificate, CertificateDownloadRecord, RenewalInfo } from '@/types'

export const getCertificates = (userId?: number, status?: string) => {
  return request.get<any, Certificate[]>('/certificates', { params: { userId, status } })
}

export const getCertificateById = (id: number, userId?: number) => {
  return request.get<any, Certificate>(`/certificates/${id}`, { params: { userId } })
}

export const getAdminCertificates = (params: {
  keyword?: string
  status?: string
  archived?: boolean
  page?: number
  pageSize?: number
}) => {
  return request.get<any, { list: Certificate[]; total: number; page: number; pageSize: number }>('/certificates/admin', { params })
}

export const generateCertificate = (applicationId: number, operatorId: number) => {
  return request.post<any, Certificate>(`/certificates/${applicationId}/generate`, { operatorId })
}

export const downloadCertificate = (id: number, ownerUserId: number, operatorId: number) => {
  return `/api/certificates/${id}/download?ownerUserId=${ownerUserId}&operatorId=${operatorId}`
}

export const previewCertificate = (id: number, ownerUserId: number, operatorId: number) => {
  return `/api/certificates/${id}/preview?ownerUserId=${ownerUserId}&operatorId=${operatorId}`
}

export const getDownloadRecords = (certificateId: number, userId?: number) => {
  return request.get<any, CertificateDownloadRecord[]>(`/certificates/${certificateId}/download-records`, { params: { userId } })
}

export const archiveCertificate = (id: number, operatorId: number) => {
  return request.post<any, Certificate>(`/certificates/${id}/archive`, { operatorId })
}

export const unarchiveCertificate = (id: number, operatorId: number) => {
  return request.post<any, Certificate>(`/certificates/${id}/unarchive`, { operatorId })
}

export const getCertificateStatistics = () => {
  return request.get<any, { total: number; generated: number; archived: number; downloadCount: number }>('/certificates/statistics')
}

export const getCertificatesWithExpiryStatus = () => {
  return request.get<any, Certificate[]>('/certificates/my/with-expiry-status')
}

export const getRenewalInfo = (id: number) => {
  return request.get<any, RenewalInfo>(`/certificates/${id}/renewal-info`)
}

export const createRenewalApplication = (id: number, formData: any) => {
  return request.post<any, { id: number; applicationNo: string }>(`/certificates/${id}/renew`, { formData })
}
