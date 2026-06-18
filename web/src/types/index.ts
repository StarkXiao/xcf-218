export interface User {
  id: number
  username: string
  name: string
  idCard: string
  phone: string
  role: string
  createdAt?: string
}

export interface ServiceItem {
  id: number
  name: string
  code: string
  category: string
  description: string
  requirements: string
  materials: string
  processingDays: number
  active: boolean
  recommended?: boolean
  viewCount?: number
  favoriteCount?: number
  subscriptionCount?: number
  publishStatus?: string
  publishedBy?: number
  changeLog?: string
  isFavorited?: boolean
  isSubscribed?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Favorite {
  id: number
  userId: number
  serviceItemId: number
  serviceItem?: ServiceItem
  active: boolean
  createdAt: string
}

export interface Subscription {
  id: number
  userId: number
  serviceItemId: number
  serviceItem?: ServiceItem
  notifyOnUpdate: boolean
  notifyOnStatusChange: boolean
  active: boolean
  createdAt: string
}

export interface MaterialFile {
  id: number
  applicationId: number
  materialName: string
  fieldName: string
  originalName: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  required: boolean
  version: number
  isCurrent: boolean
  status: string
  uploaderId?: number
  rejectReason?: string
  createdAt: string
}

export interface SupplementRecord {
  id: number
  applicationId: number
  operatorId: number
  operator?: User
  rejectReason: string
  rejectedMaterials: Array<{ fieldName: string; materialName: string; reason: string }>
  status: string
  supplementTime?: string
  application?: Application
  currentFiles?: MaterialFile[]
  createdAt: string
  updatedAt: string
}

export interface Application {
  id: number
  applicationNo: string
  userId: number
  serviceItemId: number
  serviceItem?: ServiceItem
  user?: User
  formData: any
  materials: any[]
  materialFiles: MaterialFile[]
  status: string
  reviewerId?: number
  reviewComment?: string
  progressRecords?: ProgressRecord[]
  createdAt: string
  updatedAt: string
}

export interface ProgressRecord {
  id: number
  applicationId: number
  step: string
  status: string
  remark: string
  operatorId?: number
  createdAt: string
}

export interface Message {
  id: number
  userId: number
  title: string
  content: string
  read: boolean
  type: string
  applicationId?: number
  appointmentId?: number
  serviceItemId?: number
  windowHandlingId?: number
  createdAt: string
}

export interface Statistics {
  totalApplications: number
  pendingCount: number
  reviewingCount: number
  approvedCount: number
  rejectedCount: number
  completedCount: number
  supplementingCount: number
  userCount: number
  itemCount: number
}

export interface Schedule {
  id: number
  serviceItemId: number
  serviceItem?: ServiceItem
  date: string
  startTime: string
  endTime: string
  capacity: number
  bookedCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: number
  appointmentNo: string
  userId: number
  user?: User
  serviceItemId: number
  serviceItem?: ServiceItem
  scheduleId: number
  schedule?: Schedule
  appointmentDate: string
  startTime: string
  endTime: string
  queueNumber: string
  status: string
  applicationId?: number
  application?: Application
  remark?: string
  checkInTime?: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentStats {
  serviceItemId: number
  serviceItemName: string
  total: number
  pending: number
  checked_in: number
  completed: number
  cancelled: number
  no_show: number
}

export interface ProxyApplication {
  id: number
  applicationNo: string
  principalId: number
  principal?: User
  proxyName: string
  proxyIdCard: string
  proxyPhone: string
  proxyRelation?: string
  authorizationScope: string
  idCardFrontPath?: string
  idCardBackPath?: string
  authorizationLetterPath?: string
  status: string
  reviewerId?: number
  reviewComment?: string
  riskLevel: number
  riskTips: string[]
  progressRecords?: ProxyProgressRecord[]
  createdAt: string
  updatedAt: string
}

export interface ProxyProgressRecord {
  id: number
  proxyApplicationId: number
  step: string
  status: string
  remark: string
  operatorId?: number
  createdAt: string
}

export interface ProxyRelation {
  id: number
  principalId: number
  principal?: User
  proxyId: number
  proxy?: User
  proxyRelation?: string
  authorizationScope: string
  isActive: boolean
  sourceApplicationId?: number
  createdAt: string
  updatedAt: string
}

export interface ProxyStatistics {
  totalApplications: number
  submittedCount: number
  reviewingCount: number
  approvedCount: number
  rejectedCount: number
  activeRelations: number
  highRiskCount: number
}

export interface Certificate {
  id: number
  certificateNo: string
  userId: number
  user?: User
  applicationId: number
  application?: Application
  serviceItemId: number
  serviceItem?: ServiceItem
  certificateType: string
  certificateData: string
  certificateContent?: string
  filePath?: string
  fileName?: string
  status: string
  issuedBy?: number
  issuedAt?: string
  expiredAt?: string
  archived: boolean
  archivedAt?: string
  archivedBy?: number
  downloadRecords?: CertificateDownloadRecord[]
  createdAt: string
  updatedAt: string
  expiryStatus?: string
  daysToExpiry?: number
}

export interface CertificateReminder {
  id: number
  userId: number
  user?: User
  certificateId: number
  certificate?: Certificate
  serviceItemId?: number
  serviceItem?: ServiceItem
  expiredAt: string
  reminderType: string
  daysBeforeExpiry: number
  notified: boolean
  notifiedAt?: string
  renewalInitiated: boolean
  renewalInitiatedAt?: string
  messageId?: number
  remark?: string
  createdAt: string
}

export interface RenewalInfo {
  certificate: {
    id: number
    certificateNo: string
    certificateType: string
    expiredAt?: string
    issuedAt?: string
  }
  renewalServiceItem?: ServiceItem
  prefilledFormData: any
  reminders: CertificateReminder[]
}

export interface CertificateDownloadRecord {
  id: number
  certificateId: number
  certificate?: Certificate
  userId: number
  user?: User
  action: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface WindowHandling {
  id: number
  handlingNo: string
  windowNumber: string
  userId: number
  user?: User
  serviceItemId: number
  serviceItem?: ServiceItem
  applicationId?: number
  application?: Application
  queueNumber: string
  applicantName?: string
  applicantIdCard?: string
  applicantPhone?: string
  formData?: string
  materials?: string
  status: string
  handlerId?: number
  handler?: User
  handlingRemark?: string
  acceptedAt?: string
  processingAt?: string
  completedAt?: string
  syncStatus?: string
  syncRemark?: string
  createdAt: string
  updatedAt: string
}

export interface QueueCall {
  id: number
  callNo: string
  queueNumber: string
  windowNumber: string
  windowHandlingId?: number
  windowHandling?: WindowHandling
  userId?: number
  user?: User
  serviceItemId?: number
  serviceItem?: ServiceItem
  applicantName?: string
  status: string
  callCount: number
  callerId?: number
  caller?: User
  calledAt?: string
  arrivedAt?: string
  missedAt?: string
  createdAt: string
}

export interface WindowHandlingStats {
  serviceItemId: number
  serviceItemName: string
  total: number
  accepted: number
  processing: number
  completed: number
  cancelled: number
  synced: number
}

export interface DisplayCalls {
  calling: QueueCall[]
  waiting: WindowHandling[]
  completed: QueueCall[]
}

export interface ApprovalFlow {
  id: number
  code: string
  name: string
  description: string
  serviceItemId?: number
  isActive: boolean
  nodes: ApprovalNode[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalNode {
  id: number
  flowId: number
  nodeName: string
  nodeOrder: number
  role: string
  department?: string
  description?: string
  allowReject: boolean
  allowTransfer: boolean
  isFinal: boolean
  createdAt: string
  updatedAt: string
}

export interface ApprovalRecord {
  id: number
  applicationId: number
  application?: Application
  flowId: number
  currentNodeId: number
  currentNode?: ApprovalNode
  approverId?: number
  approver?: User
  status: 'pending' | 'approved' | 'rejected' | 'transferred' | 'withdrawn'
  comment?: string
  approvedAt?: string
  comments?: ApprovalComment[]
  createdAt: string
  updatedAt: string
}

export interface ApprovalComment {
  id: number
  recordId: number
  nodeId: number
  node?: ApprovalNode
  commenterId: number
  commenter?: User
  action: 'approve' | 'reject' | 'transfer' | 'withdraw' | 'comment'
  content: string
  targetNodeId?: number
  transferredToUserId?: number
  createdAt: string
}

export interface ApprovalTimelineNode {
  nodeId: number
  nodeName: string
  nodeOrder: number
  role: string
  department?: string
  status: 'pending' | 'current' | 'completed' | 'rejected' | 'skipped'
  approver?: { id: number; name: string }
  approvedAt?: string
  comment?: string
  createdAt?: string
}

export interface ApprovalCommentSummary {
  id: number
  nodeName: string
  commenterName: string
  action: string
  content: string
  createdAt: string
}

export interface RejectableNode {
  nodeId: number
  nodeName: string
  nodeOrder: number
}

export interface TemplateFieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file'
  required: boolean
  placeholder?: string
  maxLength?: number
  pattern?: string
  patternMessage?: string
  options?: string[]
  allowedFileTypes?: string[]
  maxFileSize?: number
  defaultValue?: string
}

export interface MaterialTemplate {
  id: number
  name: string
  description?: string
  serviceItemId: number
  serviceItem?: ServiceItem
  version: number
  isActive: boolean
  isCurrent: boolean
  fields: TemplateFieldDef[]
  changeLog?: string
  createdBy?: number
  createdAt: string
  updatedAt: string
}

export interface Evaluation {
  id: number
  userId: number
  user?: User
  applicationId: number
  application?: Application
  serviceItemId: number
  serviceItem?: ServiceItem
  rating: number
  content?: string
  tags: string[]
  anonymous: boolean
  reply?: string
  replyBy?: number
  replyUser?: User
  replyAt?: string
  createdAt: string
  updatedAt: string
}

export interface EvaluationStatistics {
  totalCount: number
  avgRating: number
  ratingDistribution: Record<number, number>
  tagCount: Record<string, number>
  byServiceItem: Array<{
    serviceItemId: number
    serviceItemName: string
    avgRating: number
    count: number
  }>
  recentEvaluations: Array<{
    id: number
    rating: number
    content: string
    anonymous: number
    userName: string
    serviceItemName: string
    createdAt: string
  }>
}

export interface Complaint {
  id: number
  complaintNo: string
  userId: number
  user?: User
  applicationId?: number
  application?: Application
  serviceItemId?: number
  serviceItem?: ServiceItem
  type: string
  title: string
  content: string
  status: string
  handlerId?: number
  handler?: User
  handleResult?: string
  handleAt?: string
  callbacks?: Callback[]
  createdAt: string
  updatedAt: string
}

export interface Callback {
  id: number
  complaintId: number
  adminId: number
  admin?: User
  callbackType: string
  content: string
  satisfaction?: number
  callbackAt: string
  createdAt: string
  updatedAt: string
}

export interface ComplaintStatistics {
  totalCount: number
  pendingCount: number
  processingCount: number
  resolvedCount: number
  rejectedCount: number
  typeCount: Record<string, number>
  byServiceItem: Array<{
    serviceItemId: number
    serviceItemName: string
    count: number
    avgSatisfaction: number
  }>
  callbackCount: number
  avgSatisfaction: number
}
