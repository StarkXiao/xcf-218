<template>
  <div class="high-frequency-page" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">
        <el-icon :size="28" color="#409eff"><HotWater /></el-icon>
        高频事项专区
      </h2>
      <p class="page-subtitle">集中展示热门办事事项，快速办理更便捷</p>
    </div>

    <el-carousel v-if="banners.length > 0" :interval="4000" arrow="always" class="banner-carousel">
      <el-carousel-item v-for="banner in banners" :key="banner.id">
        <div class="banner-item" @click="handleBannerClick(banner)">
          <div class="banner-content">
            <h3>{{ banner.bannerTitle || banner.serviceItem?.name }}</h3>
            <p>{{ banner.bannerSubtitle || banner.serviceItem?.description }}</p>
            <el-button type="primary" size="large" class="banner-btn">
              立即办理 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="banner-icon">
            <el-icon :size="120"><Document /></el-icon>
          </div>
        </div>
      </el-carousel-item>
    </el-carousel>

    <el-row :gutter="20" class="section-row">
      <el-col :span="24">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon color="#f56c6c"><Lightning /></el-icon>
                <span>快捷申报</span>
              </div>
              <span class="header-desc">一键直达热门事项办理</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6" v-for="item in quickApplyItems" :key="item.id">
              <div class="quick-item" @click="handleQuickApply(item)">
                <div class="quick-icon">
                  <el-icon :size="40" :color="getIconColor(item.id)"><DocumentAdd /></el-icon>
                </div>
                <div class="quick-info">
                  <h4>{{ item.serviceItem?.name }}</h4>
                  <p>{{ item.quickApplyTips || '点击立即办理' }}</p>
                </div>
                <el-tag v-if="item.serviceItem?.applicationCount" type="danger" size="small" effect="dark">
                  {{ item.serviceItem.applicationCount }} 人已办
                </el-tag>
              </div>
            </el-col>
          </el-row>
          <el-empty v-if="quickApplyItems.length === 0" description="暂无快捷申报事项" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="section-row">
      <el-col :span="16">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon color="#409eff"><Menu /></el-icon>
                <span>分类聚合</span>
              </div>
              <el-radio-group v-model="activeCategory" size="small" @change="handleCategoryChange">
                <el-radio-button :label="0">全部</el-radio-button>
                <el-radio-button v-for="cat in categories" :key="cat.id" :label="cat.id">
                  {{ cat.name }}
                </el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="category-items">
            <el-row :gutter="20">
              <el-col :span="12" v-for="item in filteredItems" :key="item.id">
                <div class="service-card" @click="handleServiceClick(item)">
                  <div class="service-header">
                    <h4>{{ item.serviceItem?.name }}</h4>
                    <el-tag :type="getStatusType(item.serviceItem?.category!)" size="small">
                      {{ item.serviceItem?.category }}
                    </el-tag>
                  </div>
                  <p class="service-desc">{{ item.serviceItem?.description }}</p>
                  <div class="service-meta">
                    <span><el-icon><Clock /></el-icon> {{ item.serviceItem?.processingDays }} 个工作日</span>
                    <span><el-icon><TrendCharts /></el-icon> 热度 {{ getHotItemHeatScore(item) }}</span>
                  </div>
                  <div class="service-actions">
                    <el-button type="primary" size="small" @click.stop="handleApply(item)">
                      立即办理
                    </el-button>
                    <el-button size="small" @click.stop="handleViewDetail(item)">
                      查看详情
                    </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
            <el-empty v-if="filteredItems.length === 0" description="该分类下暂无事项" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="section-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon color="#f56c6c"><Trophy /></el-icon>
                <span>热度排行</span>
              </div>
              <span class="header-desc">本周热门事项</span>
            </div>
          </template>
          <div class="ranking-list">
            <div
              v-for="(item, index) in rankingItems"
              :key="item.id"
              class="ranking-item"
              @click="handleRankingClick(item)"
            >
              <div class="ranking-number" :class="'rank-' + (index + 1)">
                {{ index + 1 }}
              </div>
              <div class="ranking-info">
                <h4>{{ item.name }}</h4>
                <div class="ranking-meta">
                  <span><el-icon><TrendCharts /></el-icon> {{ item.applicationCount || 0 }} 办理</span>
                  <span><el-icon><Star /></el-icon> {{ item.favoriteCount || 0 }} 收藏</span>
                </div>
              </div>
              <div class="ranking-score">
                <span class="score-label">热度</span>
                <span class="score-value">{{ getHeatScore(item) }}</span>
              </div>
            </div>
          </div>
          <el-empty v-if="rankingItems.length === 0" description="暂无排行数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { HotWater, ArrowRight, Document, Lightning, DocumentAdd, Menu, Clock, TrendCharts, Trophy, Star } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getBanners,
  getQuickApplyItems,
  getHotCategories,
  getHotItems,
  getItemsByCategory,
  getHotRanking,
  incrementClickCount,
} from '@/api/high-frequency'
import type { HotItem, HotCategory, ServiceItem } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const banners = ref<HotItem[]>([])
const quickApplyItems = ref<HotItem[]>([])
const categories = ref<HotCategory[]>([])
const allItems = ref<HotItem[]>([])
const categoryItems = ref<HotItem[]>([])
const rankingItems = ref<ServiceItem[]>([])
const activeCategory = ref(0)

const iconColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#009688']

const getIconColor = (id: number) => iconColors[id % iconColors.length]

const getStatusType = (category: string): string => {
  const map: Record<string, string> = {
    '户政服务': 'primary',
    '社会保障': 'success',
    '市场监管': 'warning',
    '不动产登记': 'info',
    '出入境管理': 'danger',
    '住房公积金': 'success',
  }
  return map[category] || 'info'
}

const getHeatScore = (item?: ServiceItem, extraClicks = 0) => {
  if (!item) return 0
  const applications = item.applicationCount || 0
  const favorites = item.favoriteCount || 0
  const subscriptions = item.subscriptionCount || 0
  const views = item.viewCount || 0
  return Math.round(applications * 10 + favorites * 5 + subscriptions * 3 + views * 0.1 + extraClicks * 2)
}

const getHotItemHeatScore = (hotItem?: HotItem) => {
  if (!hotItem?.serviceItem) return 0
  return getHeatScore(hotItem.serviceItem, hotItem.clickCount || 0)
}

const filteredItems = computed(() => {
  if (activeCategory.value === 0) {
    return allItems.value
  }
  return categoryItems.value
})

const handleBannerClick = async (banner: HotItem) => {
  try {
    await incrementClickCount(banner.id)
  } catch (e) {}
  if (banner.serviceItemId) {
    router.push(`/apply/${banner.serviceItemId}`)
  }
}

const handleQuickApply = async (item: HotItem) => {
  try {
    await incrementClickCount(item.id)
  } catch (e) {}
  if (item.serviceItemId) {
    router.push(`/apply/${item.serviceItemId}`)
  }
}

const handleServiceClick = (item: HotItem) => {
  if (item.serviceItemId) {
    router.push(`/services/${item.serviceItemId}`)
  }
}

const handleApply = (item: HotItem) => {
  if (item.serviceItemId) {
    router.push(`/apply/${item.serviceItemId}`)
  }
}

const handleViewDetail = (item: HotItem) => {
  if (item.serviceItemId) {
    router.push(`/services/${item.serviceItemId}`)
  }
}

const handleRankingClick = (item: ServiceItem) => {
  router.push(`/services/${item.id}`)
}

const handleCategoryChange = async (categoryId: number) => {
  if (categoryId === 0) return
  loading.value = true
  try {
    categoryItems.value = await getItemsByCategory(categoryId, userStore.user?.id)
  } catch (e) {
    ElMessage.error('加载分类数据失败')
  } finally {
    loading.value = false
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const userId = userStore.user?.id
    const [bannersData, quickData, catsData, itemsData, rankingData] = await Promise.all([
      getBanners(userId),
      getQuickApplyItems(userId),
      getHotCategories(),
      getHotItems(userId),
      getHotRanking(10, userId),
    ])
    banners.value = bannersData
    quickApplyItems.value = quickData
    categories.value = catsData
    allItems.value = itemsData
    rankingItems.value = rankingData
  } catch (e) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.high-frequency-page {
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 8px;
}

.page-subtitle {
  color: #909399;
  font-size: 14px;
}

.banner-carousel {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
}

.banner-item {
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 60px;
  color: #fff;
  cursor: pointer;
}

.banner-item:nth-child(2n) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.banner-item:nth-child(3n) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.banner-content h3 {
  font-size: 28px;
  margin-bottom: 12px;
}

.banner-content p {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 20px;
}

.banner-btn {
  border: none;
}

.banner-icon {
  opacity: 0.3;
}

.section-row {
  margin-bottom: 24px;
}

.section-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.header-desc {
  color: #909399;
  font-size: 13px;
}

.quick-item {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.quick-item:hover {
  background: #ecf5ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.quick-icon {
  width: 64px;
  height: 64px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.quick-info {
  flex: 1;
}

.quick-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.quick-info p {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.quick-item .el-tag {
  position: absolute;
  top: 12px;
  right: 12px;
}

.category-items {
  min-height: 300px;
}

.service-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.service-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.service-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.service-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 16px;
}

.service-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.service-actions {
  display: flex;
  gap: 8px;
}

.ranking-list {
  min-height: 300px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.ranking-item:hover {
  background: #f5f7fa;
}

.ranking-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #c0c4cc;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  margin-right: 12px;
  flex-shrink: 0;
}

.ranking-number.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb800);
}

.ranking-number.rank-2 {
  background: linear-gradient(135deg, #c0c4cc, #909399);
}

.ranking-number.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b8860b);
}

.ranking-info {
  flex: 1;
  min-width: 0;
}

.ranking-info h4 {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #909399;
}

.ranking-meta span {
  display: flex;
  align-items: center;
  gap: 2px;
}

.ranking-score {
  text-align: right;
  flex-shrink: 0;
}

.score-label {
  display: block;
  font-size: 11px;
  color: #909399;
}

.score-value {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
}
</style>
