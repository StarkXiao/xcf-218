import request from '@/utils/request'
import type { ProgressRecord } from '@/types'

export const getProgressByApplicationId = (applicationId: number) => {
  return request.get<any, ProgressRecord[]>(`/progress/application/${applicationId}`)
}
