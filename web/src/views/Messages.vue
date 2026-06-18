<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">消息中心</h2>
      <div>
        <el-button type="primary" @click="markAllRead" :disabled="!hasUnread">
          全部标为已读
        </el-button>
        <el-button @click="loadMessages">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="全部消息" name="all" />
      <el-tab-pane name="reminder">
        <template #label>
          <el-badge :value="reminderUnreadCount" :hidden="reminderUnreadCount === 0" :offset="[6, -2]">
            催办通知
          </el-badge>
        </template>
      </el-tab-pane>
      <el-tab-pane v-if="userStore.isAdmin" label="超时待审" name="timeout" />
      <el-tab-pane v-if="userStore.isAdmin" label="待办聚合" name="admin-todos" />
      <el-tab-pane label="状态变更" name="status-change" />
    </el-tabs>

    <div v-if="activeTab === 'all' || activeTab === 'reminder' || activeTab === 'status-change'" v-loading="loading">
      <el-card>
        <el-table :data="filteredMessages" style="width: 100%" @row-click="handleRowClick">
          <el-table-column width="60" align="center">
            <template #default="{ row }">
              <el-badge :is-dot="!row.read" />
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getMessageType(row.type)" size="small">
                {{ getMessageTypeText(row.type, row.reminderType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <span :class="{ 'unread-title': !row.read }">{{ row.title }}</span>
              <el-tag v-if="row.pendingHours && row.pendingHours > 24" type="danger" size="small" style="margin-left: 6px">
                超{{ row.pendingHours }}h
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
          <el-table-column label="状态变更" width="160" v-if="activeTab === 'status-change'">
            <template #default="{ row }">
              <template v-if="row.oldStatus && row.newStatus">
                <el-tag size="small" type="info">{{ getStatusLabel(row.oldStatus) }}</el-tag>
                <span style="margin: 0 4px">→</span>
                <el-tag size="small" :type="getStatusTagType(row.newStatus)">{{ getStatusLabel(row.newStatus) }}</el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320">
            <template #default="{ row }">
              <el-button v-if="!row.read" type="primary" link @click.stop="markOneRead(row.id)">
                标为已读
              </el-button>
              <el-button
                v-if="row.type === 'supplement' && userStore.isAdmin && row.applicationId"
                type="warning"
                link
                @click.stop="goToReview(row.applicationId)"
              >
                前往审核
              </el-button>
              <el-button
                v-if="row.type === 'supplement' && !userStore.isAdmin"
                type="warning"
                link
                @click.stop="goToSupplement"
              >
                前往补件
              </el-button>
              <el-button
                v-if="row.type === 'system' && userStore.isAdmin && isWithdrawMessage(row) && row.applicationId"
                type="warning"
                link
                @click.stop="goToWithdrawalReview"
              >
                撤回审批
              </el-button>
              <el-button
                v-if="row.type === 'reminder' && row.reminderType === 'timeout' && row.approvalRecordId"
                type="danger"
                link
                @click.stop="goToApprovalDetail(row.approvalRecordId)"
              >
                前往审批
              </el-button>
              <el-button
                v-if="row.type === 'reminder' && row.reminderType === 'status_change' && row.applicationId"
                type="primary"
                link
                @click.stop="goToApplication(row.applicationId)"
              >
                查看申请
              </el-button>
              <el-button
                v-if="row.applicationId && row.type !== 'reminder'"
                type="primary"
                link
                @click.stop="goToApplication(row.applicationId)"
              >
                查看申请
              </el-button>
              <el-button
                v-if="isResubmitMessage(row) && row.applicationId"
                type="success"
                link
                @click.stop="goToApplication(row.applicationId)"
              >
                查看新申请
              </el-button>
              <el-button
                v-if="row.appointmentId"
                type="success"
                link
                @click.stop="goToAppointment(row.appointmentId)"
              >
                查看预约
              </el-button>
              <el-button
                v-if="row.type === 'subscription' && row.serviceItemId"
                type="success"
                link
                @click.stop="goToServiceItem(row.serviceItemId)"
              >
                查看事项
              </el-button>
              <el-button
                v-if="row.type === 'certificate'"
                type="success"
                link
                @click.stop="goToCertificates"
              >
                查看证明
              </el-button>
              <el-button
                v-if="row.type === 'certificate-reminder'"
                type="warning"
                link
                @click.stop="goToCertificateRenewal(row)"
              >
                立即续办
              </el-button>
              <el-button
                v-if="row.type === 'certificate-reminder' && row.serviceItemId"
                type="primary"
                link
                @click.stop="goToServiceItem(row.serviceItemId)"
              >
                查看事项
              </el-button>
              <el-button
                v-if="(row.type === 'window' || row.type === 'queue') && row.windowHandlingId"
                type="warning"
                link
                @click.stop="goToWindowHandling(row.windowHandlingId)"
              >
                查看窗口记录
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && filteredMessages.length === 0" description="暂无消息" />
      </el-card>
    </div>

    <div v-if="activeTab === 'timeout'" v-loading="timeoutLoading">
      <el-card>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>超时待审列表（超过24小时未处理）</span>
            <el-button type="primary" size="small" @click="loadTimeoutPending">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </template>
        <el-table :data="timeoutItems" style="width: 100%">
          <el-table-column prop="applicationNo" label="申请编号" width="180" />
          <el-table-column prop="serviceItemName" label="事项名称" min-width="160" />
          <el-table-column prop="applicantName" label="申请人" width="100" />
          <el-table-column prop="currentNodeName" label="审批节点" width="120" />
          <el-table-column prop="approverName" label="审批人" width="100" />
          <el-table-column label="超时时长" width="120">
            <template #default="{ row }">
              <el-tag type="danger" size="small">{{ row.pendingHours }}小时</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button
                type="danger"
                size="small"
                @click="handleSendReminder(row.recordId)"
              >
                发送催办
              </el-button>
              <el-button
                type="primary"
                size="small"
                @click="goToApplication(row.applicationId)"
              >
                查看申请
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!timeoutLoading && timeoutItems.length === 0" description="暂无超时待审" />
      </el-card>
    </div>

    <div v-if="activeTab === 'admin-todos'" v-loading="todosLoading">
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #e6a23c">{{ adminTodos.submittedApplications }}</div>
            <div class="todo-stat-label">待审核申请</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #409eff">{{ adminTodos.reviewingApplications }}</div>
            <div class="todo-stat-label">审核中申请</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #f56c6c">{{ adminTodos.pendingApprovals }}</div>
            <div class="todo-stat-label">待审批</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #e6a23c">{{ adminTodos.pendingWithdrawals }}</div>
            <div class="todo-stat-label">待撤回审批</div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="16" style="margin-bottom: 16px">
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #909399">{{ adminTodos.supplementingApplications }}</div>
            <div class="todo-stat-label">补件中申请</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #909399">{{ adminTodos.pendingSupplements }}</div>
            <div class="todo-stat-label">待补件</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #f56c6c">{{ adminTodos.timeoutPendingCount }}</div>
            <div class="todo-stat-label">超时待审</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="todo-stat-card">
            <div class="todo-stat-number" style="color: #303133; font-size: 28px">{{ adminTodos.totalPending }}</div>
            <div class="todo-stat-label">合计待办</div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>审批节点分布</span>
            </template>
            <div v-for="(count, node) in adminTodos.pendingByNode" :key="node" class="pending-node-item">
              <span class="pending-node-name">{{ node }}</span>
              <el-tag type="danger" size="small">{{ count }}件</el-tag>
            </div>
            <el-empty v-if="Object.keys(adminTodos.pendingByNode).length === 0" description="暂无待审批节点" :image-size="60" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>超时待审列表</span>
                <el-button type="primary" size="small" @click="activeTab = 'timeout'">
                  查看全部
                </el-button>
              </div>
            </template>
            <div v-for="item in adminTodos.timeoutPendingItems.slice(0, 5)" :key="item.recordId" class="timeout-item">
              <div class="timeout-item-header">
                <span class="timeout-item-no">{{ item.applicationNo }}</span>
                <el-tag type="danger" size="small">{{ item.pendingHours }}h</el-tag>
              </div>
              <div class="timeout-item-info">
                {{ item.serviceItemName }} - {{ item.currentNodeName }} - 审批人：{{ item.approverName || '未指定' }}
              </div>
              <div style="margin-top: 6px">
                <el-button type="danger" size="small" @click="handleSendReminder(item.recordId)">
                  催办
                </el-button>
              </div>
            </div>
            <el-empty v-if="adminTodos.timeoutPendingItems.length === 0" description="暂无超时待审" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  getMessages,
  markAsRead,
  markAllAsRead,
  getUnreadReminderCount,
  getTimeoutPending,
  getAdminTodos,
  sendTimeoutReminder,
} from '@/api/message'
import type { Message, TimeoutPendingItem, AdminTodoAggregation } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const messages = ref<Message[]>([])
const activeTab = ref('all')
const reminderUnreadCount = ref(0)

const timeoutLoading = ref(false)
const timeoutItems = ref<TimeoutPendingItem[]>([])

const todosLoading = ref(false)
const adminTodos = ref<AdminTodoAggregation>({
  pendingApprovals: 0,
  pendingWithdrawals: 0,
  pendingSupplements: 0,
  submittedApplications: 0,
  reviewingApplications: 0,
  supplementingApplications: 0,
  timeoutPendingCount: 0,
  timeoutPendingItems: [],
  pendingByNode: {},
  totalPending: 0,
})

const hasUnread = computed(() => messages.value.some(m => !m.read))

const filteredMessages = computed(() => {
  if (activeTab.value === 'all') return messages.value
  if (activeTab.value === 'reminder') return messages.value.filter(m => m.type === 'reminder')
  if (activeTab.value === 'status-change') return messages.value.filter(m => m.type === 'reminder' && m.reminderType === 'status_change')
  return messages.value
})

const getMessageType = (type: string) => {
  const map: Record<string, string> = {
    application: 'primary',
    appointment: 'success',
    supplement: 'warning',
    subscription: 'success',
    certificate: 'success',
    'certificate-reminder': 'warning',
    window: 'warning',
    queue: 'danger',
    system: 'info',
    approval: '',
    reminder: 'danger',
  }
  return map[type] || 'info'
}

const getMessageTypeText = (type: string, reminderType?: string) => {
  if (type === 'reminder') {
    const reminderMap: Record<string, string> = {
      timeout: '超时催办',
      status_change: '状态变更',
      admin_todo: '待办提醒',
    }
    return reminderMap[reminderType || ''] || '催办通知'
  }
  const map: Record<string, string> = {
    application: '申请通知',
    appointment: '预约通知',
    supplement: '补件通知',
    subscription: '订阅通知',
    certificate: '证明通知',
    'certificate-reminder': '证照提醒',
    window: '窗口通知',
    queue: '叫号通知',
    system: '系统通知',
    approval: '审批通知',
  }
  return map[type] || '系统通知'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '草稿',
    submitted: '待审核',
    reviewing: '审核中',
    approved: '审核通过',
    rejected: '已驳回',
    completed: '办理完成',
    supplementing: '材料补充中',
    withdraw_pending: '撤回待审批',
    withdrawn: '已撤回',
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    supplementing: 'warning',
    reviewing: '',
    submitted: 'info',
  }
  return map[status] || 'info'
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadMessages = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    messages.value = await getMessages(userStore.user.id)
  } finally {
    loading.value = false
  }
}

