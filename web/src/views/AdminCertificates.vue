<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">证明管理</h2>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">证明总数</div>
            <div class="stat-value">{{ stats.total }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">已生成</div>
            <div class="stat-value success">{{ stats.generated }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">已归档</div>
            <div class="stat-value info">{{ stats.archived }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="stat-item">
            <div class="stat-label">下载次数</div>
            <div class="stat-value primary">{{ stats.downloadCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="证明编号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="已生成" value="generated" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="归档状态">
          <el-select v-model="filterForm.archived" placeholder="全部" clearable style="width: 140px">
            <el-option label="已归档" :value="true" />
            <el-option label="未归档" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCertificates(1)">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="certificates" style="width: 100%">
        <el-table-column prop="certificateNo" label="证明编号" width="220" />
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.user?.name }}</template>
        </el-table-column>
        <el-table-column label="事项名称">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="证明类型" width="120">
          <template #default="{ row }">{{ row.certificateType }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="issuedAt" label="发证日期" width="180">
          <template #default="{ row }">{{ formatDate(row.issuedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
            <el-button type="success" link @click="previewCert(row)">预览</el-button>
            <el-button
              v-if="!row.archived"
              type="warning"
              link
              @click="handleArchive(row)"
            >
              归档
            </el-button>
            <el-button
              v-else
              type="info"
              link
              @click="handleUnarchive(row)"
            >
              取消归档
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; text-align: right">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadCertificates(1)"
          @current-change="loadCertificates"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="证明详情" width="700px">
      <div v-if="currentCert">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="证明编号">{{ currentCert.certificateNo }}</el-descriptions-item>
          <el-descriptions-item label="证明类型">{{ currentCert.certificateType }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentCert.user?.name }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{ currentCert.user?.idCard }}</el-descriptions-item>
          <el-descriptions-item label="事项名称">{{ currentCert.serviceItem?.name }}</el-descriptions-item>
          <el-descriptions-item label="事项编码">{{ currentCert.serviceItem?.code }}</el-descriptions-item>
          <el-descriptions-item label="申请编号">{{ currentCert.application?.applicationNo }}</el-descriptions-item>
          <el-descriptions-item label="发证日期">{{ formatDate(currentCert.issuedAt) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 20px">
          <el-button type="primary" @click="previewCurrent">预览证明</el-button>
          <el-button type="success" @click="downloadCurrent">下载证明</el-button>
          <el-button @click="showDownloadRecords">下载记录</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="recordsVisible" title="下载记录" width="700px">
      <el-table :data="downloadRecords" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="操作人" width="120">
          <template #default="{ row }">{{ row.user?.name }}</template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="80">
          <template #default="{ row }">{{ getActionText(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="createdAt" label="时间">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getAdminCertificates,
  getCertificateById,
  getDownloadRecords,
  archiveCertificate,
  unarchiveCertificate,
  previewCertificate,
  downloadCertificate,
  getCertificateStatistics,
} from '@/api/certificate'
import type { Certificate, CertificateDownloadRecord } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const certificates = ref<Certificate[]>([])
const stats = ref({ total: 0, generated: 0, archived: 0, downloadCount: 0 })

const filterForm = reactive({
  keyword: '',
  status: '',
  archived: undefined as boolean | undefined,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const detailVisible = ref(false)
const recordsVisible = ref(false)
const currentCert = ref<Certificate | null>(null)
const downloadRecords = ref<CertificateDownloadRecord[]>([])

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    generated: 'success',
    archived: 'info',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    generated: '已生成',
    archived: '已归档',
  }
  return map[status] || status
}

const getActionText = (action: string) => {
  const map: Record<string, string> = {
    download: '下载',
    preview: '预览',
  }
  return map[action] || action
}

const formatDate = (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'

const loadStats = async () => {
  try {
    stats.value = await getCertificateStatistics()
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

const loadCertificates = async (page?: number) => {
  if (page) pagination.page = page
  loading.value = true
  try {
    const result = await getAdminCertificates({
      keyword: filterForm.keyword || undefined,
      status: filterForm.status || undefined,
      archived: filterForm.archived,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    certificates.value = result.list
    pagination.total = result.total
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.keyword = ''
  filterForm.status = ''
  filterForm.archived = undefined
  loadCertificates(1)
}

const viewDetail = async (cert: Certificate) => {
  try {
    currentCert.value = await getCertificateById(cert.id)
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

const previewCert = (cert: Certificate) => {
  if (!userStore.user) return
  window.open(previewCertificate(cert.id, cert.userId, userStore.user.id), '_blank')
}

const previewCurrent = () => {
  if (!currentCert.value || !userStore.user) return
  window.open(previewCertificate(currentCert.value.id, currentCert.value.userId, userStore.user.id), '_blank')
}

const downloadCurrent = () => {
  if (!currentCert.value || !userStore.user) return
  ElMessage.success('开始下载证明文件')
  window.location.href = downloadCertificate(currentCert.value.id, currentCert.value.userId, userStore.user.id)
}

const showDownloadRecords = async () => {
  if (!currentCert.value) return
  try {
    downloadRecords.value = await getDownloadRecords(currentCert.value.id)
    recordsVisible.value = true
  } catch (e) {
    ElMessage.error('获取下载记录失败')
  }
}

const handleArchive = async (cert: Certificate) => {
  try {
    await ElMessageBox.confirm('确定要归档此证明吗？', '确认归档', {
      type: 'warning',
    })
    if (!userStore.user) return
    await archiveCertificate(cert.id, userStore.user.id)
    ElMessage.success('归档成功')
    loadCertificates()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('归档失败')
    }
  }
}

const handleUnarchive = async (cert: Certificate) => {
  try {
    await ElMessageBox.confirm('确定要取消归档此证明吗？', '确认取消归档', {
      type: 'info',
    })
    if (!userStore.user) return
    await unarchiveCertificate(cert.id, userStore.user.id)
    ElMessage.success('取消归档成功')
    loadCertificates()
    loadStats()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('取消归档失败')
    }
  }
}

onMounted(() => {
  loadStats()
  loadCertificates(1)
})
</script>

<style scoped>
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}
.stat-value.success {
  color: #67c23a;
}
.stat-value.info {
  color: #909399;
}
.stat-value.primary {
  color: #409eff;
}
</style>
