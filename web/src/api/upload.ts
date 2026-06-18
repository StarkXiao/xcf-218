import request from '@/utils/request'
import type { MaterialFile, VersionDiff } from '@/types'

export interface FileStats {
  total: number
  currentCount: number
  rejectedCount: number
  requiredCount: number
  optionalCount: number
  totalSize: number
  hasMultipleVersions: boolean
  versionsByField: Record<string, number>
}

export const uploadApi = {
  getFiles: (applicationId: number) =>
    request.get<any, MaterialFile[]>(`/upload/files/${applicationId}`),

  getCurrentFiles: (applicationId: number) =>
    request.get<any, MaterialFile[]>(`/upload/files-current/${applicationId}`),

  getFileStats: (applicationId: number) =>
    request.get<any, FileStats>(`/upload/stats/${applicationId}`),

  getVersions: (applicationId: number, fieldName: string) =>
    request.get<any, MaterialFile[]>(`/upload/versions/${applicationId}/${fieldName}`),

  compareVersions: (applicationId: number, fieldName: string, v1Id: number, v2Id: number) =>
    request.get<any, VersionDiff>(`/upload/compare/${applicationId}/${fieldName}`, {
      params: { v1: v1Id, v2: v2Id },
    }),

  downloadFile: (fileId: number) => `/api/upload/download/${fileId}`,

  previewFile: (fileId: number) => `/api/upload/preview/${fileId}`,

  reuploadFile: (fileId: number, file: File, uploaderId: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploaderId', String(uploaderId))
    return request.post<any, MaterialFile>(`/upload/reupload/${fileId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteFile: (fileId: number, operatorId?: number) =>
    request.delete<any, { success: boolean }>(`/upload/${fileId}`, {
      params: operatorId ? { operatorId } : undefined,
    }),
}

export const getUploadFiles = (applicationId: number) => uploadApi.getFiles(applicationId)
export const getCurrentUploadFiles = (applicationId: number) => uploadApi.getCurrentFiles(applicationId)
export const getUploadFileStats = (applicationId: number) => uploadApi.getFileStats(applicationId)
export const getMaterialVersions = (applicationId: number, fieldName: string) => uploadApi.getVersions(applicationId, fieldName)
export const compareMaterialVersions = (applicationId: number, fieldName: string, v1Id: number, v2Id: number) => uploadApi.compareVersions(applicationId, fieldName, v1Id, v2Id)
export const getDownloadUrl = (fileId: number) => uploadApi.downloadFile(fileId)
export const getPreviewUrl = (fileId: number) => uploadApi.previewFile(fileId)
export const reuploadMaterialFile = (fileId: number, file: File, uploaderId: number) => uploadApi.reuploadFile(fileId, file, uploaderId)
export const deleteMaterialFile = (fileId: number, operatorId?: number) => uploadApi.deleteFile(fileId, operatorId)
