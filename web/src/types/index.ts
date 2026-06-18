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
  applicationCount?: number
  publishStatus?: string
  publishedBy?: number
  changeLog?: string
  isFavorited?: boolean
  isSubscribed?: boolean
  rank?: number
  heatScore?: number
  faqs?: string
  handlingExamples?: string
  riskTips?: string
  createdAt?: string
  updatedAt?: string
}

export interface FaqItem {
  question: string
  answer: string
  sort?: number
}

export interface HandlingExample {
  title: string
  description: string
  scenario: string
  steps: string[]
  result: string
  sort?: number
}

export interface RiskTip {
  level: 'low' | 'medium' | 'high'
  title: string
  content: string
  sort?: number
}

export interface HotCategory {
  id: number
  name: string
  code: string
  icon?: string
  sort: number
  active: boolean
  description?: string
  hotItems?: HotItem[]
  createdAt?: string
  updatedAt?: string
}

export interface HotItem {
  id: number
  serviceItemId: number
  serviceItem?: ServiceItem
  categoryId?: number
  category?: HotCategory
  sort: number
  active: boolean
  isBanner: boolean
  isQuickApply: boolean
  bannerImage?: string
  bannerTitle?: string
  bannerSubtitle?: string
  quickApplyTips?: string
  clickCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface HeatStatistics {
  totalApplications: number
  totalFavorites: number
  totalSubscriptions: number
  totalViews: number
  totalClicks: number
  heatScore: number
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

export interface WithdrawalRecord {
  id: number
  applicationId: number
  userId: number
  user?: User
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewerId?: number
  reviewComment?: string
  reviewedAt?: string
  resubmitCount: number
  snapshot?: any
  application?: Application
  createdAt: string
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
  statusLabel?: string
  reviewerId?: number
  reviewComment?: string
  originalApplicationId?: number
  withdrawalCount: number
  resubmitCount: number
  lastWithdrawnAt?: string
  isResubmit: boolean
  progressRecords?: ProgressRecord[]
  withdrawalRecords?: WithdrawalRecord[]
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
  reminderType?: string
  applicationId?: number
  appointmentId?: number
  serviceItemId?: number
  windowHandlingId?: number
  approvalRecordId?: number
  oldStatus?: string
  newStatus?: string
  pendingHours?: number
  createdAt: string
}

export interface TimeoutPendingItem {
  recordId: number
  applicationId: number
  applicationNo: string
  serviceItemName: string
  applicantName: string
  currentNodeName: string
  approverId: number
  approverName: string
  pendingHours: number
  createdAt: string
}

export interface TodoItemBase {
  applicationId: number
  applicationNo: string
  serviceItemName: string
  applicantName: string
  createdAt: string
}

export interface SubmittedTodoItem extends TodoItemBase {}

export interface ApprovalTodoItem extends TodoItemBase {
  recordId: number
  currentNodeName: string
  approverName: string
}

export interface WithdrawalTodoItem extends TodoItemBase {
  withdrawalId: number
  reason: string
}

export interface SupplementTodoItem extends TodoItemBase {
  supplementId: number
  operatorName: string
  rejectReason: string
}

export interface AdminTodoAggregation {
  submittedCount: number
  submittedItems: SubmittedTodoItem[]
  approvalCount: number
  approvalItems: ApprovalTodoItem[]
  withdrawalCount: number
  withdrawalItems: WithdrawalTodoItem[]
  supplementCount: number
  supplementItems: SupplementTodoItem[]
  timeoutPendingCount: number
  timeoutPendingItems: TimeoutPendingItem[]
  pendingByNode: Record<string, number>
  totalPending: number
}

export interface Statistics {
  totalApplications: number
  pendingCount: number
  acceptedCount: number
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

export interface JointMaterialInfo {
  name: string
  required: boolean
  fieldName: string
  isShared?: boolean
  serviceItemIds?: number[]
}

export interface JointSubApplicationData {
  serviceItemId: number
  formData: Record<string, any>
  materialsInfo: JointMaterialInfo[]
  sortOrder?: number
}

export interface JointSubApplication {
  id: number
  jointApplicationId: number
  serviceItemId: number
  serviceItem?: ServiceItem
  applicationId?: number
  application?: Application
  splitStatus: string
  status: string
  formData?: any
  reviewComment?: string
  completedAt?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface JointMaterialRelation {
  id: number
  jointApplicationId: number
  materialFileId: number
  materialFile?: MaterialFile
  materialName: string
  fieldName: string
  isShared: boolean
  usedByServiceItemIds: number[]
  usedByApplicationIds: number[]
  reuseCount?: number
  createdAt: string
}

export interface JointApplication {
  id: number
  jointApplicationNo: string
  userId: number
  user?: User
  title: string
  formData: any
  status: string
  totalItems: number
  approvedItems: number
  rejectedItems: number
  processingItems: number
  summary?: string
  reviewerId?: number
  reviewComment?: string
  subApplications: JointSubApplication[]
  materialRelations?: JointMaterialRelation[]
  createdAt: string
  updatedAt: string
}

export interface JointApprovalSummaryItem {
  subApplicationId: number
  applicationId: number
  applicationNo?: string
  serviceItemId: number
  serviceItemName: string
  status: string
  reviewComment?: string
  completedAt?: string
}

export interface JointApprovalSummary {
  jointApplicationId: number
  total: number
  approved: number
  rejected: number
  processing: number
  pending: number
  items: JointApprovalSummaryItem[]
}

export interface JointMaterialStats {
  jointApplicationId: number
  totalMaterials: number
  sharedMaterials: number
  totalReusedTimes: number
  savedUploads: number
  details: Array<{
    id: number
    materialName: string
    fieldName: string
    isShared: boolean
    usedByServiceItemIds: number[]
    usedByApplicationIds: number[]
    reuseCount: number
  }>
}

export interface CrossRegionDepartment {
  id: number
  name: string
  code: string
  region: string
  contactPhone?: string
  address?: string
  active: boolean
  supportedServiceCodes?: string
  createdAt: string
  updatedAt: string
}

export interface CrossRegionApplication {
  id: number
  crossRegionNo: string
  userId: number
  user?: User
  serviceItemId: number
  serviceItem?: ServiceItem
  applicationId?: number
  application?: Application
  localDepartmentId: number
  localDepartment?: CrossRegionDepartment
  remoteDepartmentId: number
  remoteDepartment?: CrossRegionDepartment
  currentHandler: 'local' | 'remote'
  currentHandlerLabel: string
  status: string
  statusLabel: string
  formData: any
  materials: any[]
  applicantLocation?: string
  jurisdictionVerifyStatus: string
  jurisdictionVerifyResult?: any
  verifiedAt?: string
  verifiedBy?: number
  verifier?: User
  departmentSwitchCount: number
  departmentSwitchLog: Array<{
    from: string
    to: string
    operatorId: number
    reason: string
    switchedAt: string
  }>
  localReviewerId?: number
  localReviewer?: User
  remoteReviewerId?: number
  remoteReviewer?: User
  reviewComment?: string
  progressShared: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CrossRegionProgressShare {
  id: number
  crossRegionApplicationId: number
  step: string
  status: string
  remark: string
  operatorId: number
  operator?: User
  fromDepartmentId: number
  fromDepartment?: CrossRegionDepartment
  toDepartmentId: number
  toDepartment?: CrossRegionDepartment
  visibleToApplicant: boolean
  visibleToLocal: boolean
  visibleToRemote: boolean
  createdAt: string
}

export interface CrossRegionMessageLog {
  id: number
  crossRegionApplicationId: number
  targetRole: string
  targetUserId?: number
  targetUser?: User
  targetDepartmentId?: number
  targetDepartment?: CrossRegionDepartment
  title: string
  content: string
  messageType: string
  sent: boolean
  sentAt?: string
  createdAt: string
}

export interface JurisdictionCheckResult {
  serviceItemId: number
  serviceItemName: string
  applicantLocation: string
  isLocalAvailable: boolean
  isRemoteAvailable: boolean
  needsCrossRegion: boolean
  localDepartments: Array<{ id: number; name: string; region: string }>
  remoteDepartments: Array<{ id: number; name: string; region: string }>
}

export interface CrossRegionStatistics {
  total: number
  pendingVerify: number
  pendingAccept: number
  processingLocal: number
  processingRemote: number
  approved: number
  rejected: number
  completed: number
  verifyFailed: number
  byLocalDept: Record<string, number>
  byRemoteDept: Record<string, number>
  switchCount: number
}

export interface ValidationError {
  fieldName: string
  fieldLabel: string
  errorType: 'missing' | 'invalid_type' | 'size_exceeded' | 'pattern_mismatch' | 'custom_rule'
  message: string
  severity: 'error' | 'warning'
}

export interface PreviewResult {
  passed: boolean
  totalErrors: number
  totalWarnings: number
  errors: ValidationError[]
  missingMaterials: ValidationError[]
  summary: string
}

export interface MaterialPreviewRule {
  id: number
  serviceItemId: number
  materialTemplateId?: number
  fieldName: string
  fieldLabel: string
  required: boolean
  allowedFileTypes: string[]
  maxFileSize: number
  validationPattern: string
  validationMessage: string
  customRule: string
  enabled: boolean
  sortOrder: number
  createdBy?: number
  createdAt: string
  updatedAt: string
}

export interface VersionDiffField {
  field: string
  label: string
  oldValue: any
  newValue: any
  changed: boolean
}

export interface VersionDiff {
  v1: MaterialFile | null
  v2: MaterialFile | null
  fields: VersionDiffField[]
  changed: boolean
  canPreview: boolean
}
