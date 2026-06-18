<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">管理后台</h2>
    </div>

    <el-row :gutter="20">
      <el-col :span="6" v-for="stat in stats" :key="stat.key">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="36" :color="stat.color"><component :is="stat.icon" /></el-icon>
            <div class="stat-info">
              <span class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card class="card-hover" shadow="hover" @click="$router.push('/admin/schedule')" style="cursor: pointer">
          <div class="quick-card">
            <el-icon :size="40" color="#409eff"><Calendar /></el-icon>
            <div>
              <div class="quick-title">排班管理</div>
              <div class="quick-desc">设置办事事项的可预约时段和容量</div>
            </div>
            <el-icon :size="20" color="#c0c4cc"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="card-hover" shadow="hover" @click="$router.push('/admin/appointments')" style="cursor: pointer">
          <div class="quick-card">
            <el-icon :size="40" color="#67c23a"><Tickets /></el-icon>
            <div>
              <div class="quick-title">预约办理</div>
              <div class="quick-desc">处理预约签到、叫号和现场办理</div>
            </div>
            <el-icon :size="20" color="#c0c4cc"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>申请审核</span>
              <el-select v-model="filterStatus" placeholder="全部状态" style="width: 140px" @change="loadApplications">
                <el-option label="全部" value="" />
                <el-option label="待审核" value="submitted" />
                <el-option label="审核中" value="reviewing" />
                <el-option label="已通过" value="approved" />
                <el-option label="已驳回" value="rejected" />
                <el-option label="已完成" value="completed" />
              </el-select>
            </div>
          </template>
          <el-table :data="applications" style="width: 100%" v-loading="loading">
            <el-table-column prop="applicationNo" label="申请编号" width="200" />
            <el-table-column label="事项名称" min-width="160">
              <template #default="{ row }">{{ row.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="申请人" width="100">
              <template #default="{ row }">{{ row.user?.name }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="提交时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button type="primary" link @click="$router.push(`/admin/review/${row.id}`)">
                  {{ row.status === 'submitted' || row.status === 'reviewing' ? '审核' : '查看' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && applications.length === 0" description="暂无申请" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStatistics } from '@/api/admin'
import { getApplications } from '@/api/application'
import type { Application, Statistics } from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const statistics = ref<Statistics | null>(null)
const applications = ref<Application[]>([])
const filterStatus = ref('')

const stats = computed(() => [
  { key: 'total', label: '申请总数', value: statistics.value?.totalApplications || 0, icon: 'Document', color: '#409eff' },
  { key: 'pending', label: '待审核', value: statistics.value?.pendingCount || 0, icon: 'Clock', color: '#e6a23c' },
  { key: 'reviewing', label: '审核中', value: statistics.value?.reviewingCount || 0, icon: 'Loading', color: '#909399' },
  { key: 'approved', label: '已通过', value: statistics.value?.approvedCount || 0, icon: 'CircleCheck', color: '#67c23a' },
  { key: 'rejected', label: '已驳回', value: statistics.value?.rejectedCount || 0, icon: 'CircleClose', color: '#f56c6c' },
  { key: 'completed', label: '已完成', value: statistics.value?.completedCount || 0, icon: 'Finished', color: '#67c23a' },
  { key: 'users', label: '注册用户', value: statistics.value?.userCount || 0, icon: 'User', color: '#909399' },
  { key: 'items', label: '办事事项', value: statistics.value?.itemCount || 0, icon: 'Menu', color: '#409eff' },
])

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
    submitted: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
  }
  return map[status] || status
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadData = async () => {
  statistics.value = await getStatistics()
}

const loadApplications = async () => {
  loading.value = true
  try {
    applications.value = await getApplications(undefined, filterStatus.value || undefined)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
  loadApplications()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.stat-card {
  margin-bottom: 20px;
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.quick-card {
  display: flex;
  align-items: center;
  gap: 16px;
}
.quick-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.quick-desc {
  font-size: 13px;
  color: #909399;
}
.quick-card > div:nth-child(2) {
  flex: 1;
}
</style>
