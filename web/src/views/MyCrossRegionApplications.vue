<template>
  <div class="page-container">
    <el-card>
      <div class="page-header">
        <h2 class="page-title">我的异地办理</h2>
      </div>

      <el-table :data="applications" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="crossRegionNo" label="申请编号" width="180" />
        <el-table-column label="办理事项" min-width="150">
          <template #default="{ row }">
            {{ row.serviceItem?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="属地部门" width="140">
          <template #default="{ row }">
            {{ row.localDepartment?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="异地受理部门" width="140">
          <template #default="{ row }">
            {{ row.remoteDepartment?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前处理" width="100">
          <template #default="{ row }">
            <el-tag :type="row.currentHandler === 'local' ? '' : 'warning'" size="small">
              {{ row.currentHandlerLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ row.statusLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="属地校验" width="100">
          <template #default="{ row }">
            <el-tag
              v-if="row.jurisdictionVerifyStatus === 'passed'"
              type="success"
              size="small"
            >已通过</el-tag>
            <el-tag
              v-else-if="row.jurisdictionVerifyStatus === 'failed'"
              type="danger"
              size="small"
            >未通过</el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >待校验</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && applications.length === 0" description="暂无异地办理记录">
        <el-button type="primary" @click="$router.push('/cross-region-apply')">
          发起异地办理
        </el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { crossRegionApi } from '@/api/cross-region'
import type { CrossRegionApplication } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const applications = ref<CrossRegionApplication[]>([])

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending_verify: 'warning',
    pending_accept: 'warning',
    processing_local: '',
    processing_remote: '',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    verify_failed: 'danger',
  }
  return map[status] || 'info'
}

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

const viewDetail = (row: CrossRegionApplication) => {
  router.push(`/cross-region-applications/${row.id}`)
}

onMounted(async () => {
  if (!userStore.user?.id) return
  loading.value = true
  try {
    applications.value = await crossRegionApi.getMyApplications(userStore.user.id)
  } catch (error) {
    console.error('加载异地办理记录失败', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
</style>
