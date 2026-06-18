<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">进度跟踪</h2>
      <div class="header-stats">
        <span class="stat-item">
          <span class="stat-label">全部</span>
          <span class="stat-value">{{ totalStats.total }}</span>
        </span>
        <span class="stat-item stat-pending">
          <span class="stat-label">进行中</span>
          <span class="stat-value">{{ totalStats.pending }}</span>
        </span>
        <span class="stat-item stat-success">
          <span class="stat-label">已通过</span>
          <span class="stat-value">{{ totalStats.approved }}</span>
        </span>
        <span class="stat-item stat-danger">
          <span class="stat-label">已驳回</span>
          <span class="stat-value">{{ totalStats.rejected }}</span>
        </span>
      </div>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="已提交" value="submitted" />
            <el-option label="已受理" value="accepted" />
            <el-option label="审核中" value="reviewing" />
            <el-option label="待补件" value="supplementing" />
            <el-option label="撤回待审批" value="withdraw_pending" />
            <el-option label="已撤回" value="withdrawn" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="事项分类">
          <el-select v-model="filterForm.category" placeholder="全部分类" clearable style="width: 150px">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            :shortcuts="dateShortcuts"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadApplications">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <div class="table-toolbar" v-if="selectedRows.length > 0">
        <div class="toolbar-left">
          <el-tag type="primary" size="large">
            已选 <strong>{{ selectedRows.length }}</strong> 项
          </el-tag>
          <el-button type="warning" @click="openBatchWithdrawDialog">
            <el-icon><Warning /></el-icon> 批量撤回
          </el-button>
          <el-button @click="clearSelection">取消选择</el-button>
        </div>
      </div>

      <el-table
        ref="tableRef"
        :data="pagedApplications"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        row-key="id"
        highlight-current-row
        @row-click="handleRowClick"
        class="app-table"
      >
        <el-table-column type="selection" width="45" :selectable="isSelectable" />
        <el-table-column prop="applicationNo" label="申请编号" width="190">
          <template #default="{ row }">
            <span class="app-no-link" @click.stop="goToDetail(row.id)">{{ row.applicationNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="事项名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="service-name" @click.stop="goToDetail(row.id)">{{ row.serviceItem?.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="事项分类" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.serviceItem?.category || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="160">
          <template #default="{ row }">
            <div class="status-cell">
              <el-tag :type="getStatusType(row.status)" effect="dark" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
              <el-tag v-if="row.isResubmit" type="info" size="small" effect="plain">
                重提·{{ row.resubmitCount }}次
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToDetail(row.id)">
              <el-icon><View /></el-icon> 详情
            </el-button>
            <el-button
              v-if="row.canWithdraw"
              type="warning"
              link
              size="small"
              @click="openSingleWithdrawDialog(row)"
            >
              <el-icon><Warning /></el-icon> 撤回
            </el-button>
            <el-button
              v-if="row.canResubmit"
              type="success"
              link
              size="small"
              @click="goToResubmit(row)"
            >
              <el-icon><RefreshRight /></el-icon> 重提
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="applications.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredTotal"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>

      <el-empty v-if="!loading && applications.length === 0" description="暂无申请记录" />
    </el-card>

    <el-dialog v-model="withdrawDialogVisible" :title="batchMode ? '批量撤回申请' : '申请撤回'" width="520px" destroy-on-close>
      <div v-if="batchMode">
        <el-alert type="warning" show-icon style="margin-bottom: 16px" :closable="false">
          <template #title>
            您即将批量撤回 <strong>{{ selectedRows.length }}</strong> 项申请
          </template>
          撤回后申请将暂停办理流程，需管理员审批通过后方可生效。
        </el-alert>
        <div class="selected-preview">
          <div v-for="row in selectedRows" :key="row.id" class="selected-item">
            <span class="item-no">{{ row.applicationNo }}</span>
            <span class="item-name">{{ row.serviceItem?.name }}</span>
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </div>
        </div>
      </div>
      <div v-else>
        <el-descriptions :column="1" border style="margin-bottom: 16px">
          <el-descriptions-item label="申请编号">{{ singleWithdrawTarget?.applicationNo }}</el-descriptions-item>
          <el-descriptions-item label="事项名称">{{ singleWithdrawTarget?.serviceItem?.name }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-form :model="withdrawForm" label-width="100px">
        <el-form-item label="撤回原因" required>
          <el-input
            v-model="withdrawForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明撤回原因（如：信息有误、材料不全等）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="withdrawLoading" @click="submitWithdraw">
          确认{{ batchMode ? '批量' : '' }}撤回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Warning, View, RefreshRight } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getApplications, canWithdraw, canResubmit, requestWithdraw, batchWithdraw } from '@/api/application'
import { getCategories } from '@/api/service-item'
import type { Application } from '@/types'
import type { ElTable } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const applications = ref<(Application & { canWithdraw?: boolean; canResubmit?: boolean })[]>([])
const categories = ref<string[]>([])
const tableRef = ref<InstanceType<typeof ElTable>>()
const selectedRows = ref<(Application & { canWithdraw?: boolean })[]>([])
const currentPage = ref(1)
const pageSize = ref(10)

const filterForm = reactive({
  status: '',
  category: '',
})

const dateRange = ref<[string, string] | null>(null)

const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

const batchMode = ref(false)
const singleWithdrawTarget = ref<(Application & { canWithdraw?: boolean }) | null>(null)
const withdrawDialogVisible = ref(false)
const withdrawLoading = ref(false)
const withdrawForm = reactive({
  reason: '',
})

const totalStats = computed(() => {
  const apps = applications.value
  return {
    total: apps.length,
    pending: apps.filter(a => ['submitted', 'reviewing', 'supplementing', 'withdraw_pending'].includes(a.status)).length,
    approved: apps.filter(a => a.status === 'approved').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  }
})

const filteredTotal = computed(() => applications.value.length)

const pagedApplications = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return applications.value.slice(start, end)
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    accepted: 'info',
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
    accepted: '已受理',
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

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')

const isSelectable = (row: Application & { canWithdraw?: boolean }) => {
  return !!row.canWithdraw
}

const loadCategories = async () => {
  try {
    categories.value = await getCategories()
  } catch {
    categories.value = []
  }
}

const loadApplications = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const startDate = dateRange.value?.[0] || undefined
    const endDate = dateRange.value?.[1] ? `${dateRange.value[1]} 23:59:59` : undefined

    const apps = await getApplications(
      userStore.user.id,
      filterForm.status || undefined,
      filterForm.category || undefined,
      startDate,
      endDate,
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
    currentPage.value = 1
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
  filterForm.category = ''
  dateRange.value = null
  loadApplications()
}

const handleSelectionChange = (rows: (Application & { canWithdraw?: boolean })[]) => {
  selectedRows.value = rows
}

const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

const handleRowClick = (row: Application) => {
  goToDetail(row.id)
}

const goToDetail = (id: number) => {
  const routeData = router.resolve({ path: `/applications/${id}` })
  window.open(routeData.href, '_blank')
}

const goToResubmit = (row: Application) => {
  const params = new URLSearchParams({
    originalId: String(row.id),
    retainedFiles: '[]',
  })
  const routeData = router.resolve({ path: `/apply/${row.serviceItemId}`, query: Object.fromEntries(params) })
  window.open(routeData.href, '_blank')
}

const openSingleWithdrawDialog = (row: Application & { canWithdraw?: boolean }) => {
  batchMode.value = false
  singleWithdrawTarget.value = row
  withdrawForm.reason = ''
  withdrawDialogVisible.value = true
}

const openBatchWithdrawDialog = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择需要撤回的申请')
    return
  }
  batchMode.value = true
  singleWithdrawTarget.value = null
  withdrawForm.reason = ''
  withdrawDialogVisible.value = true
}

