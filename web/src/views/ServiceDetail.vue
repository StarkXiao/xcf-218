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
import type { ServiceItem } from '@/types'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const item = ref<ServiceItem | null>(null)
const materialList = ref<any[]>([])

const loadItem = async () => {
  loading.value = true
  try {
    item.value = await getServiceItemById(Number(route.params.id))
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
.content-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  padding: 0 8px;
}
</style>
