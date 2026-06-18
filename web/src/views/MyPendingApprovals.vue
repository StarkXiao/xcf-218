<template>
  <div class="pending-approvals">
    <h2 class="page-title">待办审批</h2>
    
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ pendingRecords.length }}</div>
        <div class="stat-label">待我处理</div>
      </div>
    </div>

    <div class="search-bar">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索申请编号、事项名称..."
        class="search-input"
      />
    </div>

    <div class="approval-list" v-if="filteredRecords.length > 0">
      <div
        v-for="record in filteredRecords"
        :key="record.id"
        class="approval-card"
        @click="goToDetail(record.applicationId)"
      >
        <div class="card-header">
          <span class="application-no">{{ record.application?.applicationNo }}</span>
          <span :class="['node-tag', getNodeClass(record.currentNode?.role)]">
            {{ record.currentNode?.nodeName }}
          </span>
        </div>
        
        <div class="card-body">
          <h3 class="service-name">{{ record.application?.serviceItem?.name }}</h3>
          <div class="applicant-info">
            <span>申请人：{{ record.application?.user?.name }}</span>
            <span class="separator">|</span>
            <span>提交时间：{{ formatDate(record.application?.createdAt) }}</span>
          </div>
          <div class="flow-info">
            <span class="role-badge">{{ record.currentNode?.role }}</span>
            <span v-if="record.currentNode?.department" class="dept-badge">
              {{ record.currentNode?.department }}
            </span>
          </div>
        </div>
        
        <div class="card-footer">
          <span class="time-info">
            待办时间：{{ formatDate(record.createdAt) }}
          </span>
          <span class="action-hint">点击查看详情 →</span>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <div class="empty-icon">📋</div>
      <div class="empty-text">暂无待办审批</div>
      <div class="empty-desc">所有审批都已处理完毕</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { approvalApi } from '@/api/approval'
import type { ApprovalRecord } from '@/types'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const pendingRecords = ref<ApprovalRecord[]>([])
const searchKeyword = ref('')

const filteredRecords = computed(() => {
  if (!searchKeyword.value) return pendingRecords.value
  const keyword = searchKeyword.value.toLowerCase()
  return pendingRecords.value.filter(
    r =>
      r.application?.applicationNo.toLowerCase().includes(keyword) ||
      r.application?.serviceItem?.name.toLowerCase().includes(keyword),
  )
})

const getNodeClass = (role?: string) => {
  const classMap: Record<string, string> = {
    clerk: 'node-clerk',
    supervisor: 'node-supervisor',
    manager: 'node-manager',
    director: 'node-director',
  }
  return role ? classMap[role] || '' : ''
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const goToDetail = (applicationId: number) => {
  router.push(`/approvals/${applicationId}`)
}

const loadPendingApprovals = async () => {
  try {
    const res = await approvalApi.getPendingRecords({
      approverId: userStore.user?.id,
      role: userStore.user?.role,
    })
    pendingRecords.value = res.data
  } catch (error) {
    console.error('加载待办审批失败:', error)
  }
}

onMounted(() => {
  loadPendingApprovals()
})
</script>

<style scoped>
.pending-approvals {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1a1a1a;
}

.stats-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.search-bar {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.approval-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.approval-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.application-no {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.node-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.node-clerk {
  background: #e0f2fe;
  color: #0369a1;
}

.node-supervisor {
  background: #fef3c7;
  color: #b45309;
}

.node-manager {
  background: #dbeafe;
  color: #1d4ed8;
}

.node-director {
  background: #fce7f3;
  color: #be185d;
}

.card-body {
  margin-bottom: 12px;
}

.service-name {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.applicant-info {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
}

.separator {
  margin: 0 8px;
  color: #d1d5db;
}

.flow-info {
  display: flex;
  gap: 8px;
}

.role-badge,
.dept-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: #f3f4f6;
  color: #4b5563;
}

.dept-badge {
  background: #f0fdf4;
  color: #166534;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.time-info {
  font-size: 12px;
  color: #9ca3af;
}

.action-hint {
  font-size: 12px;
  color: #667eea;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  color: #6b7280;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #9ca3af;
}
</style>
