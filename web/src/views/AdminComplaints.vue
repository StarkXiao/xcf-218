<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">投诉处理与回访</h2>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#409eff"><ChatDotRound /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #409eff">{{ stats?.totalCount || 0 }}</span>
              <span class="stat-label">投诉总数</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#e6a23c"><Clock /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #e6a23c">{{ stats?.pendingCount || 0 }}</span>
              <span class="stat-label">待处理</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#409eff"><Loading /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #409eff">{{ stats?.processingCount || 0 }}</span>
              <span class="stat-label">处理中</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#67c23a"><CircleCheck /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #67c23a">{{ stats?.resolvedCount || 0 }}</span>
              <span class="stat-label">已解决</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#9b59b6"><Phone /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #9b59b6">{{ stats?.callbackCount || 0 }}</span>
              <span class="stat-label">回访次数</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="32" color="#e6a23c"><Star /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #e6a23c">{{ stats?.avgSatisfaction || 0 }}</span>
              <span class="stat-label">回访满意度</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-bottom: 20px">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">投诉列表</span>
          <div>
            <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px; margin-right: 8px" @change="loadComplaints">
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已解决" value="resolved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 130px" @change="loadComplaints">
              <el-option label="服务态度" value="service" />
              <el-option label="办事效率" value="efficiency" />
              <el-option label="流程问题" value="process" />
              <el-option label="违规操作" value="violation" />
              <el-option label="其他" value="other" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="complaints" style="width: 100%" v-loading="loading">
        <el-table-column prop="complaintNo" label="投诉编号" width="200" />
        <el-table-column label="投诉人" width="100">
          <template #default="{ row }">{{ row.user?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="title" label="投诉标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ typeText(row.type) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ row.handler?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="回访" width="70">
          <template #default="{ row }">{{ row.callbacks?.length || 0 }}次</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="投诉时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewComplaint(row)">查看</el-button>
            <el-button v-if="row.status === 'pending' || row.status === 'processing'" type="success" link @click="openHandleDialog(row)">处理</el-button>
            <el-button type="warning" link @click="openCallbackDialog(row)">回访</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailDialogVisible" title="投诉详情" width="700px">
      <template v-if="currentComplaint">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="投诉编号">{{ currentComplaint.complaintNo }}</el-descriptions-item>
          <el-descriptions-item label="投诉类型">{{ typeText(currentComplaint.type) }}</el-descriptions-item>
          <el-descriptions-item label="投诉人">{{ currentComplaint.user?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(currentComplaint.status)">{{ statusText(currentComplaint.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联事项">{{ currentComplaint.serviceItem?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="投诉时间">{{ formatDate(currentComplaint.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="投诉标题" :span="2">{{ currentComplaint.title }}</el-descriptions-item>
          <el-descriptions-item label="投诉内容" :span="2">{{ currentComplaint.content }}</el-descriptions-item>
          <el-descriptions-item v-if="currentComplaint.handleResult" label="处理结果" :span="2">{{ currentComplaint.handleResult }}</el-descriptions-item>
          <el-descriptions-item v-if="currentComplaint.handler" label="处理人">{{ currentComplaint.handler?.name }}</el-descriptions-item>
          <el-descriptions-item v-if="currentComplaint.handleAt" label="处理时间">{{ formatDate(currentComplaint.handleAt) }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="currentComplaint.callbacks && currentComplaint.callbacks.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 12px; padding-left: 8px; border-left: 3px solid #409eff">回访记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="cb in currentComplaint.callbacks"
              :key="cb.id"
              :timestamp="formatDate(cb.callbackAt)"
              placement="top"
            >
              <el-card shadow="never">
                <p><strong>回访方式：</strong>{{ callbackTypeText(cb.callbackType) }}</p>
                <p><strong>回访人：</strong>{{ cb.admin?.name || '管理员' }}</p>
                <p><strong>回访内容：</strong>{{ cb.content }}</p>
                <p v-if="cb.satisfaction"><strong>满意度：</strong><el-rate :model-value="cb.satisfaction" disabled size="small" /></p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="handleDialogVisible" title="处理投诉" width="500px">
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="投诉编号">
          <span>{{ handleTarget?.complaintNo }}</span>
        </el-form-item>
        <el-form-item label="投诉内容">
          <span>{{ handleTarget?.content }}</span>
        </el-form-item>
        <el-form-item label="处理结果" required>
          <el-select v-model="handleForm.status" style="width: 100%">
            <el-option label="标记处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="驳回投诉" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明" required>
          <el-input v-model="handleForm.handleResult" type="textarea" :rows="4" placeholder="请输入处理说明" :maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandle" :loading="handling">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="callbackDialogVisible" title="新增回访记录" width="500px">
      <el-form :model="callbackForm" label-width="100px">
        <el-form-item label="投诉编号">
          <span>{{ callbackTarget?.complaintNo }}</span>
        </el-form-item>
        <el-form-item label="回访方式" required>
          <el-select v-model="callbackForm.callbackType" style="width: 100%">
            <el-option label="电话回访" value="phone" />
            <el-option label="上门回访" value="visit" />
            <el-option label="短信回访" value="message" />
            <el-option label="其他方式" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="回访内容" required>
          <el-input v-model="callbackForm.content" type="textarea" :rows="4" placeholder="请输入回访内容" :maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="满意度">
          <el-rate v-model="callbackForm.satisfaction" :texts="['很不满意', '不满意', '一般', '满意', '很满意']" show-text />
        </el-form-item>
        <el-form-item label="回访时间" required>
          <el-date-picker v-model="callbackForm.callbackAt" type="datetime" placeholder="选择回访时间" style="width: 100%" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="callbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCallback" :loading="callbacking">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getComplaints, getComplaint, handleComplaint, addCallback, getComplaintStatistics } from '@/api/complaint'
import type { Complaint, ComplaintStatistics } from '@/types'
import { ChatDotRound, Clock, Loading, CircleCheck, Phone, Star } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const userStore = useUserStore()
const loading = ref(false)
const handling = ref(false)
const callbacking = ref(false)
const complaints = ref<Complaint[]>([])
const stats = ref<ComplaintStatistics | null>(null)
const filterStatus = ref('')
const filterType = ref('')
const detailDialogVisible = ref(false)
const handleDialogVisible = ref(false)
const callbackDialogVisible = ref(false)
const currentComplaint = ref<Complaint | null>(null)
const handleTarget = ref<Complaint | null>(null)
const callbackTarget = ref<Complaint | null>(null)

const handleForm = reactive({ status: 'processing', handleResult: '' })
const callbackForm = reactive({
  callbackType: 'phone',
  content: '',
  satisfaction: 0,
  callbackAt: '',
})

const typeText = (type: string) => {
  const map: Record<string, string> = { service: '服务态度', efficiency: '办事效率', process: '流程问题', violation: '违规操作', other: '其他' }
  return map[type] || type
}

const statusType = (status: string) => {
  const map: Record<string, string> = { pending: 'warning', processing: 'primary', resolved: 'success', rejected: 'danger' }
  return map[status] || 'info'
}

const statusText = (status: string) => {
  const map: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已解决', rejected: '已驳回' }
  return map[status] || status
}

const callbackTypeText = (type: string) => {
  const map: Record<string, string> = { phone: '电话回访', visit: '上门回访', message: '短信回访', other: '其他方式' }
  return map[type] || type
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadComplaints = async () => {
  loading.value = true
  try {
    complaints.value = await getComplaints(undefined, filterStatus.value || undefined, filterType.value || undefined)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await getComplaintStatistics()
  } catch {}
}

const viewComplaint = async (row: Complaint) => {
  try {
    currentComplaint.value = await getComplaint(row.id)
    detailDialogVisible.value = true
  } catch {}
}

const openHandleDialog = (row: Complaint) => {
  handleTarget.value = row
  handleForm.status = 'processing'
  handleForm.handleResult = ''
  handleDialogVisible.value = true
}

const submitHandle = async () => {
  if (!handleTarget.value || !handleForm.handleResult.trim()) {
    ElMessage.warning('请输入处理说明')
    return
  }
  if (!userStore.user) return

  handling.value = true
  try {
    await handleComplaint(handleTarget.value.id, handleForm.status, userStore.user.id, handleForm.handleResult)
    ElMessage.success('处理成功')
    handleDialogVisible.value = false
    loadComplaints()
    loadStats()
  } catch {
  } finally {
    handling.value = false
  }
}

const openCallbackDialog = (row: Complaint) => {
  callbackTarget.value = row
  callbackForm.callbackType = 'phone'
  callbackForm.content = ''
  callbackForm.satisfaction = 0
  callbackForm.callbackAt = dayjs().format('YYYY-MM-DDTHH:mm:ss')
  callbackDialogVisible.value = true
}

const submitCallback = async () => {
  if (!callbackTarget.value || !callbackForm.content.trim()) {
    ElMessage.warning('请输入回访内容')
    return
  }
  if (!callbackForm.callbackAt) {
    ElMessage.warning('请选择回访时间')
    return
  }
  if (!userStore.user) return

  callbacking.value = true
  try {
    await addCallback(callbackTarget.value.id, {
      adminId: userStore.user.id,
      callbackType: callbackForm.callbackType,
      content: callbackForm.content,
      satisfaction: callbackForm.satisfaction || undefined,
      callbackAt: callbackForm.callbackAt,
    })
    ElMessage.success('回访记录已添加')
    callbackDialogVisible.value = false
    loadComplaints()
    loadStats()
  } catch {
  } finally {
    callbacking.value = false
  }
}

onMounted(() => {
  loadComplaints()
  loadStats()
})
</script>

<style scoped>
.stat-card {
  margin-bottom: 20px;
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
