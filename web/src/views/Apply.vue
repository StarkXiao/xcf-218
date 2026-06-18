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

        <div class="form-section-title">申请信息</div>

        <el-form-item label="申请事由" prop="reason">
          <el-input v-model="formData.reason" type="textarea" :rows="3" placeholder="请详细说明申请事由" />
        </el-form-item>

        <div class="form-section-title">材料上传</div>
        <p class="form-tip" style="margin-top: -16px; margin-bottom: 20px">
          <el-icon color="#e6a23c"><Warning /></el-icon>
          请确保上传的材料清晰、完整，标有 <span style="color: #f56c6c">*</span> 为必需材料
        </p>

        <el-form-item
          v-for="(mat, index) in materialList"
          :key="mat.name"
          :label="mat.name"
          :prop="`material_${index}`"
          :rules="mat.required ? [{ required: true, validator: validateMaterial(index), trigger: 'change' }] : []"
        >
          <el-upload
            v-model:file-list="uploadedFiles[index]"
            :auto-upload="false"
            :limit="1"
            :on-exceed="() => $message.warning('只能上传一个文件')"
            :on-change="(file) => handleFileChange(index, file)"
            :on-remove="() => handleFileRemove(index)"
            accept=".jpg,.jpeg,.png,.pdf"
          >
            <el-button type="primary" :icon="Upload">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 jpg/png/pdf 格式，单个文件不超过 10MB</div>
            </template>
          </el-upload>
          <span v-if="mat.required" style="color: #f56c6c; margin-left: 8px">*</span>
          <div v-if="uploadedFiles[index]?.[0]" class="file-info">
            <el-icon color="#67c23a"><Check /></el-icon>
            <span>{{ uploadedFiles[index][0].name }} ({{ formatFileSize(uploadedFiles[index][0].size) }})</span>
          </div>
        </el-form-item>

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
import { ElMessage, type FormInstance, type FormRules, type UploadFile, type UploadProps } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getServiceItemById } from '@/api/service-item'
import { createApplication } from '@/api/application'
import { linkAppointmentApplication } from '@/api/appointment'
import type { ServiceItem } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const item = ref<ServiceItem | null>(null)
const formRef = ref<FormInstance>()
const materialList = ref<any[]>([])
const uploadedFiles = ref<UploadFile[][]>([])
const appointmentId = ref<number | null>(null)

const formData = reactive({
  name: '',
  idCard: '',
  phone: '',
  address: '',
  reason: '',
})

const formRules: FormRules = {
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

const validateMaterial = (index: number) => {
  return (_rule: any, _value: any, callback: any) => {
    if (!uploadedFiles.value[index] || uploadedFiles.value[index].length === 0) {
      callback(new Error('请上传材料'))
    } else {
      callback()
    }
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const handleFileChange = (index: number, file: UploadFile) => {
  if (!uploadedFiles.value[index]) {
    uploadedFiles.value[index] = []
  }
  uploadedFiles.value[index] = [file]
}

const handleFileRemove = (index: number) => {
  uploadedFiles.value[index] = []
}

const loadItem = async () => {
  loading.value = true
  try {
    if (route.query.appointmentId) {
      appointmentId.value = Number(route.query.appointmentId)
    }
    item.value = await getServiceItemById(Number(route.params.id))
    if (item.value?.materials) {
      try {
        materialList.value = JSON.parse(item.value.materials)
        uploadedFiles.value = materialList.value.map(() => [])
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
  formDataObj.append('formData', JSON.stringify({ ...formData }))

  const materialsInfo = materialList.value.map((m, i) => ({
    name: m.name,
    required: m.required,
    fieldName: `material_${i}`,
  }))
  formDataObj.append('materialsInfo', JSON.stringify(materialsInfo))

  for (let i = 0; i < materialList.value.length; i++) {
    const files = uploadedFiles.value[i]
    if (files && files.length > 0 && files[0].raw) {
      formDataObj.append(`material_${i}`, files[0].raw, files[0].name)
    }
  }

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
