<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的证明</h2>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 160px">
            <el-option label="已生成" value="generated" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="到期状态">
          <el-select v-model="filterForm.expiryStatus" placeholder="全部" clearable style="width: 160px">
            <el-option label="正常" value="normal" />
            <el-option label="即将到期" value="expiring" />
            <el-option label="紧急" value="urgent" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCertificates">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="filteredCertificates" style="width: 100%">
        <el-table-column prop="certificateNo" label="证明编号" width="220" />
        <el-table-column label="证明类型" width="120">
          <template #default="{ row }">{{ row.certificateType }}</template>
        </el-table-column>
        <el-table-column label="事项名称">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期状态" width="120">
          <template #default="{ row }">
            <el-tag
              v-if="row.expiryStatus"
              :type="getExpiryStatusType(row.expiryStatus)"
              effect="dark"
            >
              {{ getExpiryStatusText(row.expiryStatus, row.daysToExpiry) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="issuedAt" label="发证日期" width="180">
          <template #default="{ row }">{{ formatDate(row.issuedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="expiredAt" label="到期日期" width="180">
          <template #default="{ row }">
            <span v-if="row.expiredAt">{{ formatDate(row.expiredAt) }}</span>
            <span v-else>长期有效</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看详情</el-button>
            <el-button type="success" link @click="previewCert(row)">预览</el-button>
            <el-button type="primary" link @click="downloadCert(row)">下载</el-button>
            <el-button
              v-if="row.expiredAt && row.status === 'generated' && !row.archived"
              type="warning"
              link
              @click="goToRenew(row)"
            >
              {{ row.expiryStatus === 'expired' ? '立即续办' : '申请续办' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && certificates.length === 0" description="暂无证明记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getCertificates, previewCertificate, downloadCertificate, getCertificatesWithExpiryStatus, getRenewalInfo } from '@/api/certificate'
import type { Certificate } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const certificates = ref<Certificate[]>([])

const filterForm = reactive({
  status: '',
  expiryStatus: '',
})

const filteredCertificates = computed(() => {
  let result = certificates.value
  if (filterForm.status) {
    result = result.filter(c => c.status === filterForm.status)
  }
  if (filterForm.expiryStatus) {
    result = result.filter(c => c.expiryStatus === filterForm.expiryStatus)
  }
  return result
})

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

const getExpiryStatusType = (status: string) => {
  const map: Record<string, string> = {
    normal: 'success',
    expiring: 'warning',
    urgent: 'danger',
    expired: 'info',
  }
  return map[status] || 'info'
}

const getExpiryStatusText = (status: string, daysToExpiry?: number) => {
  if (status === 'expired') {
    return `已过期${daysToExpiry !== undefined ? Math.abs(daysToExpiry) + '天' : ''}`
  }
  if (status === 'urgent') {
    return `剩${daysToExpiry}天`
  }
  if (status === 'expiring') {
    return `剩${daysToExpiry}天`
  }
  const map: Record<string, string> = {
    normal: '正常',
    expiring: '即将到期',
    urgent: '紧急',
    expired: '已过期',
  }
  return map[status] || status
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadCertificates = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    certificates.value = await getCertificatesWithExpiryStatus()
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
  filterForm.expiryStatus = ''
  loadCertificates()
}

const viewDetail = (cert: Certificate) => {
  router.push(`/certificates/${cert.id}`)
}

const previewCert = (cert: Certificate) => {
  if (!userStore.user) return
  window.open(previewCertificate(cert.id, userStore.user.id, userStore.user.id), '_blank')
}

const downloadCert = (cert: Certificate) => {
  if (!userStore.user) return
  ElMessage.success('开始下载证明文件')
  window.location.href = downloadCertificate(cert.id, userStore.user.id, userStore.user.id)
}

const goToRenew = async (cert: Certificate) => {
  try {
    const expiryText = cert.expiryStatus === 'expired' ? '该证照已过期' : `该证照将在${cert.daysToExpiry}天后到期`
    await ElMessageBox.confirm(
      `${expiryText}，确定要申请续办吗？`,
      '证照续办',
      {
        confirmButtonText: '立即续办',
        cancelButtonText: '取消',
        type: cert.expiryStatus === 'expired' ? 'error' : 'warning',
      }
    )
    const renewalInfo = await getRenewalInfo(cert.id)
    if (renewalInfo.renewalServiceItem) {
      router.push(`/apply/${renewalInfo.renewalServiceItem.id}?renewal=1&certificateId=${cert.id}`)
    } else {
      ElMessage.warning('未找到可续办的事项')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('获取续办信息失败', error)
    }
  }
}

onMounted(loadCertificates)
</script>
