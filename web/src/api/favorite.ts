import request from '@/utils/request'
import type { Favorite } from '@/types'

export const toggleFavorite = (userId: number, serviceItemId: number) => {
  return request.post('/favorites/toggle', { userId, serviceItemId })
}

export const getFavorites = (userId: number) => {
  return request.get<Favorite[]>('/favorites', { params: { userId } })
}

export const checkFavorite = (userId: number, serviceItemId: number) => {
  return request.get<{ favorited: boolean }>('/favorites/check', { params: { userId, serviceItemId } })
}

export const getFavoriteCount = (serviceItemId: number) => {
  return request.get<number>(`/favorites/count/${serviceItemId}`)
}
