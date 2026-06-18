<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">代办人申请管理</h2>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-label">申请总数</div>
            <div class="stat-value">{{ statistics?.totalApplications || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-label">待审核</div>
            <div class="stat-value warning">{{ statistics?.submittedCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-label">已通过</div>
            <div class="stat-value success">{{ statistics?.approvedCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-label">高风险申请</div>
            <div class="stat-value danger">{{ statistics?.highRiskCount || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

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
        <el-table-column label="委托人" width="160">
          <template #default="{ row }">
            <div>{{ row.principal?.name }}</div>
            <div style="color: #909399; font-size: 12px">{{ maskIdCard(row.principal?.idCard || '') }}</div>
          </template>
        </el-table-column>
        <el-table-column label="代办人" width="160">
          <template #default="{ row }">
            <div>{{ row.proxyName }}</div>
            <div style="color: #909399; font-size: 12px">{{ maskIdCard(row.proxyIdCard) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="proxyRelation" label="关系" width="100" />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.riskLevel)" size="small">
              {{ row.riskLevel }} 级
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
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
              审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && applications.length === 0" description="暂无申请数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProxyStatistics, getAllProxyApplications } from '@/api/proxy'
import type { ProxyApplication, ProxyStatistics } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const activeTab = ref('all')
const applications = ref<ProxyApplication[]>([])
const statistics = ref<ProxyStatistics | null>(null)

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

const loadStatistics = async () => {
  try {
    statistics.value = await getProxyStatistics()
  } catch (e) {
  }
}

const loadApplications = async () => {
  loading.value = true
  try {
    const status = activeTab.value === 'all' ? undefined : activeTab.value
    applications.value = await getAllProxyApplications(status)
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  loadApplications()
}

const viewDetail = (row: ProxyApplication) => {
  router.push(`/proxy-applications/${row.id}`)
}

onMounted(() => {
  loadStatistics()
  loadApplications()
})
</script>

<style scoped>
.stat-card {
  text-align: center;
}
.stat-item .stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-item .stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}
.stat-item .stat-value.warning {
  color: #e6a23c;
}
.stat-item .stat-value.success {
  color: #67c23a;
}
.stat-item .stat-value.danger {
  color: #f56c6c;
}
</style>
