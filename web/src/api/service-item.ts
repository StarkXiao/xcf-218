import request from '@/utils/request'
import type { ServiceItem } from '@/types'

export const getServiceItems = (keyword?: string, category?: string) => {
  return request.get<any, ServiceItem[]>('/service-items', { params: { keyword, category } })
}

export const getServiceItemById = (id: number) => {
  return request.get<any, ServiceItem>(`/service-items/${id}`)
}

export const getCategories = () => {
  return request.get<any, string[]>('/service-items/categories')
}
