import request from '@/utils/request'
import type { MaterialTemplate } from '@/types'

export const getMaterialTemplates = (serviceItemId?: number) => {
  return request.get<any, MaterialTemplate[]>('/material-templates', { params: { serviceItemId } })
}

export const getMaterialTemplateById = (id: number) => {
  return request.get<any, MaterialTemplate>(`/material-templates/${id}`)
}

export const getCurrentTemplate = (serviceItemId: number) => {
  return request.get<any, MaterialTemplate>(`/material-templates/current/${serviceItemId}`)
}

export const getTemplatesByServiceItem = (serviceItemId: number) => {
  return request.get<any, MaterialTemplate[]>(`/material-templates/by-service/${serviceItemId}`)
}

export const createMaterialTemplate = (data: Partial<MaterialTemplate>) => {
  return request.post('/material-templates', data)
}

export const updateMaterialTemplate = (id: number, data: Partial<MaterialTemplate>) => {
  return request.put(`/material-templates/${id}`, data)
}

export const enableTemplate = (id: number) => {
  return request.put(`/material-templates/${id}/enable`)
}

export const disableTemplate = (id: number) => {
  return request.put(`/material-templates/${id}/disable`)
}

export const switchTemplateVersion = (id: number) => {
  return request.put(`/material-templates/${id}/switch`)
}

export const deleteMaterialTemplate = (id: number) => {
  return request.delete(`/material-templates/${id}`)
}
