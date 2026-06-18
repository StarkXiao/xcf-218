<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2 class="page-title">补件管理</h2>
        </div>
      </template>

      <el-table :data="supplementList" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="序号" width="80" />
        <el-table-column prop="application.applicationNo" label="申请编号" width="200" />
        <el-table-column label="事项名称">
          <template #default="{ row }">{{ row.application?.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="申请人">
          <template #default="{ row }">{{ row.application?.user?.name }}</template>
        </el-table-column>
        <el-table-column label="退回原因" show-overflow-tooltip>
          <template #default="{ row }">{{ row.rejectReason }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : 'success'">
              {{ row.status === 'pending' ? '待补件' : '已完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="退回时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="补件时间" width="180">
          <template #default="{ row }">{{ row.supplementTime ? formatDate(row.supplementTime) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看详情</el-button>
            <el-button
              v-if="row.status === 'completed'"
              type="success"
              link
              @click="goReview(row)"
            >
              继续审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && supplementList.length === 0" description="暂无补件记录" />
    </el-card>

    <el-dialog v-model="detailVisible" title="补件详情" width="900px" destroy-on-close>
      <div v-if="currentRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">
            {{ currentRecord.application?.applicationNo }}
          </el-descriptions-item>
          <el-descriptions-item label="事项名称">
            {{ currentRecord.application?.serviceItem?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ currentRecord.application?.user?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            {{ currentRecord.application?.formData?.phone }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ currentRecord.operator?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="退回时间">
            {{ formatDate(currentRecord.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态" :span="1">
            <el-tag :type="currentRecord.status === 'pending' ? 'warning' : 'success'">
              {{ currentRecord.status === 'pending' ? '待补件' : '已完成' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="补件完成时间" :span="1">
            {{ currentRecord.supplementTime ? formatDate(currentRecord.supplementTime) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="退回原因" :span="2">
            {{ currentRecord.rejectReason }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">材料清单</el-divider>
        <el-table :data="currentRecord.rejectedMaterials" style="width: 100%">
          <el-table-column prop="materialName" label="材料名称" width="200" />
          <el-table-column prop="reason" label="退回原因" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="isMaterialUploaded(row.fieldName)" type="success">已补充</el-tag>
              <el-tag v-else type="danger">待补充</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前文件" width="200">
            <template #default="{ row }">
              <span v-if="getCurrentFile(row.fieldName)">
                {{ getCurrentFile(row.fieldName)?.originalName }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280">
            <template #default="{ row }">
              <el-button type="primary" link @click="viewVersionHistory(row.fieldName, row.materialName)">
                历史版本
              </el-button>
              <el-button
                v-if="getCurrentFile(row.fieldName)"
                type="primary"
                link
                @click="previewFile(getCurrentFile(row.fieldName)!)"
              >
                预览
              </el-button>
              <el-button
                v-if="getCurrentFile(row.fieldName)"
                type="primary"
                link
                @click="downloadFile(getCurrentFile(row.fieldName)!)"
              >
                下载
              </el-button>
            </template>
          </el-table-column>
        </el-table>
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
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
              <el-tag v-else-if="row.isCurrent" type="success">当前版本</el-tag>
              <el-tag v-else type="info">历史版本</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="退回原因" show-overflow-tooltip>
            <template #default="{ row }">{{ row.rejectReason || '-' }}</template>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAdminSupplementList,
  getSupplementDetail,
  getMaterialVersions,
} from '@/api/supplement-center'
import { downloadMaterial, previewMaterial } from '@/api/application'
import type { SupplementRecord, MaterialFile } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const supplementList = ref<SupplementRecord[]>([])

const detailVisible = ref(false)
const currentRecord = ref<SupplementRecord | null>(null)

const versionVisible = ref(false)
const versionList = ref<MaterialFile[]>([])
const currentMaterialName = ref('')

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const loadData = async () => {
  loading.value = true
  try {
    supplementList.value = await getAdminSupplementList()
  } finally {
    loading.value = false
  }
}

const isMaterialUploaded = (fieldName: string) => {
  if (!currentRecord.value?.currentFiles) return false
  const file = currentRecord.value.currentFiles.find(
    (f) => f.fieldName === fieldName && f.isCurrent
  )
  return file && file.status !== 'rejected'
}

const getCurrentFile = (fieldName: string) => {
  if (!currentRecord.value?.currentFiles) return null
  return currentRecord.value.currentFiles.find((f) => f.fieldName === fieldName && f.isCurrent)
}

const viewDetail = async (row: SupplementRecord) => {
  currentRecord.value = await getSupplementDetail(row.id)
  detailVisible.value = true
}

const goReview = (row: SupplementRecord) => {
  if (row.applicationId) {
    router.push(`/admin/review/${row.applicationId}`)
  }
}

const viewVersionHistory = async (fieldName: string, materialName: string) => {
  if (!currentRecord.value) return
  currentMaterialName.value = materialName
  versionList.value = await getMaterialVersions(currentRecord.value.applicationId, fieldName)
  versionVisible.value = true
}

const previewFile = (file: MaterialFile) => {
  window.open(previewMaterial(file.id), '_blank')
}

const downloadFile = (file: MaterialFile) => {
  window.open(downloadMaterial(file.id), '_blank')
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
</style>
