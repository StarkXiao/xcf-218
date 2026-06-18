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
          :prop="`materials.${index}`"
          :rules="mat.required ? [{ required: true, message: `请上传${mat.name}`, trigger: 'change' }] : []"
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
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getServiceItemById } from '@/api/service-item'
import { createApplication } from '@/api/application'
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

  const materials = materialList.value.map((m, i) => ({
    name: m.name,
    required: m.required,
    uploaded: uploadedFiles.value[i] && uploadedFiles.value[i].length > 0,
    fileName: uploadedFiles.value[i]?.[0]?.name || '',
  }))

  submitting.value = true
  try {
    const result = await createApplication({
      userId: userStore.user.id,
      serviceItemId: Number(route.params.id),
      formData: { ...formData },
      materials,
    })
    ElMessage.success('申请提交成功')
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
</style>
