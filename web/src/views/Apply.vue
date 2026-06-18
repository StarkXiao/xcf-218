<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="item">
      <div class="page-header">
        <h2 class="page-title">提交申请材料 - {{ item.name }}</h2>
        <el-tag type="info">{{ item.processingDays }} 个工作日</el-tag>
      </div>

      <el-alert
        v-if="appointmentId"
        title="您已有预约，提交申请后将自动关联预约信息"
        type="success"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      />

      <el-steps :active="1" finish-status="success" style="margin-bottom: 40px">
        <el-step title="填写信息" />
        <el-step title="提交材料" />
        <el-step title="完成提交" />
      </el-steps>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        style="max-width: 800px; margin: 0 auto"
      >
        <div class="form-section-title">基本信息</div>

        <el-form-item label="申请人姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入真实姓名" :disabled="!!userStore.user" />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="formData.idCard" placeholder="请输入18位身份证号" maxlength="18" :disabled="!!userStore.user" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号码" maxlength="11" :disabled="!!userStore.user" />
        </el-form-item>

        <el-form-item label="联系地址" prop="address">
          <el-input v-model="formData.address" type="textarea" :rows="2" placeholder="请输入详细地址" />
        </el-form-item>

        <div v-if="templateFields.length > 0" class="form-section-title">申请信息与材料</div>
        <el-alert
          v-if="templateFields.length > 0"
          title="以下字段由材料模板自动生成，请按要求填写和上传"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <template v-for="field in templateFields" :key="field.key">
          <el-form-item
            :label="field.label"
            :prop="`tpl_${field.key}`"
            :rules="getFieldRules(field)"
          >
            <el-input
              v-if="field.type === 'text'"
              v-model="formData[`tpl_${field.key}`]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :maxlength="field.maxLength"
              show-word-limit
            />
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="formData[`tpl_${field.key}`]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder || `请输入${field.label}`"
              :maxlength="field.maxLength"
              show-word-limit
            />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="formData[`tpl_${field.key}`]"
              :placeholder="field.placeholder || `请输入${field.label}`"
              style="width: 100%"
            />
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="formData[`tpl_${field.key}`]"
              type="date"
              :placeholder="field.placeholder || `请选择${field.label}`"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
            <el-select
              v-else-if="field.type === 'select'"
              v-model="formData[`tpl_${field.key}`]"
              :placeholder="field.placeholder || `请选择${field.label}`"
              style="width: 100%"
            >
              <el-option v-for="opt in field.options" :key="opt" :label="opt" :value="opt" />
            </el-select>
            <div v-else-if="field.type === 'file'" style="width: 100%">
              <el-upload
                v-model:file-list="uploadedFiles[field.key]"
                :auto-upload="false"
                :limit="1"
                :on-exceed="() => $message.warning('只能上传一个文件')"
                :on-change="(file: any) => handleFileChange(field.key, file)"
                :on-remove="() => handleFileRemove(field.key)"
                :accept="getFieldAccept(field)"
              >
                <el-button type="primary" :icon="Upload">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">
                    {{ getFieldFileTip(field) }}
                  </div>
                </template>
              </el-upload>
              <div v-if="uploadedFiles[field.key]?.[0]" class="file-info">
                <el-icon color="#67c23a"><Check /></el-icon>
                <span>{{ uploadedFiles[field.key][0].name }} ({{ formatFileSize(uploadedFiles[field.key][0].size || 0) }})</span>
              </div>
            </div>
          </el-form-item>
        </template>

        <div v-if="templateFields.length === 0 && materialList.length > 0" class="form-section-title">材料上传</div>
        <p v-if="templateFields.length === 0 && materialList.length > 0" class="form-tip" style="margin-top: -16px; margin-bottom: 20px">
          <el-icon color="#e6a23c"><Warning /></el-icon>
          请确保上传的材料清晰、完整，标有 <span style="color: #f56c6c">*</span> 为必需材料
        </p>

        <template v-if="templateFields.length === 0">
          <el-form-item
            v-for="(mat, index) in materialList"
            :key="mat.name"
            :label="mat.name"
            :prop="`material_${index}`"
            :rules="mat.required ? [{ required: true, validator: validateMaterial(index), trigger: 'change' }] : []"
          >
            <el-upload
              v-model:file-list="legacyUploadedFiles[index]"
              :auto-upload="false"
              :limit="1"
              :on-exceed="() => $message.warning('只能上传一个文件')"
              :on-change="(file: any) => handleLegacyFileChange(index, file)"
              :on-remove="() => handleLegacyFileRemove(index)"
              accept=".jpg,.jpeg,.png,.pdf"
            >
              <el-button type="primary" :icon="Upload">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 jpg/png/pdf 格式，单个文件不超过 10MB</div>
              </template>
            </el-upload>
            <span v-if="mat.required" style="color: #f56c6c; margin-left: 8px">*</span>
            <div v-if="legacyUploadedFiles[index]?.[0]" class="file-info">
              <el-icon color="#67c23a"><Check /></el-icon>
              <span>{{ legacyUploadedFiles[index][0].name }} ({{ formatFileSize(legacyUploadedFiles[index][0].size || 0) }})</span>
            </div>
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            提交申请
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getServiceItemById } from '@/api/service-item'
import { getCurrentTemplate } from '@/api/material-template'
import { createApplication } from '@/api/application'
import { linkAppointmentApplication } from '@/api/appointment'
import type { ServiceItem, TemplateFieldDef, MaterialTemplate } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const item = ref<ServiceItem | null>(null)
const formRef = ref<FormInstance>()
const materialList = ref<any[]>([])
const legacyUploadedFiles = ref<UploadFile[][]>([])
const appointmentId = ref<number | null>(null)

