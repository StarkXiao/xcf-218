import request from '@/utils/request'
import type { ServiceItem } from '@/types'

export const getServiceItems = (keyword?: string, category?: string, userId?: number) => {
  return request.get<any, ServiceItem[]>('/service-items', { params: { keyword, category, userId } })
}

export const getServiceItemById = (id: number, userId?: number) => {
  return request.get<any, ServiceItem>(`/service-items/${id}`, { params: { userId } })
}

export const getCategories = () => {
  return request.get<any, string[]>('/service-items/categories')
}

export const getRecommendedItems = (userId?: number, limit?: number) => {
  return request.get<any, ServiceItem[]>('/service-items/recommended', { params: { userId, limit } })
}

export const createServiceItem = (data: Partial<ServiceItem>) => {
  return request.post('/service-items', data)
}

export const updateServiceItem = (id: number, data: Partial<ServiceItem>) => {
  return request.put(`/service-items/${id}`, data)
}

export const publishServiceItem = (id: number, adminId: number) => {
  return request.put(`/service-items/${id}/publish`, { adminId })
}

export const unpublishServiceItem = (id: number) => {
  return request.put(`/service-items/${id}/unpublish`)
}

export const toggleRecommend = (id: number, recommended: boolean) => {
  return request.put(`/service-items/${id}/recommend`, { recommended })
}

export const getAdminServiceItems = (keyword?: string, category?: string) => {
  return request.get<any, ServiceItem[]>('/service-items/admin/all', { params: { keyword, category } })
}

export const deleteServiceItem = (id: number) => {
  return request.delete(`/service-items/${id}`)
}
