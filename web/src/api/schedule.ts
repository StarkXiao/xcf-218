import request from '@/utils/request'
import type { Schedule } from '@/types'

export const createSchedule = (data: {
  serviceItemId: number
  date: string
  startTime: string
  endTime: string
  capacity: number
}) => {
  return request.post<any, Schedule>('/schedules', data)
}

export const batchCreateSchedules = (data: {
  serviceItemId: number
  startDate: string
  endDate: string
  timeSlots: { startTime: string; endTime: string; capacity: number }[]
  weekdays?: number[]
}) => {
  return request.post<any, Schedule[]>('/schedules/batch', data)
}

export const getSchedules = (params?: {
  serviceItemId?: number
  date?: string
  startDate?: string
  endDate?: string
  active?: boolean
}) => {
  return request.get<any, Schedule[]>('/schedules', { params })
}

export const getAvailableSchedules = (serviceItemId: number, date?: string) => {
  return request.get<any, Schedule[]>(`/schedules/available/${serviceItemId}`, { params: { date } })
}

export const getScheduleById = (id: number) => {
  return request.get<any, Schedule>(`/schedules/${id}`)
}

export const updateSchedule = (id: number, data: Partial<Schedule>) => {
  return request.put<any, Schedule>(`/schedules/${id}`, data)
}

export const deleteSchedule = (id: number) => {
  return request.delete<any, void>(`/schedules/${id}`)
}
