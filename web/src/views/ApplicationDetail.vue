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

          <div class="content-section">
            <h3 class="section-title">提交材料</h3>
            <el-table :data="application.materialFiles" style="width: 100%" v-if="application.materialFiles.length > 0">
              <el-table-column type="index" label="序号" width="80" />
              <el-table-column prop="materialName" label="材料名称" />
              <el-table-column prop="originalName" label="文件名" />
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
            <el-alert :title="application.reviewComment" :type="application.status === 'rejected' ? 'error' : 'success'" show-icon />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApplicationById, downloadMaterial, previewMaterial } from '@/api/application'
import type { Application, MaterialFile } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()

const loading = ref(false)
const application = ref<Application | null>(null)
const previewVisible = ref(false)
const previewFile = ref<MaterialFile | null>(null)
const previewUrl = ref('')

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
    application.value = await getApplicationById(Number(route.params.id))
  } finally {
    loading.value = false
  }
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
</style>
