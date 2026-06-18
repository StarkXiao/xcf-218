<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <template v-if="detail">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card style="margin-bottom: 20px">
            <div class="page-header">
              <h2 class="page-title">异地办理详情</h2>
              <el-tag :type="getStatusType(detail.status)">{{ detail.statusLabel }}</el-tag>
            </div>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="申请编号">{{ detail.crossRegionNo }}</el-descriptions-item>
              <el-descriptions-item label="办理事项">{{ detail.serviceItem?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="属地部门">{{ detail.localDepartment?.name || '-' }}（{{ detail.localDepartment?.region }}）</el-descriptions-item>
              <el-descriptions-item label="异地受理部门">{{ detail.remoteDepartment?.name || '-' }}（{{ detail.remoteDepartment?.region }}）</el-descriptions-item>
              <el-descriptions-item label="当前处理方">
                <el-tag :type="detail.currentHandler === 'local' ? '' : 'warning'" size="small">
                  {{ detail.currentHandlerLabel }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="申请人所在地">{{ detail.applicantLocation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="属地校验状态">
                <el-tag v-if="detail.jurisdictionVerifyStatus === 'passed'" type="success" size="small">已通过</el-tag>
                <el-tag v-else-if="detail.jurisdictionVerifyStatus === 'failed'" type="danger" size="small">未通过</el-tag>
                <el-tag v-else type="info" size="small">待校验</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="部门切换次数">{{ detail.departmentSwitchCount || 0 }} 次</el-descriptions-item>
              <el-descriptions-item label="提交时间">{{ formatTime(detail.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ detail.completedAt ? formatTime(detail.completedAt) : '-' }}</el-descriptions-item>
            </el-descriptions>

            <div v-if="detail.reviewComment" style="margin-top: 16px">
              <el-alert :title="`审核意见：${detail.reviewComment}`" type="info" :closable="false" show-icon />
            </div>
          </el-card>

          <el-card style="margin-bottom: 20px">
            <template #header>
              <span class="card-title">协同进度（共享）</span>
            </template>
            <el-timeline v-if="progressShares.length > 0">
              <el-timeline-item
                v-for="share in progressShares"
                :key="share.id"
                :timestamp="formatTime(share.createdAt)"
                :type="getShareStatusType(share.status)"
                placement="top"
              >
                <div class="timeline-step">{{ share.step }}</div>
                <div class="timeline-remark" v-if="share.remark">{{ share.remark }}</div>
                <div class="timeline-dept">
                  {{ share.fromDepartment?.name || '-' }} → {{ share.toDepartment?.name || '-' }}
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无协同进度" :image-size="60" />
          </el-card>

          <el-card v-if="detail.departmentSwitchLog && detail.departmentSwitchLog.length > 0">
            <template #header>
              <span class="card-title">部门切换记录</span>
            </template>
            <el-timeline>
              <el-timeline-item
                v-for="(log, idx) in detail.departmentSwitchLog"
                :key="idx"
                :timestamp="formatTime(log.switchedAt)"
                type="warning"
                placement="top"
              >
                <div>
                  {{ log.from === 'local' ? '属地部门' : '异地部门' }}
                  →
                  {{ log.to === 'local' ? '属地部门' : '异地部门' }}
                </div>
                <div v-if="log.reason" style="color: #909399; font-size: 12px">原因：{{ log.reason }}</div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card style="margin-bottom: 20px">
            <template #header>
              <span class="card-title">消息触达记录</span>
            </template>
            <div v-if="messageLogs.length > 0" class="message-list">
              <div v-for="log in messageLogs" :key="log.id" class="message-item">
                <div class="message-role">
                  <el-tag :type="getRoleTagType(log.targetRole)" size="small">
                    {{ getRoleLabel(log.targetRole) }}
                  </el-tag>
                </div>
                <div class="message-title">{{ log.title }}</div>
                <div class="message-content">{{ log.content }}</div>
                <div class="message-time">{{ formatTime(log.createdAt) }}</div>
              </div>
            </div>
            <el-empty v-else description="暂无消息记录" :image-size="60" />
          </el-card>

          <el-card>
            <template #header>
              <span class="card-title">属地校验详情</span>
            </template>
            <div v-if="detail.jurisdictionVerifyResult">
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="校验结果">
                  <el-tag :type="detail.jurisdictionVerifyStatus === 'passed' ? 'success' : 'danger'" size="small">
                    {{ detail.jurisdictionVerifyStatus === 'passed' ? '通过' : '未通过' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-if="detail.jurisdictionVerifyResult.verifyReason" label="校验说明">
                  {{ detail.jurisdictionVerifyResult.verifyReason }}
                </el-descriptions-item>
                <el-descriptions-item v-if="detail.jurisdictionVerifyResult.verifierName" label="校验人">
                  {{ detail.jurisdictionVerifyResult.verifierName }}
                </el-descriptions-item>
                <el-descriptions-item v-if="detail.jurisdictionVerifyResult.verifiedAt" label="校验时间">
                  {{ formatTime(detail.jurisdictionVerifyResult.verifiedAt) }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
            <el-empty v-else description="待校验" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { crossRegionApi } from '@/api/cross-region'
import type { CrossRegionApplication, CrossRegionProgressShare, CrossRegionMessageLog } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const id = Number(route.params.id)

const loading = ref(false)
const detail = ref<CrossRegionApplication | null>(null)
const progressShares = ref<CrossRegionProgressShare[]>([])
const messageLogs = ref<CrossRegionMessageLog[]>([])

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

const getShareStatusType = (status: string) => {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  return 'primary'
}

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    local_admin: '属地管理员',
    remote_admin: '异地管理员',
  }
  return map[role] || role
}

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = {
    applicant: '',
    local_admin: 'warning',
    remote_admin: 'success',
  }
  return map[role] || 'info'
}

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

onMounted(async () => {
  loading.value = true
  try {
    const [app, shares, logs] = await Promise.all([
      crossRegionApi.getApplication(id),
      crossRegionApi.getProgressShares(id, 'applicant'),
      crossRegionApi.getMessageLogs(id),
    ])
    detail.value = app
    progressShares.value = shares
    messageLogs.value = logs
  } catch (error) {
    console.error('加载详情失败', error)
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
.card-title {
  font-weight: 600;
  font-size: 15px;
}
.timeline-step {
  font-weight: 600;
  font-size: 14px;
}
.timeline-remark {
  color: #606266;
  font-size: 13px;
  margin-top: 4px;
}
.timeline-dept {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.message-list {
  max-height: 500px;
  overflow-y: auto;
}
.message-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.message-item:last-child {
  border-bottom: none;
}
.message-role {
  margin-bottom: 4px;
}
.message-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}
.message-content {
  color: #606266;
  font-size: 12px;
  line-height: 1.5;
  margin-bottom: 4px;
}
.message-time {
  color: #c0c4cc;
  font-size: 11px;
}
</style>
