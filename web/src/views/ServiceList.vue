<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">事项查询</h2>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="searchForm" @submit.prevent>
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入事项名称"
            clearable
            style="width: 240px"
            @keyup.enter="loadItems"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部分类" clearable style="width: 200px">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadItems">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="8" v-for="item in items" :key="item.id">
        <el-card class="item-card card-hover" shadow="hover">
          <div class="item-header">
            <div class="header-left">
              <el-tag type="primary" effect="plain">{{ item.category }}</el-tag>
              <el-tag v-if="item.recommended" type="danger" effect="dark" size="small">推荐</el-tag>
            </div>
            <span class="item-code">{{ item.code }}</span>
          </div>
          <h3 class="item-name" @click="$router.push(`/services/${item.id}`)">{{ item.name }}</h3>
          <p class="item-desc">{{ item.description }}</p>
          <div class="item-stats">
            <span><el-icon><View /></el-icon> {{ item.viewCount || 0 }}</span>
            <span><el-icon><Star /></el-icon> {{ item.favoriteCount || 0 }}</span>
          </div>
          <div class="item-footer">
            <div class="footer-actions">
              <el-button
                :type="item.isFavorited ? 'danger' : 'default'"
                size="small"
                @click.stop="handleToggleFavorite(item)"
              >
                <el-icon><Star :fill="item.isFavorited ? '#f56c6c' : 'none'" /></el-icon>
                {{ item.isFavorited ? '已收藏' : '收藏' }}
              </el-button>
              <el-button
                :type="item.isSubscribed ? 'success' : 'default'"
                size="small"
                @click.stop="handleToggleSubscription(item)"
              >
                <el-icon><Bell :fill="item.isSubscribed ? '#67c23a' : 'none'" /></el-icon>
                {{ item.isSubscribed ? '已订阅' : '订阅' }}
              </el-button>
            </div>
            <el-button type="primary" size="small" @click="$router.push(`/services/${item.id}`)">
              查看详情
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-empty v-if="!loading && items.length === 0" description="暂无匹配的事项" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getServiceItems, getCategories } from '@/api/service-item'
import { toggleFavorite } from '@/api/favorite'
import { toggleSubscription } from '@/api/subscription'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Search, Clock, View, Star, Bell } from '@element-plus/icons-vue'
import type { ServiceItem } from '@/types'

const userStore = useUserStore()
const loading = ref(false)
const items = ref<ServiceItem[]>([])
const categories = ref<string[]>([])

const searchForm = reactive({
  keyword: '',
  category: '',
})

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

const loadItems = async () => {
  loading.value = true
  try {
    items.value = await getServiceItems(searchForm.keyword, searchForm.category, userStore.user?.id)
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  categories.value = await getCategories()
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.category = ''
  loadItems()
}

onMounted(() => {
  loadCategories()
  loadItems()
})
</script>

<style scoped>
.item-card {
  margin-bottom: 20px;
  cursor: pointer;
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.item-code {
  font-size: 12px;
  color: #909399;
}
.item-name {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  cursor: pointer;
}
.item-name:hover {
  color: #409eff;
}
.item-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #909399;
}
.item-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.footer-actions {
  display: flex;
  gap: 8px;
}
.processing-days {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
</style>
