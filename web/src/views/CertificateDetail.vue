<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">证明详情</h2>
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <el-card v-loading="loading" style="margin-bottom: 20px">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-tag :type="getStatusType(certificate?.status || '')">
            {{ getStatusText(certificate?.status || '') }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="证明编号">{{ certificate?.certificateNo }}</el-descriptions-item>
        <el-descriptions-item label="证明类型">{{ certificate?.certificateType }}</el-descriptions-item>
        <el-descriptions-item label="事项名称">{{ certificate?.serviceItem?.name }}</el-descriptions-item>
        <el-descriptions-item label="事项编码">{{ certificate?.serviceItem?.code }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ certificate?.user?.name }}</el-descriptions-item>
        <el-descriptions-item label="身份证号">{{ certificate?.user?.idCard }}</el-descriptions-item>
        <el-descriptions-item label="申请编号">{{ certificate?.application?.applicationNo }}</el-descriptions-item>
        <el-descriptions-item label="发证日期">{{ formatDate(certificate?.issuedAt || certificate?.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="到期日期">
          <template v-if="certificate?.expiredAt">
            <span :class="getExpiryClass(certificate.expiredAt)">
              {{ formatDate(certificate.expiredAt) }}
              <el-tag
                v-if="getExpiryStatus(certificate.expiredAt) !== 'normal'"
                :type="getExpiryTagType(certificate.expiredAt)"
                size="small"
                style="margin-left: 8px"
              >
                {{ getExpiryStatusText(certificate.expiredAt) }}
              </el-tag>
            </span>
          </template>
          <span v-else>长期有效</span>
        </el-descriptions-item>
      </el-descriptions>

      <div style="margin-top: 20px">
        <el-button type="primary" @click="previewCert">
          <el-icon><View /></el-icon>
          预览证明
        </el-button>
        <el-button type="success" @click="downloadCert">
          <el-icon><Download /></el-icon>
          下载证明
        </el-button>
        <el-button @click="viewDownloadRecords">
          <el-icon><Document /></el-icon>
          下载记录
        </el-button>
        <el-button
          v-if="certificate?.expiredAt && certificate?.status === 'generated' && !certificate?.archived"
          type="warning"
          @click="goToRenew"
        >
          <el-icon><Refresh /></el-icon>
          {{ getExpiryStatus(certificate.expiredAt) === 'expired' ? '立即续办' : '申请续办' }}
        </el-button>
      </div>
    </el-card>

    <el-card v-if="certificate?.archived">
      <template #header>归档信息</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="归档时间">{{ formatDate(certificate?.archivedAt) }}</el-descriptions-item>
        <el-descriptions-item label="归档人">{{ certificate?.archivedBy }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-dialog v-model="downloadRecordsVisible" title="下载记录" width="700px">
      <el-table :data="downloadRecords" style="width: 100%">
        <el-table-column prop="id" label="记录ID" width="80" />
        <el-table-column label="操作人">
          <template #default="{ row }">{{ row.user?.name }}</template>
        </el-table-column>
        <el-table-column prop="action" label="操作类型" width="100">
          <template #default="{ row }">{{ getActionText(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="createdAt" label="操作时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Download, Document, Refresh } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getCertificateById, getDownloadRecords, previewCertificate, downloadCertificate, getRenewalInfo } from '@/api/certificate'
import type { Certificate, CertificateDownloadRecord } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const certificate = ref<Certificate | null>(null)
const downloadRecords = ref<CertificateDownloadRecord[]>([])
const downloadRecordsVisible = ref(false)

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

const getExpiryStatus = (expiredAt: string) => {
  const now = dayjs()
  const expiry = dayjs(expiredAt)
  const days = expiry.diff(now, 'day')
  
  if (days < 0) return 'expired'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'expiring'
  return 'normal'
}

const getExpiryStatusText = (expiredAt: string) => {
  const now = dayjs()
  const expiry = dayjs(expiredAt)
  const days = expiry.diff(now, 'day')
  
  if (days < 0) return `已过期${Math.abs(days)}天`
  if (days === 0) return '今天到期'
  if (days === 1) return '明天到期'
  return `剩余${days}天`
}

const getExpiryTagType = (expiredAt: string) => {
  const status = getExpiryStatus(expiredAt)
  const map: Record<string, string> = {
    normal: 'success',
    expiring: 'warning',
    urgent: 'danger',
    expired: 'info',
  }
  return map[status] || 'info'
}

const getExpiryClass = (expiredAt: string) => {
  const status = getExpiryStatus(expiredAt)
  if (status === 'expired') return 'text-red-600 font-bold'
  if (status === 'urgent') return 'text-orange-600 font-bold'
  if (status === 'expiring') return 'text-yellow-600'
  return ''
}

const formatDate = (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'

const goToRenew = async () => {
  if (!certificate.value) return
  try {
    const expiryStatus = getExpiryStatus(certificate.value.expiredAt!)
    const expiryText = expiryStatus === 'expired' ? '该证照已过期' : '该证照即将到期'
    await ElMessageBox.confirm(
      `${expiryText}，确定要申请续办吗？`,
      '证照续办',
      {
        confirmButtonText: '立即续办',
        cancelButtonText: '取消',
        type: expiryStatus === 'expired' ? 'error' : 'warning',
      }
    )
    const renewalInfo = await getRenewalInfo(certificate.value.id)
    if (renewalInfo.renewalServiceItem) {
      router.push(`/apply/${renewalInfo.renewalServiceItem.id}?renewal=1&certificateId=${certificate.value.id}`)
    } else {
      ElMessage.warning('未找到可续办的事项')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('获取续办信息失败', error)
    }
  }
}

const loadCertificate = async () => {
  const id = route.params.id as string
  if (!id || !userStore.user) return
  loading.value = true
  try {
    certificate.value = await getCertificateById(+id, userStore.user.id)
  } finally {
    loading.value = false
  }
}

const previewCert = () => {
  if (!certificate.value || !userStore.user) return
  window.open(previewCertificate(certificate.value.id, certificate.value.userId, userStore.user.id), '_blank')
}

const downloadCert = () => {
  if (!certificate.value || !userStore.user) return
  ElMessage.success('开始下载证明文件')
  window.location.href = downloadCertificate(certificate.value.id, certificate.value.userId, userStore.user.id)
}

const viewDownloadRecords = async () => {
  if (!certificate.value || !userStore.user) return
  try {
    downloadRecords.value = await getDownloadRecords(certificate.value.id, userStore.user.id)
    downloadRecordsVisible.value = true
  } catch (e) {
    ElMessage.error('获取下载记录失败')
  }
}

onMounted(loadCertificate)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
