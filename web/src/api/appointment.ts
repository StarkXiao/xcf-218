import request from '@/utils/request'
import type { Appointment, AppointmentStats } from '@/types'

export const createAppointment = (data: {
  userId: number
  scheduleId: number
  remark?: string
}) => {
  return request.post<any, Appointment>('/appointments', data)
}

export const getAppointments = (params?: {
  userId?: number
  serviceItemId?: number
  date?: string
  status?: string
}) => {
  return request.get<any, Appointment[]>('/appointments', { params })
}

export const getAppointmentStats = (date: string) => {
  return request.get<any, AppointmentStats[]>('/appointments/stats', { params: { date } })
}

export const getAppointmentById = (id: number) => {
  return request.get<any, Appointment>(`/appointments/${id}`)
}

export const updateAppointmentStatus = (
  id: number,
  status: string,
  remark?: string,
  operatorId?: number
) => {
  return request.put<any, Appointment>(`/appointments/${id}/status`, { status, remark, operatorId })
}

export const linkAppointmentApplication = (
  appointmentId: number,
  applicationId: number
) => {
  return request.put<any, Appointment>(`/appointments/${appointmentId}/link-application`, { applicationId })
}

export const cancelAppointment = (id: number, userId: number, remark?: string) => {
  return request.post<any, Appointment>(`/appointments/${id}/cancel`, { userId, remark })
}
