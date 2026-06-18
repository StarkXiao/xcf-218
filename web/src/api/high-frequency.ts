import request from '@/utils/request'
import type { HotItem, HotCategory, ServiceItem, HeatStatistics } from '@/types'

export const getHotItems = (userId?: number) => {
  return request.get<any, HotItem[]>('/high-frequency/items', { params: { userId } })
}

export const getBanners = (userId?: number) => {
  return request.get<any, HotItem[]>('/high-frequency/banners', { params: { userId } })
}

export const getQuickApplyItems = (userId?: number) => {
  return request.get<any, HotItem[]>('/high-frequency/quick-apply', { params: { userId } })
}

export const getHotCategories = () => {
  return request.get<any, HotCategory[]>('/high-frequency/categories')
}

export const getItemsByCategory = (categoryId: number, userId?: number) => {
  return request.get<any, HotItem[]>(`/high-frequency/category/${categoryId}`, { params: { userId } })
}

export const getHotRanking = (limit = 10, userId?: number) => {
  return request.get<any, ServiceItem[]>('/high-frequency/ranking', { params: { limit, userId } })
}

export const getHeatStatistics = (serviceItemId: number) => {
  return request.get<any, HeatStatistics>(`/high-frequency/heat-statistics/${serviceItemId}`)
}

export const incrementClickCount = (hotItemId: number) => {
  return request.put(`/high-frequency/click/${hotItemId}`)
}

export const getAdminHotCategories = () => {
  return request.get<any, HotCategory[]>('/high-frequency/admin/categories')
}

export const getAdminHotItems = (keyword?: string, categoryId?: number) => {
  return request.get<any, HotItem[]>('/high-frequency/admin/items', { params: { keyword, categoryId } })
}

export const getAvailableServiceItems = () => {
  return request.get<any, ServiceItem[]>('/high-frequency/admin/available-services')
}

export const getHotCategoryById = (id: number) => {
  return request.get<any, HotCategory>(`/high-frequency/admin/category/${id}`)
}

export const getHotItemById = (id: number) => {
  return request.get<any, HotItem>(`/high-frequency/admin/item/${id}`)
}

export const createHotCategory = (data: Partial<HotCategory>) => {
  return request.post('/high-frequency/admin/category', data)
}

export const updateHotCategory = (id: number, data: Partial<HotCategory>) => {
  return request.put(`/high-frequency/admin/category/${id}`, data)
}

export const deleteHotCategory = (id: number) => {
  return request.delete(`/high-frequency/admin/category/${id}`)
}

export const createHotItem = (data: Partial<HotItem>) => {
  return request.post('/high-frequency/admin/item', data)
}

export const updateHotItem = (id: number, data: Partial<HotItem>) => {
  return request.put(`/high-frequency/admin/item/${id}`, data)
}

export const deleteHotItem = (id: number) => {
  return request.delete(`/high-frequency/admin/item/${id}`)
}

export const toggleHotItemActive = (id: number, active: boolean) => {
  return request.put(`/high-frequency/admin/item/${id}/toggle-active`, { active })
}

export const updateHotItemSort = (id: number, sort: number) => {
  return request.put(`/high-frequency/admin/item/${id}/sort`, { sort })
}
