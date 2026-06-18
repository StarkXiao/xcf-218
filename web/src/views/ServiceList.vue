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
            <el-tag type="primary" effect="plain">{{ item.category }}</el-tag>
            <span class="item-code">{{ item.code }}</span>
          </div>
          <h3 class="item-name" @click="$router.push(`/services/${item.id}`)">{{ item.name }}</h3>
          <p class="item-desc">{{ item.description }}</p>
          <div class="item-footer">
            <span class="processing-days">
              <el-icon><Clock /></el-icon>
              {{ item.processingDays }} 个工作日
            </span>
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
import type { ServiceItem } from '@/types'

const loading = ref(false)
const items = ref<ServiceItem[]>([])
const categories = ref<string[]>([])

const searchForm = reactive({
  keyword: '',
  category: '',
})

const loadItems = async () => {
  loading.value = true
  try {
    items.value = await getServiceItems(searchForm.keyword, searchForm.category)
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
.processing-days {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
</style>
