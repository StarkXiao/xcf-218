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
        <el-form-item>
          <el-button type="primary" @click="loadCertificates">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="certificates" style="width: 100%">
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
        <el-table-column prop="issuedAt" label="发证日期" width="180">
          <template #default="{ row }">{{ formatDate(row.issuedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看详情</el-button>
            <el-button type="success" link @click="previewCert(row)">预览</el-button>
            <el-button type="primary" link @click="downloadCert(row)">下载</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && certificates.length === 0" description="暂无证明记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getCertificates, previewCertificate, downloadCertificate } from '@/api/certificate'
import type { Certificate } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const certificates = ref<Certificate[]>([])

const filterForm = reactive({
  status: '',
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

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadCertificates = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    certificates.value = await getCertificates(
      userStore.user.id,
      filterForm.status || undefined
    )
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
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

onMounted(loadCertificates)
</script>
