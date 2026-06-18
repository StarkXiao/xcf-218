<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回列表
    </el-button>

    <el-card v-if="item">
      <div class="detail-header">
        <div>
          <el-tag type="primary" effect="dark" size="large" style="margin-right: 12px">
            {{ item.category }}
          </el-tag>
          <h2 class="detail-title">{{ item.name }}</h2>
          <p class="detail-code">事项编码：{{ item.code }}</p>
        </div>
        <div class="detail-actions">
          <div class="processing-info">
            <el-icon :size="20" color="#e6a23c"><Clock /></el-icon>
            <div>
              <span class="label">办理时限</span>
              <span class="value">{{ item.processingDays }} 个工作日</span>
            </div>
          </div>
          <div class="stats-row">
            <div class="stat-item">
              <el-icon :size="16" color="#f56c6c"><View /></el-icon>
              <span>{{ item.viewCount || 0 }} 浏览</span>
            </div>
            <div class="stat-item">
              <el-icon :size="16" color="#f56c6c"><Star /></el-icon>
              <span>{{ item.favoriteCount || 0 }} 收藏</span>
            </div>
          </div>
          <div class="follow-actions">
            <el-button
              :type="item.isFavorited ? 'danger' : 'default'"
              @click="handleToggleFavorite"
            >
              <el-icon><Star :fill="item.isFavorited ? '#f56c6c' : 'none'" /></el-icon>
              {{ item.isFavorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button
              :type="item.isSubscribed ? 'success' : 'default'"
              @click="handleToggleSubscription"
            >
              <el-icon><Bell :fill="item.isSubscribed ? '#67c23a' : 'none'" /></el-icon>
              {{ item.isSubscribed ? '已订阅' : '订阅' }}
            </el-button>
          </div>
          <div class="action-buttons">
            <el-button type="success" size="large" @click="goBook">
              <el-icon><Calendar /></el-icon> 预约取号
            </el-button>
            <el-button type="primary" size="large" @click="goApply">
              <el-icon><EditPen /></el-icon> 直接办理
            </el-button>
          </div>
        </div>
      </div>

      <el-divider />

      <div class="content-section">
        <h3 class="section-title">事项描述</h3>
        <p class="content-text">{{ item.description }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">办理条件</h3>
        <p class="content-text">{{ item.requirements }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">所需材料</h3>
        <el-table :data="materialList" style="width: 100%">
          <el-table-column type="index" label="序号" width="80" />
          <el-table-column prop="name" label="材料名称" />
          <el-table-column label="是否必需" width="120">
            <template #default="{ row }">
              <el-tag :type="row.required ? 'danger' : 'info'">
                {{ row.required ? '必需' : '选填' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getServiceItemById } from '@/api/service-item'
import { toggleFavorite } from '@/api/favorite'
import { toggleSubscription } from '@/api/subscription'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Star, Bell, View, Clock, Calendar, EditPen } from '@element-plus/icons-vue'
import type { ServiceItem } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const item = ref<ServiceItem | null>(null)
const materialList = ref<any[]>([])

const loadItem = async () => {
  loading.value = true
  try {
    item.value = await getServiceItemById(Number(route.params.id), userStore.user?.id)
    if (item.value?.materials) {
      try {
        materialList.value = JSON.parse(item.value.materials)
      } catch {
        materialList.value = []
      }
    }
  } finally {
    loading.value = false
  }
}

const handleToggleFavorite = async () => {
  if (!userStore.user || !item.value) return
  try {
    const res = await toggleFavorite(userStore.user.id, item.value.id)
    item.value.isFavorited = res.favorited
    if (res.favorited) {
      item.value.favoriteCount = (item.value.favoriteCount || 0) + 1
      ElMessage.success('收藏成功')
    } else {
      item.value.favoriteCount = Math.max(0, (item.value.favoriteCount || 0) - 1)
      ElMessage.success('已取消收藏')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleToggleSubscription = async () => {
  if (!userStore.user || !item.value) return
  try {
    const res = await toggleSubscription(userStore.user.id, item.value.id)
    item.value.isSubscribed = res.subscribed
    ElMessage.success(res.subscribed ? '订阅成功，将及时接收该事项的更新通知' : '已取消订阅')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const goBook = () => {
  router.push(`/book/${route.params.id}`)
}

const goApply = () => {
  router.push(`/apply/${route.params.id}`)
}

onMounted(loadItem)
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detail-title {
  font-size: 24px;
  font-weight: 600;
  margin: 12px 0 8px;
  color: #303133;
}
.detail-code {
  font-size: 14px;
  color: #909399;
}
.detail-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}
.processing-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fdf6ec;
  padding: 12px 20px;
  border-radius: 4px;
}
.processing-info .label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.processing-info .value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #e6a23c;
}
.stats-row {
  display: flex;
  gap: 20px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
.follow-actions {
  display: flex;
  gap: 8px;
}
.content-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  padding: 0 8px;
}
</style>
