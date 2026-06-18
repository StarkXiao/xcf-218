import request from '@/utils/request'
import type { SupplementRecord, MaterialFile } from '@/types'

export interface RejectMaterialItem {
  fieldName: string
  materialName: string
  reason: string
}

export const rejectMaterials = (
  applicationId: number,
  operatorId: number,
  rejectReason: string,
  rejectedMaterials: RejectMaterialItem[]
) => {
  return request.post<any, SupplementRecord>('/supplement-center/reject', {
    applicationId,
    operatorId,
    rejectReason,
    rejectedMaterials,
  })
}

export const getUserSupplementList = (userId: number) => {
  return request.get<any, SupplementRecord[]>('/supplement-center/user', { params: { userId } })
}

export const getAdminSupplementList = () => {
  return request.get<any, SupplementRecord[]>('/supplement-center/admin')
}

export const getSupplementDetail = (id: number) => {
  return request.get<any, SupplementRecord>(`/supplement-center/${id}`)
}

export const getSupplementByApplicationId = (applicationId: number) => {
  return request.get<any, SupplementRecord[]>(`/supplement-center/application/${applicationId}`)
}

export const uploadSupplementMaterial = (
  supplementId: number,
  fieldName: string,
  materialName: string,
  file: File,
  uploaderId: number,
  required: boolean
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fieldName', fieldName)
  formData.append('materialName', materialName)
  formData.append('uploaderId', String(uploaderId))
  formData.append('required', String(required))
  return request.post<any, SupplementRecord>(`/supplement-center/upload/${supplementId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getMaterialVersions = (applicationId: number, fieldName: string) => {
  return request.get<any, MaterialFile[]>(`/supplement-center/versions/${applicationId}/${fieldName}`)
}

export const getRejectedMaterials = (applicationId: number) => {
  return request.get<any, MaterialFile[]>(`/supplement-center/rejected/${applicationId}`)
}
