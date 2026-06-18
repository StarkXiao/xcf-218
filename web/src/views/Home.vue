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
      <el-col :span="24">
        <el-card class="hot-section">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon color="#f56c6c"><HotWater /></el-icon>
                <span>高频事项专区</span>
              </div>
              <el-button type="primary" link @click="$router.push('/high-frequency')">进入专区 →</el-button>
            </div>
          </template>
          <div class="hot-banner" v-if="hotBanners.length > 0">
            <el-carousel :interval="4000" arrow="hover" height="140px">
              <el-carousel-item v-for="banner in hotBanners" :key="banner.id">
                <div class="mini-banner" @click="$router.push(`/apply/${banner.serviceItemId}`)">
                  <div class="mini-banner-content">
                    <h4>{{ banner.bannerTitle || banner.serviceItem?.name }}</h4>
                    <p>{{ banner.bannerSubtitle || banner.serviceItem?.description }}</p>
                    <el-tag type="danger" size="small" effect="dark">热门</el-tag>
                  </div>
                  <el-icon :size="60" color="#fff" style="opacity: 0.3"><Document /></el-icon>
                </div>
              </el-carousel-item>
            </el-carousel>
          </div>
          <div class="hot-quick">
            <div
              v-for="item in hotQuickItems.slice(0, 5)"
              :key="item.id"
              class="hot-quick-item"
              @click="$router.push(`/apply/${item.serviceItemId}`)"
            >
              <el-icon :size="24" color="#409eff"><Lightning /></el-icon>
              <span>{{ item.serviceItem?.name }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>为你推荐</span>
              <el-button type="primary" link @click="$router.push('/services')">查看全部 →</el-button>
            </div>
          </template>
          <el-table :data="recommendedItems" style="width: 100%" v-loading="loading">
            <el-table-column prop="name" label="事项名称" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="processingDays" label="办理时限" width="100">
              <template #default="{ row }">{{ row.processingDays }} 个工作日</template>
            </el-table-column>
            <el-table-column label="热度" width="80">
              <template #default="{ row }">
                <span class="hot-count"><el-icon><TrendCharts /></el-icon> {{ row.favoriteCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240">
              <template #default="{ row }">
                <el-button type="primary" link @click="$router.push(`/services/${row.id}`)">办理</el-button>
                <el-button
                  :type="row.isFavorited ? 'danger' : 'default'"
                  link
                  @click.stop="handleToggleFavorite(row)"
                >
                  <el-icon><Star :fill="row.isFavorited ? '#f56c6c' : 'none'" /></el-icon>
                  {{ row.isFavorited ? '已收藏' : '收藏' }}
                </el-button>
                <el-button
                  :type="row.isSubscribed ? 'success' : 'default'"
                  link
                  @click.stop="handleToggleSubscription(row)"
                >
                  <el-icon><Bell :fill="row.isSubscribed ? '#67c23a' : 'none'" /></el-icon>
                  {{ row.isSubscribed ? '已订阅' : '订阅' }}
                </el-button>
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
import { getRecommendedItems } from '@/api/service-item'
import { getApplications } from '@/api/application'
import { getUnreadCount } from '@/api/message'
import { toggleFavorite } from '@/api/favorite'
import { toggleSubscription } from '@/api/subscription'
import { getBanners, getQuickApplyItems } from '@/api/high-frequency'
import { ElMessage } from 'element-plus'
import { Star, Bell, TrendCharts, HotWater, Document, Lightning } from '@element-plus/icons-vue'
import type { ServiceItem, Application, HotItem } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const recommendedItems = ref<ServiceItem[]>([])
const recentApps = ref<Application[]>([])
const unreadCount = ref(0)
const hotBanners = ref<HotItem[]>([])
const hotQuickItems = ref<HotItem[]>([])

const quickLinks = [
  { label: '高频事项', path: '/high-frequency', icon: 'HotWater', color: '#f56c6c' },
  { label: '事项查询', path: '/services', icon: 'Search', color: '#409eff' },
  { label: '我的收藏', path: '/my-favorites', icon: 'Star', color: '#f56c6c' },
  { label: '我的订阅', path: '/my-subscriptions', icon: 'Bell', color: '#e6a23c' },
  { label: '进度跟踪', path: '/my-applications', icon: 'List', color: '#67c23a' },
  { label: '消息中心', path: '/messages', icon: 'MessageBox', color: '#909399' },
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

const handleToggleFavorite = async (item: ServiceItem) => {
  if (!userStore.user) return
  try {
    const res = await toggleFavorite(userStore.user.id, item.id)
    item.isFavorited = res.favorited
    if (res.favorited) {
      item.favoriteCount = (item.favoriteCount || 0) + 1
      ElMessage.success('收藏成功')
    } else {
      item.favoriteCount = Math.max(0, (item.favoriteCount || 0) - 1)
      ElMessage.success('已取消收藏')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleToggleSubscription = async (item: ServiceItem) => {
  if (!userStore.user) return
  try {
    const res = await toggleSubscription(userStore.user.id, item.id)
    item.isSubscribed = res.subscribed
    ElMessage.success(res.subscribed ? '订阅成功，将及时接收该事项的更新通知' : '已取消订阅')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const [items, apps, count, banners, quickItems] = await Promise.all([
      getRecommendedItems(userStore.user.id, 5),
      getApplications(userStore.user.id),
      getUnreadCount(userStore.user.id),
      getBanners(userStore.user.id),
      getQuickApplyItems(userStore.user.id),
    ])
    recommendedItems.value = items
    recentApps.value = apps.slice(0, 5)
    unreadCount.value = count
    hotBanners.value = banners
    hotQuickItems.value = quickItems
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
.hot-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f56c6c;
  font-size: 13px;
}

.hot-section {
  border-radius: 12px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.hot-banner {
  margin-bottom: 20px;
}

.mini-banner {
  height: 140px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  color: #fff;
  cursor: pointer;
}

.mini-banner-content h4 {
  font-size: 20px;
  margin: 0 0 8px 0;
}

.mini-banner-content p {
  font-size: 13px;
  opacity: 0.9;
  margin: 0 0 12px 0;
}

.hot-quick {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hot-quick-item {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  background: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.hot-quick-item:hover {
  background: #ecf5ff;
  transform: translateY(-2px);
}
</style>
