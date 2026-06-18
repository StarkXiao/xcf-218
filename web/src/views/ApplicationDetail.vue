<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="application">
      <div class="detail-header">
        <div>
          <h2 class="detail-title">{{ application.serviceItem?.name }}</h2>
          <p class="detail-subtitle">
            申请编号：{{ application.applicationNo }}
            <el-tag :type="getStatusType(application.status)" style="margin-left: 12px">
              {{ getStatusText(application.status) }}
            </el-tag>
          </p>
        </div>
        <p class="apply-time">提交时间：{{ formatDate(application.createdAt) }}</p>
      </div>

      <el-divider />

      <el-row :gutter="20">
        <el-col :span="14">
          <div class="content-section">
            <h3 class="section-title">申请信息</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="申请人">{{ application.formData.name }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ application.formData.idCard }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ application.formData.phone }}</el-descriptions-item>
              <el-descriptions-item label="联系地址">{{ application.formData.address }}</el-descriptions-item>
              <el-descriptions-item label="申请事由" :span="2">{{ application.formData.reason }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div v-if="application.status === 'supplementing'" class="content-section">
            <h3 class="section-title">需补充材料</h3>
            <el-alert
              :title="currentSupplement?.rejectReason || '管理员要求补充以下材料'"
              type="error"
              show-icon
              style="margin-bottom: 16px"
            />
            <el-table :data="rejectedMaterials" style="width: 100%">
              <el-table-column prop="materialName" label="材料名称" width="200" />
              <el-table-column prop="reason" label="退回原因" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag v-if="isMaterialUploaded(row.fieldName)" type="success">已补充</el-tag>
                  <el-tag v-else type="danger">待补充</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="280">
                <template #default="{ row }">
                  <el-button type="primary" link @click="viewVersionHistory(row.fieldName, row.materialName)">
                    历史版本
                  </el-button>
                  <el-button
                    v-if="!isMaterialUploaded(row.fieldName)"
                    type="success"
                    link
                    @click="openUpload(row.fieldName, row.materialName)"
                  >
                    补充上传
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="content-section">
            <h3 class="section-title">提交材料</h3>
            <el-table :data="application.materialFiles" style="width: 100%" v-if="application.materialFiles.length > 0">
              <el-table-column type="index" label="序号" width="80" />
              <el-table-column prop="materialName" label="材料名称" />
              <el-table-column prop="originalName" label="文件名" />
              <el-table-column label="版本" width="80">
                <template #default="{ row }">v{{ row.version }}</template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
                  <el-tag v-else-if="row.isCurrent" type="success">当前</el-tag>
                  <el-tag v-else type="info">历史</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="文件大小" width="120">
                <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
              </el-table-column>
              <el-table-column label="是否必需" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'">
                    {{ row.required ? '必需' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="row.mimeType.startsWith('image/')"
                    type="primary"
                    link
                    @click="previewImage(row)"
                  >
                    预览
                  </el-button>
                  <el-button
                    v-else-if="row.mimeType === 'application/pdf'"
                    type="primary"
                    link
                    @click="previewPdf(row)"
                  >
                    预览
                  </el-button>
                  <el-button type="primary" link @click="downloadFile(row)">
                    下载
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无上传的材料文件" />
          </div>

          <div v-if="application.reviewComment" class="content-section">
            <h3 class="section-title">审核意见</h3>
            <el-alert
              :title="application.reviewComment"
              :type="application.status === 'rejected' || application.status === 'supplementing' ? 'error' : 'success'"
              show-icon
            />
          </div>

          <div v-if="certificate" class="content-section">
            <h3 class="section-title">电子证明</h3>
            <el-card class="cert-card">
              <div class="cert-info">
                <div>
                  <p class="cert-no">证明编号：{{ certificate.certificateNo }}</p>
                  <p class="cert-type">证明类型：{{ certificate.certificateType }}</p>
                  <p class="cert-date">发证日期：{{ formatDate(certificate.issuedAt || certificate.createdAt) }}</p>
                </div>
                <div class="cert-actions">
                  <el-button type="primary" @click="viewCertificate">查看详情</el-button>
                  <el-button type="success" @click="previewCert">预览</el-button>
                  <el-button type="primary" plain @click="downloadCert">下载</el-button>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>

        <el-col :span="10">
          <div class="content-section">
            <h3 class="section-title">办理进度</h3>
            <el-timeline>
              <el-timeline-item
                v-for="(record, index) in sortedRecords"
                :key="record.id"
                :timestamp="formatDate(record.createdAt)"
                placement="top"
                :type="index === 0 ? 'primary' : (record.status === 'failed' ? 'danger' : 'success')"
                :hollow="index === 0"
              >
                <div class="timeline-content">
                  <h4>{{ record.step }}</h4>
                  <p v-if="record.remark">{{ record.remark }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="previewVisible" title="材料预览" width="80%" :close-on-click-modal="false">
      <div v-if="previewFile" class="preview-container">
        <img v-if="previewFile.mimeType.startsWith('image/')" :src="previewUrl" alt="预览" class="preview-image" />
        <iframe
          v-else-if="previewFile.mimeType === 'application/pdf'"
          :src="previewUrl"
          class="preview-pdf"
        ></iframe>
        <div v-else class="no-preview">
          <el-icon :size="48"><Document /></el-icon>
          <p>该文件类型不支持在线预览，请下载后查看</p>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="versionVisible" title="版本历史记录" width="800px" destroy-on-close>
      <div>
        <h4 style="margin-bottom: 12px">{{ currentMaterialName }} - 历史版本</h4>
        <el-table :data="versionList" style="width: 100%">
          <el-table-column prop="version" label="版本号" width="100" />
          <el-table-column prop="originalName" label="文件名" />
          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
              <el-tag v-else-if="row.isCurrent" type="success">当前版本</el-tag>
              <el-tag v-else type="info">历史版本</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button type="primary" link @click="previewFile(row)">预览</el-button>
              <el-button type="primary" link @click="downloadFile(row)">下载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="uploadVisible" title="补充上传材料" width="600px" destroy-on-close>
      <div>
        <p><strong>材料名称：</strong>{{ uploadMaterialName }}</p>
        <p style="margin: 12px 0">请选择要上传的文件（支持 JPG/PNG/PDF，不超过 10MB）：</p>
        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          accept=".jpg,.jpeg,.png,.pdf"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitUpload">提交上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, Document, UploadFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getApplicationById, downloadMaterial, previewMaterial } from '@/api/application'
import {
  getSupplementByApplicationId,
  getMaterialVersions,
  uploadSupplementMaterial,
} from '@/api/supplement-center'
import { getCertificates, previewCertificate, downloadCertificate } from '@/api/certificate'
import type { Application, MaterialFile, SupplementRecord, Certificate } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const application = ref<Application | null>(null)
const previewVisible = ref(false)
const previewFile = ref<MaterialFile | null>(null)
const previewUrl = ref('')

const supplementRecords = ref<SupplementRecord[]>([])
const currentSupplement = ref<SupplementRecord | null>(null)
const rejectedMaterials = ref<any[]>([])

const versionVisible = ref(false)
const versionList = ref<MaterialFile[]>([])
const currentMaterialName = ref('')

const uploadVisible = ref(false)
const uploadFieldName = ref('')
const uploadMaterialName = ref('')
const uploadFileObj = ref<File | null>(null)
const submitting = ref(false)

const certificate = ref<Certificate | null>(null)

const sortedRecords = computed(() => {
  if (!application.value?.progressRecords) return []
  return [...application.value.progressRecords].reverse()
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    supplementing: 'warning',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '已提交',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
    supplementing: '待补件',
  }
  return map[status] || status
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const loadData = async () => {
  loading.value = true
  try {
    const appId = Number(route.params.id)
    application.value = await getApplicationById(appId)

    if (application.value.status === 'supplementing') {
      supplementRecords.value = await getSupplementByApplicationId(appId)
      currentSupplement.value = supplementRecords.value.find((r) => r.status === 'pending') || null
      if (currentSupplement.value) {
        rejectedMaterials.value = currentSupplement.value.rejectedMaterials || []
      }
    }

    if (application.value.status === 'approved' || application.value.status === 'completed') {
      if (userStore.user?.id) {
        const certs = await getCertificates(userStore.user.id)
        certificate.value = certs.find(c => c.applicationId === appId) || null
      }
    }
  } finally {
    loading.value = false
  }
}

const isMaterialUploaded = (fieldName: string) => {
  if (!application.value?.materialFiles) return false
  const file = application.value.materialFiles.find(
    (f) => f.fieldName === fieldName && f.isCurrent
  )
  return file && file.status !== 'rejected'
}

const previewImage = (file: MaterialFile) => {
  previewFile.value = file
  previewUrl.value = previewMaterial(file.id)
  previewVisible.value = true
}

const previewPdf = (file: MaterialFile) => {
  previewFile.value = file
  previewUrl.value = previewMaterial(file.id)
  previewVisible.value = true
}

const downloadFile = (file: MaterialFile) => {
  window.open(downloadMaterial(file.id), '_blank')
}

const viewVersionHistory = async (fieldName: string, materialName: string) => {
  if (!application.value) return
  currentMaterialName.value = materialName
  versionList.value = await getMaterialVersions(application.value.id, fieldName)
  versionVisible.value = true
}

const openUpload = (fieldName: string, materialName: string) => {
  uploadFieldName.value = fieldName
  uploadMaterialName.value = materialName
  uploadFileObj.value = null
  uploadVisible.value = true
}

const handleFileChange = (f: any) => {
  uploadFileObj.value = f.raw
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const submitUpload = async () => {
  if (!userStore.user?.id || !currentSupplement.value || !application.value) return
  if (!uploadFileObj.value) {
    ElMessage.warning('请选择上传文件')
    return
  }

  submitting.value = true
  try {
    const material = rejectedMaterials.value.find(
      (m) => m.fieldName === uploadFieldName.value
    )
    await uploadSupplementMaterial(
      currentSupplement.value.id,
      uploadFieldName.value,
      uploadMaterialName.value,
      uploadFileObj.value,
      userStore.user.id,
      material?.required ?? false
    )
    ElMessage.success('材料上传成功')
    uploadVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

const viewCertificate = () => {
  if (certificate.value) {
    router.push(`/certificates/${certificate.value.id}`)
  }
}

const previewCert = () => {
  if (certificate.value && userStore.user?.id) {
    window.open(previewCertificate(certificate.value.id, certificate.value.userId, userStore.user.id), '_blank')
  }
}

const downloadCert = () => {
  if (certificate.value && userStore.user?.id) {
    ElMessage.success('开始下载证明文件')
    window.location.href = downloadCertificate(certificate.value.id, certificate.value.userId, userStore.user.id)
  }
}

onMounted(loadData)
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.detail-subtitle {
  font-size: 14px;
  color: #606266;
}
.apply-time {
  font-size: 13px;
  color: #909399;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}
.content-section {
  margin-bottom: 24px;
}
.timeline-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.timeline-content p {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  background: #f5f7fa;
  border-radius: 4px;
}
.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
}
.preview-pdf {
  width: 100%;
  height: 600px;
  border: none;
}
.no-preview {
  text-align: center;
  color: #909399;
}
.no-preview p {
  margin-top: 12px;
}
.cert-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7dd3fc;
}
.cert-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cert-no {
  font-size: 16px;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 8px;
}
.cert-type,
.cert-date {
  font-size: 14px;
  color: #0284c7;
  margin-bottom: 4px;
}
.cert-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
