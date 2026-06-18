<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">我的联合申报</h2>
      <el-button type="primary" @click="$router.push('/joint-apply')">
        <el-icon><Plus /></el-icon> 发起联合申报
      </el-button>
    </div>

    <el-card>
      <el-table :data="list" v-if="list.length > 0" style="width: 100%">
        <el-table-column prop="jointApplicationNo" label="申报编号" width="200">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">
              {{ row.jointApplicationNo }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="申报标题" min-width="200" />
        <el-table-column label="事项数量" width="100" align="center">
          <template #default="{ row }">
            {{ row.totalItems }} 项
          </template>
        </el-table-column>
        <el-table-column label="审批进度" width="240">
          <template #default="{ row }">
            <div class="progress-summary">
              <el-tag v-if="row.approvedItems > 0" type="success" size="small">
                通过 {{ row.approvedItems }}
              </el-tag>
              <el-tag v-if="row.processingItems > 0" type="warning" size="small" style="margin-left: 4px">
                审核中 {{ row.processingItems }}
              </el-tag>
              <el-tag v-if="row.rejectedItems > 0" type="danger" size="small" style="margin-left: 4px">
                驳回 {{ row.rejectedItems }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.status] || 'info'">
              {{ statusTextMap[row.status] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无联合申报记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getJointApplications } from '@/api/joint-application'
import type { JointApplication } from '@/types'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const list = ref<JointApplication[]>([])

const statusTextMap: Record<string, string> = {
  submitted: '已提交',
  processing: '处理中',
  approved: '全部通过',
  rejected: '全部驳回',
  completed: '已完成',
}

const statusTypeMap: Record<string, string> = {
  submitted: 'info',
  processing: 'warning',
  approved: 'success',
  rejected: 'danger',
  completed: 'success',
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const goDetail = (id: number) => {
  router.push(`/joint-applications/${id}`)
}

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    list.value = await getJointApplications(userStore.user.id)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
}
.progress-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
