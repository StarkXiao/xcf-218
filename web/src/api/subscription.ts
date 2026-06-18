import request from '@/utils/request'
import type { Subscription } from '@/types'

export const toggleSubscription = (
  userId: number,
  serviceItemId: number,
  notifyOnUpdate?: boolean,
  notifyOnStatusChange?: boolean,
) => {
  return request.post('/subscriptions/toggle', { userId, serviceItemId, notifyOnUpdate, notifyOnStatusChange })
}

export const getSubscriptions = (userId: number) => {
  return request.get<Subscription[]>('/subscriptions', { params: { userId } })
}

export const checkSubscription = (userId: number, serviceItemId: number) => {
  return request.get<{ subscribed: boolean; notifyOnUpdate: boolean; notifyOnStatusChange: boolean }>('/subscriptions/check', {
    params: { userId, serviceItemId },
  })
}
