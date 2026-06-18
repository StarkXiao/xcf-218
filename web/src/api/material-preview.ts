import request from '@/utils/request'
import type { PreviewResult } from './application'

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

export interface PreviewRequest {
  serviceItemId: number
  materialTemplateId?: number
  formData: Record<string, any>
  uploadedFiles: Array<{
    fieldName: string
    originalName: string
    size: number
    mimeType: string
  }>
  materialsInfo: Array<{
    name: string
    required: boolean
    fieldName: string
  }>
}

export const materialPreviewApi = {
  preview: (request: PreviewRequest) =>
    request.post<any, PreviewResult>('/material-preview/preview', request),

  getRules: (serviceItemId: number, materialTemplateId?: number) =>
    request.get<any, MaterialPreviewRule[]>('/material-preview/rules', {
      params: { serviceItemId, materialTemplateId },
    }),

  createRule: (data: Partial<MaterialPreviewRule>) =>
    request.post<any, MaterialPreviewRule>('/material-preview/rules', data),

  updateRule: (id: number, data: Partial<MaterialPreviewRule>) =>
    request.put<any, MaterialPreviewRule>(`/material-preview/rules/${id}`, data),

  deleteRule: (id: number) =>
    request.delete<any, { success: boolean }>(`/material-preview/rules/${id}`),

  batchCreateRules: (
    serviceItemId: number,
    rules: Partial<MaterialPreviewRule>[],
    materialTemplateId?: number,
  ) =>
    request.post<any, MaterialPreviewRule[]>('/material-preview/rules/batch', {
      serviceItemId,
      materialTemplateId,
      rules,
    }),
}

export const getPreviewRules = (serviceItemId: number, materialTemplateId?: number) => {
  return materialPreviewApi.getRules(serviceItemId, materialTemplateId)
}

export const createPreviewRule = (data: Partial<MaterialPreviewRule>) => {
  return materialPreviewApi.createRule(data)
}

export const updatePreviewRule = (id: number, data: Partial<MaterialPreviewRule>) => {
  return materialPreviewApi.updateRule(id, data)
}

export const deletePreviewRule = (id: number) => {
  return materialPreviewApi.deleteRule(id)
}

export const batchCreatePreviewRules = (
  serviceItemId: number,
  rules: Partial<MaterialPreviewRule>[],
  materialTemplateId?: number,
) => {
  return materialPreviewApi.batchCreateRules(serviceItemId, rules, materialTemplateId)
}