const submitWithdraw = async () => {
  if (!withdrawForm.reason.trim()) {
    ElMessage.warning('请输入撤回原因')
    return
  }
  if (!userStore.user) return

  await ElMessageBox.confirm(
    batchMode.value
      ? `确定要批量撤回 ${selectedRows.value.length} 项申请吗？`
      : '确定要提交撤回申请吗？撤回后申请将暂停办理，需管理员审批。',
    '确认撤回',
    { type: 'warning' },
  )

  withdrawLoading.value = true
  try {
    if (batchMode.value) {
      const items = selectedRows.value.map(row => ({
        applicationId: row.id,
        userId: userStore.user!.id,
        reason: withdrawForm.reason,
      }))
      const result = await batchWithdraw(items)
      const successCount = result.results.filter(r => r.success).length
      const failCount = result.results.filter(r => !r.success).length
      if (failCount > 0) {
        ElMessage.warning(`批量撤回完成：${successCount} 项成功，${failCount} 项失败`)
      } else {
        ElMessage.success(`批量撤回成功：${successCount} 项申请已提交撤回`)
      }
    } else if (singleWithdrawTarget.value) {
      await requestWithdraw({
        applicationId: singleWithdrawTarget.value.id,
        userId: userStore.user!.id,
        reason: withdrawForm.reason,
      })
      ElMessage.success('撤回申请已提交，等待管理员审批')
    }
    withdrawDialogVisible.value = false
    await loadApplications()
  } catch {
    ElMessage.error('撤回操作失败')
  } finally {
    withdrawLoading.value = false
  }
}

watch(pageSize, () => {
  currentPage.value = 1
  clearSelection()
})

watch(currentPage, () => {
  clearSelection()
})

watch(applications, (newApps) => {
  const maxPage = Math.max(1, Math.ceil(newApps.length / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

onMounted(() => {
  loadCategories()
  loadApplications()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
.header-stats {
  display: flex;
  gap: 20px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 16px;
  border-radius: 8px;
  background: #f5f7fa;
}
.stat-item .stat-label {
  font-size: 12px;
  color: #909399;
}
.stat-item .stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}
.stat-pending .stat-value {
  color: #e6a23c;
}
.stat-success .stat-value {
  color: #67c23a;
}
.stat-danger .stat-value {
  color: #f56c6c;
}
.filter-card {
  margin-bottom: 20px;
}
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 16px;
  background: #ecf5ff;
  border-radius: 6px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.app-table {
  cursor: pointer;
}
.app-no-link {
  color: #409eff;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}
.app-no-link:hover {
  text-decoration: underline;
}
.service-name {
  color: #303133;
  cursor: pointer;
}
.service-name:hover {
  color: #409eff;
}
.status-cell {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.selected-preview {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
}
.selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f2f6fc;
  font-size: 13px;
}
.selected-item:last-child {
  border-bottom: none;
}
.item-no {
  color: #909399;
  font-family: 'Courier New', monospace;
  min-width: 160px;
}
.item-name {
  flex: 1;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