const loadReminderCount = async () => {
  if (!userStore.user) return
  try {
    reminderUnreadCount.value = await getUnreadReminderCount(userStore.user.id)
  } catch {
    // ignore
  }
}

const loadTimeoutPending = async () => {
  timeoutLoading.value = true
  try {
    timeoutItems.value = await getTimeoutPending()
  } finally {
    timeoutLoading.value = false
  }
}

const loadAdminTodos = async () => {
  todosLoading.value = true
  try {
    adminTodos.value = await getAdminTodos()
  } finally {
    todosLoading.value = false
  }
}

const handleTabChange = (tab: string) => {
  if (tab === 'timeout') {
    loadTimeoutPending()
  } else if (tab === 'admin-todos') {
    loadAdminTodos()
  }
}

const handleRowClick = async (row: Message) => {
  if (!row.read) {
    await markOneRead(row.id)
  }
  if (row.type === 'reminder' && row.reminderType === 'timeout' && row.approvalRecordId) {
    goToApprovalDetail(row.approvalRecordId)
  } else if (row.type === 'reminder' && row.reminderType === 'status_change' && row.applicationId) {
    goToApplication(row.applicationId)
  } else if (row.type === 'certificate') {
    goToCertificates()
  } else if (row.type === 'certificate-reminder') {
    goToCertificateRenewal(row)
  } else if (row.type === 'supplement') {
    if (userStore.isAdmin && row.applicationId) {
      goToReview(row.applicationId)
    } else {
      goToSupplement()
    }
  } else if (row.type === 'window' || row.type === 'queue') {
    if (row.windowHandlingId) {
      goToWindowHandling(row.windowHandlingId)
    }
  } else if (row.appointmentId) {
    goToAppointment(row.appointmentId)
  } else if (row.applicationId) {
    goToApplication(row.applicationId)
  } else if (row.type === 'subscription' && row.serviceItemId) {
    goToServiceItem(row.serviceItemId)
  }
}

