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
}

export interface Material {
  name: string
  required: boolean
  uploaded?: boolean
  file?: File
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
  createdAt: string
}

export interface Statistics {
  totalApplications: number
  pendingCount: number
  reviewingCount: number
  approvedCount: number
  rejectedCount: number
  completedCount: number
  userCount: number
  itemCount: number
}
