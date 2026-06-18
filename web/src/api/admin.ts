import request from '@/utils/request'
import type { Statistics } from '@/types'

export const getStatistics = () => {
  return request.get<any, Statistics>('/admin/statistics')
}

export const reviewApplication = (
  id: number,
  action: 'accept' | 'approve' | 'reject' | 'reviewing' | 'complete',
  comment: string,
  reviewerId: number
) => {
  return request.post<any, any>(`/admin/applications/${id}/review`, { action, comment, reviewerId })
}
