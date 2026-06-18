<template>
  <div class="approval-detail">
    <div class="detail-header">
      <button class="back-btn" @click="goBack">
        ← 返回
      </button>
      <h2 class="page-title">审批详情</h2>
      <div class="status-badge" :class="getStatusClass(application?.status)">
        {{ getStatusText(application?.status) }}
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="detail-content">
      <div class="main-content">
        <div class="info-section">
          <h3 class="section-title">申请信息</h3>
          <div class="info-card">
            <div class="info-row">
              <div class="info-item">
                <span class="label">申请编号</span>
                <span class="value code">{{ application?.applicationNo }}</span>
              </div>
              <div class="info-item">
                <span class="label">事项名称</span>
                <span class="value">{{ application?.serviceItem?.name }}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-item">
                <span class="label">申请人</span>
                <span class="value">{{ application?.user?.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">提交时间</span>
                <span class="value">{{ formatDate(application?.createdAt) }}</span>
              </div>
            </div>
            <div class="info-row" v-if="application?.formData">
              <div class="info-item full-width">
                <span class="label">表单数据</span>
                <div class="value form-data">
                  <pre>{{ JSON.stringify(application.formData, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="timeline-section">
          <h3 class="section-title">审批进度时间线</h3>
          <div class="timeline-card">
            <div class="timeline">
              <div
                v-for="(node, index) in timeline"
                :key="node.nodeId"
                :class="['timeline-item', node.status]"
              >
                <div class="timeline-left">
                  <div class="timeline-dot">
                    <span class="dot-icon">{{ getNodeIcon(node.status) }}</span>
                  </div>
                  <div v-if="index < timeline.length - 1" class="timeline-line"></div>
                </div>
                <div class="timeline-content">
                  <div class="timeline-header">
                    <h4 class="node-name">{{ node.nodeName }}</h4>
                    <span :class="['node-status', node.status]">
                      {{ getNodeStatusText(node.status) }}
                    </span>
                  </div>
                  <div class="timeline-meta">
                    <span class="role-tag" :class="getRoleClass(node.role)">
                      {{ getRoleText(node.role) }}
                    </span>
                    <span v-if="node.department" class="dept-tag">
                      {{ node.department }}
                    </span>
                    <span v-if="node.approver" class="approver">
                      审批人：{{ node.approver.name }}
                    </span>
                  </div>
                  <div v-if="node.comment" class="timeline-comment">
                    <span class="comment-label">意见：</span>
                    <span class="comment-text">{{ node.comment }}</span>
                  </div>
                  <div class="timeline-time" v-if="node.approvedAt || node.createdAt">
                    {{ node.approvedAt ? formatDate(node.approvedAt) : formatDate(node.createdAt) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="comments-section">
          <h3 class="section-title">审批意见汇总</h3>
          <div class="comments-card">
            <div v-if="comments.length === 0" class="empty-comments">
              暂无审批意见
            </div>
            <div
              v-for="comment in comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-header">
                <span class="commenter">{{ comment.commenterName }}</span>
                <span :class="['action-tag', comment.action]">
                  {{ getActionText(comment.action) }}
                </span>
                <span class="comment-node">{{ comment.nodeName }}</span>
                <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="action-section">
          <h3 class="section-title">审批操作</h3>
          <div class="action-card">
            <div v-if="currentRecord && canApprove" class="current-node-info">
              <div class="current-node-label">当前节点</div>
              <div class="current-node-name">{{ currentRecord.currentNode?.nodeName }}</div>
              <div class="current-node-role">
                {{ getRoleText(currentRecord.currentNode?.role || '') }}
                <span v-if="currentRecord.currentNode?.department">
                  （{{ currentRecord.currentNode.department }}）
                </span>
              </div>
            </div>

            <div v-if="canApprove" class="action-form">
              <div class="form-group">
                <label>审批意见</label>
                <textarea
                  v-model="approvalComment"
                  placeholder="请输入审批意见..."
                  rows="4"
                ></textarea>
              </div>

              <div v-if="currentRecord?.currentNode?.allowReject" class="form-group">
                <label>驳回至</label>
                <select v-model="rejectTargetNodeId">
                  <option :value="null">直接驳回（结束流程）</option>
                  <option
                    v-for="node in rejectableNodes"
                    :key="node.nodeId"
                    :value="node.nodeId"
                  >
                    {{ node.nodeName }}
                  </option>
                </select>
              </div>

              <div v-if="currentRecord?.currentNode?.allowTransfer" class="form-group">
                <label>转交至</label>
                <select v-model="transferToUserId">
                  <option :value="null">请选择转交对象</option>
                  <option
                    v-for="user in transferUsers"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.name }}（{{ getRoleText(user.role) }}）
                  </option>
                </select>
              </div>

              <div class="action-buttons">
                <button class="btn btn-approve" @click="handleApprove">
                  ✓ 通过
                </button>
                <button
                  class="btn btn-reject"
                  @click="handleReject"
                  :disabled="!approvalComment"
                >
                  ✕ 驳回
                </button>
                <button
                  class="btn btn-transfer"
                  @click="handleTransfer"
                  :disabled="!approvalComment || !transferToUserId"
                >
                  → 转交
                </button>
              </div>
            </div>

            <div v-if="canWithdraw" class="withdraw-section">
              <div class="form-group">
                <label>撤回原因</label>
                <textarea
                  v-model="withdrawReason"
                  placeholder="请输入撤回原因..."
                  rows="3"
                ></textarea>
              </div>
              <button
                class="btn btn-withdraw"
                @click="handleWithdraw"
                :disabled="!withdrawReason"
              >
                ← 撤回申请
              </button>
            </div>

            <div v-if="!canApprove && !canWithdraw && currentRecord" class="no-action">
              <div class="no-action-icon">ℹ️</div>
              <div class="no-action-text">当前节点审批已处理</div>
              <div class="no-action-desc">
                状态：{{ getRecordStatusText(currentRecord.status) }}
              </div>
            </div>

            <div v-if="!currentRecord && !canStartApproval" class="no-action">
              <div class="no-action-icon">✅</div>
              <div class="no-action-text">审批流程已结束</div>
            </div>

            <div v-if="canStartApproval" class="start-section">
              <div class="start-tip">该申请尚未进入审批流程</div>
              <div class="form-group">
                <label>选择审批流程</label>
                <select v-model="selectedFlowCode">
                  <option value="">请选择审批流程</option>
                  <option v-for="flow in flows" :key="flow.code" :value="flow.code">
                    {{ flow.name }}
                  </option>
                </select>
              </div>
              <button
                class="btn btn-start"
                @click="handleStartApproval"
                :disabled="!selectedFlowCode"
              >
                ▶ 启动审批
              </button>
            </div>
          </div>
        </div>

        <div class="material-section">
          <h3 class="section-title">申请材料</h3>
          <div class="material-card">
            <div v-if="!application?.materialFiles?.length" class="empty-materials">
              暂无材料
            </div>
            <div
              v-for="file in application?.materialFiles"
              :key="file.id"
              class="material-item"
            >
              <span class="material-icon">📄</span>
              <span class="material-name">{{ file.materialName }}</span>
              <span class="material-status" :class="file.status">
                {{ file.status === 'normal' ? '正常' : file.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
      <div class="modal">
        <h3 class="modal-title">{{ confirmTitle }}</h3>
        <p class="modal-content">{{ confirmMessage }}</p>
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="showConfirm = false">取消</button>
          <button class="btn btn-primary" @click="confirmAction">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { approvalApi } from '@/api/approval'
import { applicationApi } from '@/api/application'
import { useUserStore } from '@/stores/user'
import type {
  Application,
  ApprovalTimelineNode,
  ApprovalCommentSummary,
  ApprovalRecord,
  RejectableNode,
  ApprovalFlow,
  User,
} from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const applicationId = Number(route.params.applicationId)

const loading = ref(true)
const application = ref<Application | null>(null)
const timeline = ref<ApprovalTimelineNode[]>([])
const comments = ref<ApprovalCommentSummary[]>([])
const records = ref<ApprovalRecord[]>([])
const rejectableNodes = ref<RejectableNode[]>([])
const flows = ref<ApprovalFlow[]>([])
const transferUsers = ref<User[]>([])

const approvalComment = ref('')
const rejectTargetNodeId = ref<number | null>(null)
const transferToUserId = ref<number | null>(null)
const withdrawReason = ref('')
const selectedFlowCode = ref('DEPT_APPROVAL')

const showConfirm = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingAction = ref<() => void>(() => {})

const currentRecord = computed(() => {
  return records.value.find(r => r.status === 'pending')
})

const currentUser = computed(() => userStore.user)

const canApprove = computed(() => {
  if (!currentRecord.value || !currentUser.value) return false
  const node = currentRecord.value.currentNode
  if (!node) return false
  return (
    currentRecord.value.approverId === currentUser.value.id ||
    node.role === currentUser.value.role
  )
})

const canWithdraw = computed(() => {
  if (!currentRecord.value || !currentUser.value) return false
  return (
    application.value?.userId === currentUser.value.id &&
    currentRecord.value.status === 'pending'
  )
})

const canStartApproval = computed(() => {
  if (!application.value || !currentUser.value) return false
  const hasPendingOrApproved = records.value.some(
    r => r.status === 'pending' || r.status === 'approved',
  )
  return (
    !hasPendingOrApproved &&
    (application.value.status === 'submitted' || application.value.status === 'pending')
  )
})

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const getStatusClass = (status?: string) => {
  const classMap: Record<string, string> = {
    submitted: 'status-submitted',
    reviewing: 'status-reviewing',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-completed',
    pending: 'status-pending',
  }
  return status ? classMap[status] || '' : ''
}

const getStatusText = (status?: string) => {
  const textMap: Record<string, string> = {
    submitted: '已提交',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
    pending: '待处理',
  }
  return status ? textMap[status] || status : ''
}

const getRecordStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待处理',
    approved: '已通过',
    rejected: '已驳回',
    transferred: '已转交',
    withdrawn: '已撤回',
  }
  return textMap[status] || status
}

const getNodeIcon = (status: string) => {
  const iconMap: Record<string, string> = {
    pending: '⏳',
    current: '🔄',
    completed: '✓',
    rejected: '✕',
    skipped: '→',
  }
  return iconMap[status] || '○'
}

const getNodeStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待处理',
    current: '处理中',
    completed: '已完成',
    rejected: '已驳回',
    skipped: '已跳过',
  }
  return textMap[status] || status
}

const getRoleText = (role: string) => {
  const textMap: Record<string, string> = {
    admin: '管理员',
    clerk: '办事员',
    supervisor: '主管',
    manager: '科长',
    director: '处长',
    user: '用户',
  }
  return textMap[role] || role
}

const getRoleClass = (role: string) => {
  const classMap: Record<string, string> = {
    clerk: 'role-clerk',
    supervisor: 'role-supervisor',
    manager: 'role-manager',
    director: 'role-director',
  }
  return classMap[role] || ''
}

const getActionText = (action: string) => {
  const textMap: Record<string, string> = {
    approve: '通过',
    reject: '驳回',
    transfer: '转交',
    withdraw: '撤回',
    comment: '备注',
  }
  return textMap[action] || action
}

const goBack = () => {
  router.back()
}

const loadData = async () => {
  loading.value = true
  try {
    const [appRes, timelineRes, commentsRes, recordsRes, flowsRes] = await Promise.all([
      applicationApi.getApplication(applicationId),
      approvalApi.getTimeline(applicationId),
      approvalApi.getComments(applicationId),
      approvalApi.getRecordsByApplication(applicationId),
      approvalApi.getFlows(),
    ])
    application.value = appRes.data
    timeline.value = timelineRes.data
    comments.value = commentsRes.data
    records.value = recordsRes.data
    flows.value = flowsRes.data

    if (currentRecord.value?.currentNode?.allowTransfer) {
      const usersRes = await approvalApi.getApproversByRole(
        currentRecord.value.currentNode.role,
      )
      transferUsers.value = usersRes.data.filter(u => u.id !== currentUser.value?.id)
    }

    if (currentRecord.value?.currentNode?.allowReject) {
      const nodesRes = await approvalApi.getRejectableNodes(applicationId)
      rejectableNodes.value = nodesRes.data
    }
  } catch (error) {
    console.error('加载审批详情失败:', error)
  } finally {
    loading.value = false
  }
}

const handleApprove = () => {
  if (!approvalComment.value.trim()) {
    alert('请输入审批意见')
    return
  }
  confirmTitle.value = '确认通过'
  confirmMessage.value = `确定要通过该申请吗？\n\n审批意见：${approvalComment.value}`
  pendingAction.value = doApprove
  showConfirm.value = true
}

const doApprove = async () => {
  if (!currentRecord.value) return
  try {
    await approvalApi.processApproval({
      recordId: currentRecord.value.id,
      approverId: currentUser.value!.id,
      action: 'approve',
      comment: approvalComment.value,
    })
    alert('审批通过成功')
    approvalComment.value = ''
    loadData()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const handleReject = () => {
  if (!approvalComment.value.trim()) {
    alert('请输入驳回理由')
    return
  }
  const targetNodeName = rejectTargetNodeId.value
    ? rejectableNodes.value.find(n => n.nodeId === rejectTargetNodeId.value)?.nodeName
    : '（结束流程）'
  confirmTitle.value = '确认驳回'
  confirmMessage.value = `确定要驳回该申请吗？\n\n驳回到：${targetNodeName}\n驳回理由：${approvalComment.value}`
  pendingAction.value = doReject
  showConfirm.value = true
}

const doReject = async () => {
  if (!currentRecord.value) return
  try {
    await approvalApi.processApproval({
      recordId: currentRecord.value.id,
      approverId: currentUser.value!.id,
      action: 'reject',
      comment: approvalComment.value,
      targetNodeId: rejectTargetNodeId.value || undefined,
    })
    alert('驳回成功')
    approvalComment.value = ''
    rejectTargetNodeId.value = null
    loadData()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const handleTransfer = () => {
  if (!approvalComment.value.trim() || !transferToUserId.value) {
    alert('请输入转交意见并选择转交对象')
    return
  }
  const targetUser = transferUsers.value.find(u => u.id === transferToUserId.value)
  confirmTitle.value = '确认转交'
  confirmMessage.value = `确定要将审批转交给 ${targetUser?.name} 吗？\n\n转交意见：${approvalComment.value}`
  pendingAction.value = doTransfer
  showConfirm.value = true
}

const doTransfer = async () => {
  if (!currentRecord.value) return
  try {
    await approvalApi.processApproval({
      recordId: currentRecord.value.id,
      approverId: currentUser.value!.id,
      action: 'transfer',
      comment: approvalComment.value,
      transferToUserId: transferToUserId.value!,
    })
    alert('转交成功')
    approvalComment.value = ''
    transferToUserId.value = null
    loadData()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const handleWithdraw = () => {
  if (!withdrawReason.value.trim()) {
    alert('请输入撤回原因')
    return
  }
  confirmTitle.value = '确认撤回'
  confirmMessage.value = `确定要撤回该申请吗？\n\n撤回原因：${withdrawReason.value}`
  pendingAction.value = doWithdraw
  showConfirm.value = true
}

const doWithdraw = async () => {
  if (!application.value) return
  try {
    await applicationApi.requestWithdraw({
      applicationId: applicationId,
      userId: currentUser.value!.id,
      reason: withdrawReason.value,
    })
    alert('撤回申请已提交，等待管理员审批')
    withdrawReason.value = ''
    loadData()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const handleStartApproval = () => {
  if (!selectedFlowCode.value) {
    alert('请选择审批流程')
    return
  }
  const flow = flows.value.find(f => f.code === selectedFlowCode.value)
  confirmTitle.value = '启动审批'
  confirmMessage.value = `确定要启动「${flow?.name}」吗？`
  pendingAction.value = doStartApproval
  showConfirm.value = true
}

const doStartApproval = async () => {
  try {
    await approvalApi.startApproval({
      applicationId,
      flowCode: selectedFlowCode.value,
      operatorId: currentUser.value!.id,
    })
    alert('审批流程已启动')
    loadData()
  } catch (error: any) {
    alert(error.response?.data?.message || '操作失败')
  }
}

const confirmAction = () => {
  showConfirm.value = false
  pendingAction.value()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.approval-detail {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.back-btn {
  padding: 8px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #e5e7eb;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
}

.status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.status-submitted {
  background: #e0f2fe;
  color: #0369a1;
}

.status-reviewing {
  background: #fef3c7;
  color: #b45309;
}

.status-approved,
.status-completed {
  background: #dcfce7;
  color: #166534;
}

.status-rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pending {
  background: #f3f4f6;
  color: #4b5563;
}

.loading {
  text-align: center;
  padding: 80px;
  color: #9ca3af;
}

.detail-content {
  display: flex;
  gap: 24px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.info-card,
.timeline-card,
.comments-card,
.action-card,
.material-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.info-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-item {
  flex: 1;
}

.info-item.full-width {
  flex: none;
  width: 100%;
}

.label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 4px;
}

.value {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.value.code {
  font-family: 'Courier New', monospace;
  color: #667eea;
}

.form-data {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.form-data pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #374151;
}

.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-item:last-child .timeline-line {
  display: none;
}

.timeline-left {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: 3px solid #e5e7eb;
  z-index: 1;
}

.timeline-item.current .timeline-dot {
  background: #fef3c7;
  border-color: #f59e0b;
}

.timeline-item.completed .timeline-dot {
  background: #dcfce7;
  border-color: #22c55e;
}

.timeline-item.rejected .timeline-dot {
  background: #fee2e2;
  border-color: #ef4444;
}

.timeline-item.pending .timeline-dot {
  background: #f9fafb;
  border-color: #d1d5db;
}

.dot-icon {
  font-size: 16px;
}

.timeline-line {
  width: 3px;
  flex: 1;
  background: #e5e7eb;
  min-height: 40px;
}

.timeline-item.completed .timeline-line {
  background: #22c55e;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24px;
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.node-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.node-status {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.node-status.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.node-status.current {
  background: #fef3c7;
  color: #b45309;
}

.node-status.completed {
  background: #dcfce7;
  color: #166534;
}

.node-status.rejected {
  background: #fee2e2;
  color: #b91c1c;
}

.node-status.skipped {
  background: #f3f4f6;
  color: #9ca3af;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.role-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-clerk {
  background: #e0f2fe;
  color: #0369a1;
}

.role-supervisor {
  background: #fef3c7;
  color: #b45309;
}

.role-manager {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-director {
  background: #fce7f3;
  color: #be185d;
}

.dept-tag {
  padding: 2px 8px;
  background: #f0fdf4;
  color: #166534;
  border-radius: 4px;
  font-size: 12px;
}

.approver {
  font-size: 12px;
  color: #6b7280;
}

.timeline-comment {
  background: #f9fafb;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.comment-label {
  color: #6b7280;
}

.comment-text {
  color: #1a1a1a;
}

.timeline-time {
  font-size: 12px;
  color: #9ca3af;
}

.empty-comments {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.commenter {
  font-weight: 600;
  color: #1a1a1a;
}

.action-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.action-tag.approve {
  background: #dcfce7;
  color: #166534;
}

.action-tag.reject {
  background: #fee2e2;
  color: #b91c1c;
}

.action-tag.transfer {
  background: #dbeafe;
  color: #1d4ed8;
}

.action-tag.withdraw {
  background: #fef3c7;
  color: #b45309;
}

.action-tag.comment {
  background: #f3f4f6;
  color: #4b5563;
}

.comment-node {
  font-size: 12px;
  color: #6b7280;
}

.comment-time {
  font-size: 12px;
  color: #9ca3af;
  margin-left: auto;
}

.comment-content {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.side-panel {
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.current-node-info {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}

.current-node-label {
  font-size: 12px;
  color: #667eea;
  margin-bottom: 4px;
}

.current-node-name {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.current-node-role {
  font-size: 13px;
  color: #6b7280;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s;
  resize: vertical;
}

.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-reject {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-reject:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-transfer {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-transfer:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-withdraw {
  width: 100%;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-withdraw:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
}

.btn-start {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-cancel {
  background: #f3f4f6;
  color: #4b5563;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.no-action {
  text-align: center;
  padding: 32px 16px;
}

.no-action-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-action-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.no-action-desc {
  font-size: 13px;
  color: #6b7280;
}

.start-tip {
  text-align: center;
  padding: 16px;
  background: #fef3c7;
  color: #b45309;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.empty-materials {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
}

.material-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.material-item:last-child {
  border-bottom: none;
}

.material-icon {
  font-size: 18px;
}

.material-name {
  flex: 1;
  font-size: 14px;
  color: #1a1a1a;
}

.material-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.material-status.normal {
  background: #dcfce7;
  color: #166534;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.modal-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  margin-bottom: 24px;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .detail-content {
    flex-direction: column;
  }

  .side-panel {
    width: 100%;
  }
}
</style>