const templateFields = ref<TemplateFieldDef[]>([])
const currentTemplate = ref<MaterialTemplate | null>(null)
const uploadedFiles = ref<Record<string, UploadFile[]>>({})

const formData = reactive<Record<string, any>>({
  name: '',
  idCard: '',
  phone: '',
  address: '',
  reason: '',
})

const baseFormRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号码格式不正确', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入联系地址', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请事由', trigger: 'blur' }],
}
const formRules = ref<FormRules>({ ...baseFormRules })

const getFieldRules = (field: TemplateFieldDef) => {
  const rules: any[] = []
  if (field.required) {
    if (field.type === 'file') {
      rules.push({
        required: true,
        validator: (_rule: any, _value: any, callback: any) => {
          const files = uploadedFiles.value[field.key]
          if (!files || files.length === 0) {
            callback(new Error(`请上传${field.label}`))
          } else {
            callback()
          }
        },
        trigger: 'change',
      })
    } else {
      rules.push({ required: true, message: `请输入${field.label}`, trigger: field.type === 'select' || field.type === 'date' ? 'change' : 'blur' })
    }
  }
  if (field.type === 'text' && field.pattern) {
    rules.push({
      pattern: new RegExp(field.pattern),
      message: field.patternMessage || `${field.label}格式不正确`,
      trigger: 'blur',
    })
  }
  return rules
}

const getFieldAccept = (field: TemplateFieldDef) => {
  if (field.type === 'file' && field.allowedFileTypes?.length) {
    return field.allowedFileTypes.join(',')
  }
  return '.jpg,.jpeg,.png,.pdf'
}

const getFieldFileTip = (field: TemplateFieldDef) => {
  const parts: string[] = []
  if (field.allowedFileTypes?.length) {
    parts.push(`支持 ${field.allowedFileTypes.map(t => t.replace('.', '').toUpperCase()).join('/')} 格式`)
  } else {
    parts.push('支持 JPG/PNG/PDF 格式')
  }
  if (field.maxFileSize) {
    parts.push(`单个文件不超过 ${field.maxFileSize}MB`)
  } else {
    parts.push('单个文件不超过 10MB')
  }
  return parts.join('，')
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleFileChange = (key: string, file: UploadFile) => {
  if (file.raw) {
    const field = templateFields.value.find(f => f.key === key)
    if (field && !validateFileUpload(field, file.raw)) {
      uploadedFiles.value[key] = []
      return
    }
  }
  uploadedFiles.value[key] = [file]
}

const handleFileRemove = (key: string) => {
  uploadedFiles.value[key] = []
}

const validateFileUpload = (field: TemplateFieldDef, file: File): boolean => {
  const maxSize = (field.maxFileSize || 10) * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error(`${field.label}文件大小不能超过 ${field.maxFileSize || 10}MB`)
    return false
  }
  if (field.allowedFileTypes?.length) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!field.allowedFileTypes.includes(ext)) {
      ElMessage.error(`${field.label}仅支持 ${field.allowedFileTypes.map(t => t.replace('.', '').toUpperCase()).join('/')} 格式`)
      return false
    }
  }
  return true
}

