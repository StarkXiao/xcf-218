import request from '@/utils/request'
import type { Evaluation, EvaluationStatistics } from '@/types'

export const createEvaluation = (data: {
  userId: number
  applicationId: number
  serviceItemId: number
  rating: number
  content?: string
  tags?: string
  anonymous?: boolean
}) => request.post<any, Evaluation>('/evaluations', data)

export const getEvaluations = (userId?: number, serviceItemId?: number) =>
  request.get<any, Evaluation[]>('/evaluations', { params: { userId, serviceItemId } })

export const getEvaluation = (id: number) =>
  request.get<any, Evaluation>(`/evaluations/${id}`)

export const getEvaluationStatistics = (serviceItemId?: number) =>
  request.get<any, EvaluationStatistics>('/evaluations/statistics', { params: { serviceItemId } })

export const replyEvaluation = (id: number, reply: string, replyBy: number) =>
  request.put<any, Evaluation>(`/evaluations/${id}/reply`, { reply, replyBy })
