<template>
  <div class="home-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <div class="welcome-content">
            <div>
              <h2>欢迎使用政务办事大厅，{{ userStore.user?.name }}</h2>
              <p>在线办理政务服务，高效便捷，省时省心</p>
            </div>
            <div class="welcome-stats">
              <div class="stat-item">
                <span class="stat-label">我的申请</span>
                <span class="stat-value">{{ myAppCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">待办事项</span>
                <span class="stat-value">{{ pendingCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">未读消息</span>
                <span class="stat-value">{{ unreadCount }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快捷入口</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6" v-for="item in quickLinks" :key="item.path">
              <div class="quick-item" @click="$router.push(item.path)">
                <el-icon :size="36" :color="item.color"><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>热门事项</span>
              <el-button type="primary" link @click="$router.push('/services')">查看全部 →</el-button>
            </div>
          </template>
          <el-table :data="hotItems" style="width: 100%" v-loading="loading">
            <el-table-column prop="name" label="事项名称" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="processingDays" label="办理时限" width="100">
              <template #default="{ row }">{{ row.processingDays }} 个工作日</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="$router.push(`/services/${row.id}`)">办理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>最近申请</span>
              <el-button type="primary" link @click="$router.push('/my-applications')">查看全部 →</el-button>
            </div>
          </template>
          <el-table :data="recentApps" style="width: 100%" v-loading="loading">
            <el-table-column prop="applicationNo" label="申请编号" width="180" />
            <el-table-column label="事项名称">
              <template #default="{ row }">{{ row.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && recentApps.length === 0" description="暂无申请记录" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getServiceItems } from '@/api/service-item'
import { getApplications } from '@/api/application'
import { getUnreadCount } from '@/api/message'
import type { ServiceItem, Application } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const hotItems = ref<ServiceItem[]>([])
const recentApps = ref<Application[]>([])
const unreadCount = ref(0)

const quickLinks = [
  { label: '事项查询', path: '/services', icon: 'Search', color: '#409eff' },
  { label: '进度跟踪', path: '/my-applications', icon: 'List', color: '#67c23a' },
  { label: '消息中心', path: '/messages', icon: 'Bell', color: '#e6a23c' },
  { label: '管理后台', path: userStore.isAdmin ? '/admin' : '/home', icon: 'Setting', color: '#f56c6c' },
]

const myAppCount = computed(() => recentApps.value.length)
const pendingCount = computed(() => recentApps.value.filter(a => a.status === 'submitted' || a.status === 'reviewing').length)

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

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const [items, apps, count] = await Promise.all([
      getServiceItems(),
      getApplications(userStore.user.id),
      getUnreadCount(userStore.user.id),
    ])
    hotItems.value = items.slice(0, 5)
    recentApps.value = apps.slice(0, 5)
    unreadCount.value = count
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.welcome-card {
  background: linear-gradient(135deg, #1d4e89 0%, #2c7da0 100%);
  border: none;
}
.welcome-card :deep(.el-card__body) {
  padding: 32px;
}
.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}
.welcome-content h2 {
  font-size: 24px;
  margin-bottom: 8px;
}
.welcome-content p {
  font-size: 14px;
  opacity: 0.85;
}
.welcome-stats {
  display: flex;
  gap: 40px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-label {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: #f5f7fa;
}
.quick-item:hover {
  background: #ecf5ff;
  transform: translateY(-4px);
}
.quick-item span {
  margin-top: 12px;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
</style>
