<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">窗口办理记录</h2>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <div class="filter-bar">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 200px"
              @change="loadData"
            />
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 160px"
              @change="loadData"
            >
              <el-option label="已受理" value="accepted" />
              <el-option label="办理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="loadData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <el-table :data="handlings" style="width: 100%">
            <el-table-column label="排队号" width="140">
              <template #default="{ row }">
                <span class="queue-no">{{ row.queueNumber }}</span>
              </template>
            </el-table-column>
            <el-table-column label="受理编号" width="180" prop="handlingNo" />
            <el-table-column label="窗口" width="100">
              <template #default="{ row }">{{ row.windowNumber }}号窗口</template>
            </el-table-column>
            <el-table-column label="办事事项" min-width="180">
              <template #default="{ row }">{{ row.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="线上同步" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.syncStatus === 'synced'" type="success">已同步</el-tag>
                <el-tag v-else type="warning">待同步</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="受理时间" width="180">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="showDetail(row)">
                  详情
                </el-button>
                <el-button
                  v-if="row.applicationId"
                  type="primary"
                  link
                  size="small"
                  @click="$router.push(`/applications/${row.applicationId}`)"
                >
                  线上进度
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && handlings.length === 0" description="暂无窗口办理记录" style="padding: 60px 0" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="detailVisible" title="窗口办理详情" width="600px">
      <div v-if="currentHandling" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="受理编号">{{ currentHandling.handlingNo }}</el-descriptions-item>
          <el-descriptions-item label="排队号">
            <span class="queue-no">{{ currentHandling.queueNumber }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="办事事项">{{ currentHandling.serviceItem?.name }}</el-descriptions-item>
          <el-descriptions-item label="办理窗口">{{ currentHandling.windowNumber }}号窗口</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentHandling.applicantName || currentHandling.user?.name }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentHandling.applicantPhone || currentHandling.user?.phone }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(currentHandling.status)">{{ statusText(currentHandling.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="同步状态">
            <el-tag v-if="currentHandling.syncStatus === 'synced'" type="success">已同步线上</el-tag>
            <el-tag v-else type="warning">待同步</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="受理时间" :span="2">
            {{ formatDateTime(currentHandling.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentHandling.processingAt" label="开始办理时间" :span="2">
            {{ formatDateTime(currentHandling.processingAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentHandling.completedAt" label="完成时间" :span="2">
            {{ formatDateTime(currentHandling.completedAt) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentHandling.handlingRemark" label="办理备注" :span="2">
            {{ currentHandling.handlingRemark }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentHandling.syncRemark" label="同步备注" :span="2">
            {{ currentHandling.syncRemark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getWindowHandlings } from '@/api/window-coordination'
import type { WindowHandling } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()
const loading = ref(false)
const handlings = ref<WindowHandling[]>([])
const filterDate = ref('')
const filterStatus = ref('')
const detailVisible = ref(false)
const currentHandling = ref<WindowHandling | null>(null)

const statusText = (status: string) => {
  const map: Record<string, string> = {
    accepted: '已受理',
    processing: '办理中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    accepted: 'warning',
    processing: 'primary',
    completed: 'success',
    cancelled: 'info',
  }
  return map[status] || ''
}

const formatDateTime = (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')

const loadData = async () => {
  if (!userStore.user?.id) return
  loading.value = true
  try {
    handlings.value = await getWindowHandlings({
      userId: userStore.user.id,
      date: filterDate.value || undefined,
      status: filterStatus.value || undefined,
    })
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

const showDetail = (row: WindowHandling) => {
  currentHandling.value = row
  detailVisible.value = true
}

onMounted(loadData)
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.queue-no {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
}
.detail-content {
  padding: 10px 0;
}
</style>
