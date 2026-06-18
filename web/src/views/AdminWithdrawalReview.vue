<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">撤回申请审批</h2>
      <el-button type="primary" @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="待审批" name="pending">
          <el-table :data="pendingList" style="width: 100%" v-if="pendingList.length > 0">
            <el-table-column prop="createdAt" label="申请时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="申请编号" width="200">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  @click="goToApplication(row.applicationId)"
                >
                  {{ row.application?.applicationNo }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="事项名称">
              <template #default="{ row }">{{ row.application?.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="申请人" width="120">
              <template #default="{ row }">{{ row.user?.name }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="撤回原因" show-overflow-tooltip />
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="viewDetail(row)">
                  查看详情
                </el-button>
                <el-button type="success" link @click="openApprove(row)">
                  <el-icon><CircleCheck /></el-icon> 批准
                </el-button>
                <el-button type="danger" link @click="openReject(row)">
                  <el-icon><CircleClose /></el-icon> 驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无待审批的撤回申请" />
        </el-tab-pane>

        <el-tab-pane label="已处理" name="processed">
          <el-table :data="processedList" style="width: 100%" v-if="processedList.length > 0">
            <el-table-column prop="createdAt" label="申请时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="申请编号" width="200">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  @click="goToApplication(row.applicationId)"
                >
                  {{ row.application?.applicationNo }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="事项名称">
              <template #default="{ row }">{{ row.application?.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="申请人" width="120">
              <template #default="{ row }">{{ row.user?.name }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="撤回原因" show-overflow-tooltip />
            <el-table-column label="审批结果" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'approved'" type="success">已批准</el-tag>
                <el-tag v-else type="danger">已驳回</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reviewComment" label="审批意见" show-overflow-tooltip />
            <el-table-column prop="reviewedAt" label="审批时间" width="180">
              <template #default="{ row }">{{ formatDate(row.reviewedAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无已处理的撤回申请" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="detailVisible" title="撤回申请详情" width="800px" destroy-on-close>
      <div v-if="currentWithdrawal">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请编号">
            <el-button type="primary" link @click="goToApplication(currentWithdrawal.applicationId)">
              {{ currentWithdrawal.application?.applicationNo }}
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="事项名称">{{ currentWithdrawal.application?.serviceItem?.name }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentWithdrawal.user?.name }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatDate(currentWithdrawal.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="撤回原因" :span="2">{{ currentWithdrawal.reason }}</el-descriptions-item>
          <el-descriptions-item label="当前状态" :span="2">
            <el-tag :type="currentWithdrawal.status === 'pending' ? 'warning' : (currentWithdrawal.status === 'approved' ? 'success' : 'danger')">
              {{ getStatusText(currentWithdrawal.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentWithdrawal.status !== 'pending'" label="审批意见" :span="2">{{ currentWithdrawal.reviewComment || '无' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentWithdrawal.status !== 'pending'" label="审批时间">{{ currentWithdrawal.reviewedAt ? formatDate(currentWithdrawal.reviewedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentWithdrawal.status !== 'pending'" label="重新提交次数">{{ currentWithdrawal.resubmitCount }} 次</el-descriptions-item>
        </el-descriptions>

        <div v-if="currentWithdrawal.snapshot" class="snapshot-section">
          <h4 style="margin: 16px 0 12px 0">撤回时数据快照</h4>
          <el-alert type="info" :title="`撤回时状态：${getStatusText(currentWithdrawal.snapshot.statusAtWithdrawal)}`" show-icon />
          <el-descriptions :column="1" border style="margin-top: 12px">
            <el-descriptions-item label="材料文件数">{{ currentWithdrawal.snapshot.materialFileIds?.length || 0 }} 份</el-descriptions-item>
            <el-descriptions-item label="进度记录数">{{ currentWithdrawal.snapshot.progressCount || 0 }} 条</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="currentWithdrawal.status === 'pending'" class="review-section">
          <h4 style="margin: 16px 0 12px 0">审批操作</h4>
          <el-form :model="reviewForm" label-width="100px">
            <el-form-item label="审批意见">
              <el-input
                v-model="reviewForm.comment"
                type="textarea"
                :rows="3"
                placeholder="请输入审批意见（选填）"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="currentWithdrawal?.status === 'pending'"
          type="danger"
          :loading="submitting"
          @click="submitReject"
        >
          <el-icon><CircleClose /></el-icon> 驳回申请
        </el-button>
        <el-button
          v-if="currentWithdrawal?.status === 'pending'"
          type="success"
          :loading="submitting"
          @click="submitApprove"
        >
          <el-icon><CircleCheck /></el-icon> 批准申请
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  listPendingWithdrawals,
  getWithdrawalRecords,
  reviewWithdraw,
} from '@/api/application'
import type { WithdrawalRecord } from '@/types'
import dayjs from 'dayjs'
import {
  Refresh,
  CircleCheck,
  CircleClose,
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('pending')
const allRecords = ref<WithdrawalRecord[]>([])

const detailVisible = ref(false)
const currentWithdrawal = ref<WithdrawalRecord | null>(null)
const reviewForm = reactive({
  comment: '',
})

const pendingList = computed(() => {
  return allRecords.value.filter(r => r.status === 'pending')
})

const processedList = computed(() => {
  return allRecords.value.filter(r => r.status !== 'pending')
})

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已驳回',
    submitted: '待审核',
    reviewing: '审核中',
    supplementing: '材料补充中',
  }
  return map[status] || status
}

const loadData = async () => {
  loading.value = true
  try {
    const pending = await listPendingWithdrawals()
    allRecords.value = pending
  } finally {
    loading.value = false
  }
}

const viewDetail = async (record: WithdrawalRecord) => {
  reviewForm.comment = ''
  currentWithdrawal.value = record
  detailVisible.value = true
}

const openApprove = (record: WithdrawalRecord) => {
  reviewForm.comment = ''
  currentWithdrawal.value = record
  detailVisible.value = true
}

const openReject = (record: WithdrawalRecord) => {
  reviewForm.comment = ''
  currentWithdrawal.value = record
  detailVisible.value = true
}

const submitApprove = async () => {
  if (!currentWithdrawal.value || !userStore.user?.id) return

  await ElMessageBox.confirm(
    '确定要批准该撤回申请吗？批准后申请状态将变为"已撤回"，用户可选择重新提交。',
    '确认批准',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    await reviewWithdraw({
      withdrawalId: currentWithdrawal.value.id,
      reviewerId: userStore.user.id,
      status: 'approved',
      comment: reviewForm.comment,
    })
    ElMessage.success('撤回申请已批准')
    detailVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

const submitReject = async () => {
  if (!currentWithdrawal.value || !userStore.user?.id) return

  if (!reviewForm.comment.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  await ElMessageBox.confirm(
    '确定要驳回该撤回申请吗？驳回后申请将恢复原状态继续办理。',
    '确认驳回',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    await reviewWithdraw({
      withdrawalId: currentWithdrawal.value.id,
      reviewerId: userStore.user.id,
      status: 'rejected',
      comment: reviewForm.comment,
    })
    ElMessage.success('撤回申请已驳回')
    detailVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

const goToApplication = (applicationId: number) => {
  router.push(`/admin/review/${applicationId}`)
}

onMounted(loadData)
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
}
.snapshot-section {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.review-section {
  margin-top: 16px;
  padding: 16px;
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
}
</style>