const validateMaterial = (index: number) => {
  return (_rule: any, _value: any, callback: any) => {
    if (!legacyUploadedFiles.value[index] || legacyUploadedFiles.value[index].length === 0) {
      callback(new Error('请上传材料'))
    } else {
      callback()
    }
  }
}

const handleLegacyFileChange = (index: number, file: UploadFile) => {
  if (!legacyUploadedFiles.value[index]) {
    legacyUploadedFiles.value[index] = []
  }
  legacyUploadedFiles.value[index] = [file]
}

const handleLegacyFileRemove = (index: number) => {
  legacyUploadedFiles.value[index] = []
}

const parseFieldsSafe = (fields: any): TemplateFieldDef[] => {
  if (Array.isArray(fields)) return fields
  if (typeof fields === 'string') {
    try { const p = JSON.parse(fields); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

const loadItem = async () => {
  loading.value = true
  try {
    if (route.query.appointmentId) {
      appointmentId.value = Number(route.query.appointmentId)
    }
    const serviceItemId = Number(route.params.id)
    item.value = await getServiceItemById(serviceItemId)

    const template = await getCurrentTemplate(serviceItemId)
    const tplFields = parseFieldsSafe(template?.fields)
    if (template && tplFields.length > 0) {
      currentTemplate.value = template
      templateFields.value = tplFields
      for (const field of tplFields) {
        const propKey = `tpl_${field.key}`
        if (field.type === 'file') {
          uploadedFiles.value[field.key] = []
        } else if (field.type === 'number') {
          formData[propKey] = field.defaultValue ? Number(field.defaultValue) : undefined
        } else if (field.type === 'date') {
          formData[propKey] = field.defaultValue || ''
        } else {
          formData[propKey] = field.defaultValue || ''
        }
      }
    } else if (item.value?.materials) {
      try {
        materialList.value = JSON.parse(item.value.materials)
        legacyUploadedFiles.value = materialList.value.map(() => [])
      } catch {
        materialList.value = []
      }
    }

    if (userStore.user) {
      formData.name = userStore.user.name
      formData.idCard = userStore.user.idCard
      formData.phone = userStore.user.phone
    }
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value || !userStore.user) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const formDataObj = new FormData()
  formDataObj.append('userId', String(userStore.user.id))
  formDataObj.append('serviceItemId', String(route.params.id))

  const formPayload: Record<string, any> = {
    name: formData.name,
    idCard: formData.idCard,
    phone: formData.phone,
    address: formData.address,
    reason: formData.reason,
  }

  if (templateFields.value.length > 0) {
    const tplData: Record<string, any> = {}
    for (const field of templateFields.value) {
      if (field.type === 'file') continue
      tplData[field.key] = formData[`tpl_${field.key}`]
    }
    formPayload._templateData = tplData
    formPayload._templateId = currentTemplate.value?.id
    formPayload._templateVersion = currentTemplate.value?.version
  }

  formDataObj.append('formData', JSON.stringify(formPayload))

  const materialsInfo: Array<{ name: string; required: boolean; fieldName: string }> = []

  if (templateFields.value.length > 0) {
    for (const field of templateFields.value) {
      if (field.type === 'file') {
        materialsInfo.push({
          name: field.label,
          required: field.required,
          fieldName: `material_tpl_${field.key}`,
        })
        const files = uploadedFiles.value[field.key]
        if (files && files.length > 0 && files[0].raw) {
          formDataObj.append(`material_tpl_${field.key}`, files[0].raw, files[0].name)
        }
      }
    }
  } else {
    materialList.value.forEach((m, i) => {
      materialsInfo.push({
        name: m.name,
        required: m.required,
        fieldName: `material_${i}`,
      })
      const files = legacyUploadedFiles.value[i]
      if (files && files.length > 0 && files[0].raw) {
        formDataObj.append(`material_${i}`, files[0].raw, files[0].name)
      }
    })
  }

  formDataObj.append('materialsInfo', JSON.stringify(materialsInfo))

  submitting.value = true
  try {
    const result = await createApplication(formDataObj)
    if (appointmentId.value) {
      await linkAppointmentApplication(appointmentId.value, result.id)
      ElMessage.success('申请提交成功，已关联预约信息')
    } else {
      ElMessage.success('申请提交成功，材料已上传')
    }
    router.push(`/applications/${result.id}`)
  } finally {
    submitting.value = false
  }
}

onMounted(loadItem)
</script>

<style scoped>
.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 24px 0 16px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}
.form-tip {
  font-size: 13px;
  color: #606266;
  padding-left: 120px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: #67c23a;
}
</style>
