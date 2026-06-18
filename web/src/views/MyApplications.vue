<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">进度跟踪</h2>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 160px">
            <el-option label="已提交" value="submitted" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="待补件" value="supplementing" />
            <el-option label="撤回待审批" value="withdraw_pending" />
            <el-option label="已撤回" value="withdrawn" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadApplications">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="applications" style="width: 100%">
        <el-table-column prop="applicationNo" label="申请编号" width="200" />
        <el-table-column label="事项名称">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="事项分类" width="120">
          <template #default="{ row }">{{ row.serviceItem?.category }}</template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <div class="status-cell">
              <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              <el-tag v-if="row.isResubmit" type="info" size="small" style="margin-left: 4px">
                重提·{{ row.resubmitCount }}次
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row.id)">
              查看详情
            </el-button>
            <el-button
              v-if="row.canWithdraw"
              type="warning"
              link
              @click="goToWithdraw(row.id)"
            >
              申请撤回
            </el-button>
            <el-button
              v-if="row.canResubmit"
              type="success"
              link
              @click="goToDetail(row.id)"
            >
              重新提交
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && applications.length === 0" description="暂无申请记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getApplications, canWithdraw, canResubmit } from '@/api/application'
import type { Application } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const applications = ref<Application[]>([])

const filterForm = reactive({
  status: '',
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    supplementing: 'warning',
    withdraw_pending: 'warning',
    withdrawn: 'info',
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
    supplementing: '待补件',
    withdraw_pending: '撤回待审批',
    withdrawn: '已撤回',
  }
  return map[status] || status
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadApplications = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const apps = await getApplications(
      userStore.user.id,
      filterForm.status || undefined
    )

    const appsWithPermissions = await Promise.all(
      apps.map(async (app) => {
        const [withdrawCheck, resubmitCheck] = await Promise.all([
          canWithdraw(app.id, userStore.user!.id),
          canResubmit(app.id, userStore.user!.id),
        ])
        return {
          ...app,
          canWithdraw: withdrawCheck.canWithdraw,
          canResubmit: resubmitCheck.canResubmit,
        }
      })
    )

    applications.value = appsWithPermissions
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
  loadApplications()
}

const goToDetail = (id: number) => {
  router.push(`/applications/${id}`)
}

const goToWithdraw = (id: number) => {
  router.push(`/applications/${id}`)
}

onMounted(loadApplications)
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.status-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
