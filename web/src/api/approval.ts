import request from '@/utils/request'
import type {
  ApprovalFlow,
  ApprovalRecord,
  ApprovalTimelineNode,
  ApprovalCommentSummary,
  RejectableNode,
  User,
} from '@/types'

export const approvalApi = {
  getFlows: () => request.get<ApprovalFlow[]>('/api/approvals/flows'),

  getFlowById: (id: number) => request.get<ApprovalFlow>(`/api/approvals/flows/${id}`),

  getFlowByCode: (code: string) => request.get<ApprovalFlow>(`/api/approvals/flows/code/${code}`),

  startApproval: (data: { applicationId: number; flowCode: string; operatorId: number }) =>
    request.post<ApprovalRecord>('/api/approvals/start', data),

  processApproval: (data: {
    recordId: number
    approverId: number
    action: 'approve' | 'reject' | 'transfer'
    comment: string
    targetNodeId?: number
    transferToUserId?: number
  }) => request.post<ApprovalRecord>('/api/approvals/process', data),

  withdraw: (id: number, data: { operatorId: number; reason: string }) =>
    request.post<ApprovalRecord>(`/api/approvals/withdraw/${id}`, data),

  getRecord: (id: number) => request.get<ApprovalRecord>(`/api/approvals/records/${id}`),

  getRecordsByApplication: (applicationId: number) =>
    request.get<ApprovalRecord[]>(`/api/approvals/records/application/${applicationId}`),

  getPendingRecords: (params?: { approverId?: number; role?: string }) =>
    request.get<ApprovalRecord[]>('/api/approvals/pending', { params }),

  getTimeline: (applicationId: number) =>
    request.get<ApprovalTimelineNode[]>(`/api/approvals/timeline/${applicationId}`),

  getComments: (applicationId: number) =>
    request.get<ApprovalCommentSummary[]>(`/api/approvals/comments/${applicationId}`),

  getRejectableNodes: (applicationId: number) =>
    request.get<RejectableNode[]>(`/api/approvals/rejectable-nodes/${applicationId}`),

  getApproversByRole: (role: string) =>
    request.get<User[]>('/api/approvals/approvers', { params: { role } }),
}