const markOneRead = async (id: number) => {
  await markAsRead(id)
  const msg = messages.value.find(m => m.id === id)
  if (msg) msg.read = true
  loadReminderCount()
}

const markAllRead = async () => {
  if (!userStore.user) return
  await markAllAsRead(userStore.user.id)
  messages.value.forEach(m => (m.read = true))
  reminderUnreadCount.value = 0
  ElMessage.success('已全部标为已读')
}

const handleSendReminder = async (recordId: number) => {
  if (!userStore.user) return
  try {
    const result = await sendTimeoutReminder(recordId, userStore.user.id)
    if (result.success) {
      ElMessage.success('催办提醒已发送')
    } else {
      ElMessage.warning(result.message)
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '催办发送失败')
  }
}

const goToApplication = (id: number) => {
  router.push(`/applications/${id}`)
}

const goToAppointment = (id: number) => {
  router.push(`/my-appointments?highlight=${id}`)
}

const goToSupplement = () => {
  router.push('/supplement-center')
}

const goToReview = (applicationId: number) => {
  router.push(`/admin/review/${applicationId}`)
}

const goToServiceItem = (serviceItemId: number) => {
  router.push(`/services/${serviceItemId}`)
}

const goToCertificates = () => {
  router.push('/my-certificates')
}

