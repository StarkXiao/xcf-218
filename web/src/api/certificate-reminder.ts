import request from '@/utils/request'
import type { CertificateReminder, RenewalInfo, ServiceItem } from '@/types'

export const getMyReminders = (params?: {
  status?: string
  page?: number
  pageSize?: number
}) => {
  return request.get<any, { list: CertificateReminder[]; total: number; page: number; pageSize: number }>(
    '/certificate-reminders/my',
    { params }
  )
}

export const getReminderById = (id: number) => {
  return request.get<any, CertificateReminder>(`/certificate-reminders/${id}`)
}

export const initiateRenewal = (id: number) => {
  return request.post<any, { success: boolean; alreadyInitiated: boolean; reminder: CertificateReminder }>(
    `/certificate-reminders/${id}/initiate-renewal`
  )
}

export const getRenewalItems = (certificateId: number) => {
  return request.get<any, { primary?: ServiceItem; related: ServiceItem[]; certificate: any }>(
    `/certificate-reminders/${certificateId}/renewal-items`
  )
}

export const getExpiringCertificates = (params?: {
  days?: number
  page?: number
  pageSize?: number
}) => {
  return request.get<any, { list: any[]; total: number; page: number; pageSize: number }>(
    '/certificate-reminders/admin/expiring',
    { params }
  )
}

export const triggerCheck = () => {
  return request.post<any, { scanned: number; notified: number }>(
    '/certificate-reminders/admin/trigger-check'
  )
}

export const getReminderStatistics = () => {
  return request.get<any, {
    totalReminders: number
    pendingRenewal: number
    completedRenewal: number
    expiringCount: number
    expiredCount: number
  }>('/certificate-reminders/admin/statistics')
}
