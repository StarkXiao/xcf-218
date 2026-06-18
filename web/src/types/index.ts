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