const goToCertificateRenewal = (row: Message) => {
  if (row.serviceItemId) {
    router.push(`/apply/${row.serviceItemId}?renewal=1`)
  } else {
    router.push('/certificate-reminders')
  }
}

const goToWindowHandling = (id: number) => {
  if (userStore.isAdmin) {
    router.push(`/admin/window-coordination?highlight=${id}`)
  } else {
    router.push(`/my-window-handlings?highlight=${id}`)
  }
}

const goToApprovalDetail = (recordId: number) => {
  router.push('/approvals/pending')
}

const isWithdrawMessage = (row: Message) => {
  return row.title.includes('撤回申请') || row.content.includes('撤回')
}

const isResubmitMessage = (row: Message) => {
  return row.title.includes('重新提交') || row.content.includes('重新提交')
}

const goToWithdrawalReview = () => {
  router.push('/admin/withdrawal-review')
}

onMounted(() => {
  loadMessages()
  loadReminderCount()
})
</script>

<style scoped>
.unread-title {
  font-weight: 600;
  color: #303133;
}

.todo-stat-card {
  text-align: center;
  padding: 8px 0;
}

.todo-stat-card :deep(.el-card__body) {
  padding: 16px;
}

.todo-stat-number {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.todo-stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.pending-node-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.pending-node-item:last-child {
  border-bottom: none;
}

.pending-node-name {
  font-size: 14px;
  color: #303133;
}

.timeout-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.timeout-item:last-child {
  border-bottom: none;
}

.timeout-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeout-item-no {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.timeout-item-info {
  font-size: 12px;
  color: #909399;
}
</style>
