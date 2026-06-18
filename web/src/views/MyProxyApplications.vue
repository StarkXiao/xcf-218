<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的代办人申请</h2>
      <el-button type="primary" :icon="Plus" @click="goToApply">
        新增代办人
      </el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审核" name="submitted" />
        <el-tab-pane label="审核中" name="reviewing" />
        <el-tab-pane label="已通过" name="approved" />
        <el-tab-pane label="已驳回" name="rejected" />
      </el-tabs>

      <el-table :data="applications" v-loading="loading" style="width: 100%">
        <el-table-column prop="applicationNo" label="申请编号" width="200" />
        <el-table-column prop="proxyName" label="代办人姓名" width="120" />
        <el-table-column prop="proxyIdCard" label="代办人身份证" width="200">
          <template #default="{ row }">{{ maskIdCard(row.proxyIdCard) }}</template>
        </el-table-column>
        <el-table-column prop="proxyRelation" label="与委托人关系" width="140" />
        <el-table-column label="风险等级" width="120">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.riskLevel)">
              {{ row.riskLevel }} 级
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && applications.length === 0" description="暂无代办人申请" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getMyProxyApplications } from '@/api/proxy'
import type { ProxyApplication } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const activeTab = ref('all')
const applications = ref<ProxyApplication[]>([])

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
  }
  return map[status] || status
}

const getRiskTagType = (level: number) => {
  if (level >= 4) return 'danger'
  if (level >= 2) return 'warning'
  return 'success'
}

const maskIdCard = (idCard: string) => {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.slice(0, 4) + '********' + idCard.slice(-4)
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const data = await getMyProxyApplications(userStore.user.id)
    if (activeTab.value === 'all') {
      applications.value = data
    } else {
      applications.value = data.filter(a => a.status === activeTab.value)
    }
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  loadData()
}

const goToApply = () => {
  router.push('/proxy-apply')
}

const viewDetail = (row: ProxyApplication) => {
  router.push(`/proxy-applications/${row.id}`)
}

onMounted(loadData)
</script>

<style scoped>
</style>
