<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的投诉</h2>
      <el-button type="warning" @click="showComplaintDialog">我要投诉</el-button>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadComplaints">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="complaints" style="width: 100%">
        <el-table-column prop="complaintNo" label="投诉编号" width="200" />
        <el-table-column prop="title" label="投诉标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">{{ typeText(row.type) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.handleResult">{{ row.handleResult }}</span>
            <span v-else style="color: #c0c4cc">暂无</span>
          </template>
        </el-table-column>
        <el-table-column label="回访次数" width="100">
          <template #default="{ row }">
            <el-badge :value="row.callbacks?.length || 0" :type="(row.callbacks?.length || 0) > 0 ? 'primary' : 'info'" />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="投诉时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewComplaint(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && complaints.length === 0" description="暂无投诉记录" />
    </el-card>

    <el-dialog v-model="complaintDialogVisible" title="我要投诉" width="600px" :close-on-click-modal="false">
      <el-form :model="complaintForm" label-width="100px" :rules="complaintRules" ref="complaintFormRef">
        <el-form-item label="投诉类型" prop="type">
          <el-select v-model="complaintForm.type" placeholder="请选择投诉类型" style="width: 100%">
            <el-option label="服务态度" value="service" />
            <el-option label="办事效率" value="efficiency" />
            <el-option label="流程问题" value="process" />
            <el-option label="违规操作" value="violation" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联办件">
          <el-select v-model="complaintForm.applicationId" placeholder="请选择关联办件（选填）" clearable style="width: 100%" @change="onAppChange">
            <el-option
              v-for="app in myApplications"
              :key="app.id"
              :label="`${app.applicationNo} - ${app.serviceItem?.name || ''}`"
              :value="app.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="投诉标题" prop="title">
          <el-input v-model="complaintForm.title" placeholder="请输入投诉标题" :maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="投诉内容" prop="content">
          <el-input v-model="complaintForm.content" type="textarea" :rows="5" placeholder="请详细描述您的问题" :maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="complaintDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="submitComplaint" :loading="submitting">提交投诉</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="投诉详情" width="700px">
      <template v-if="currentComplaint">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="投诉编号">{{ currentComplaint.complaintNo }}</el-descriptions-item>
          <el-descriptions-item label="投诉类型">{{ typeText(currentComplaint.type) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(currentComplaint.status)">{{ statusText(currentComplaint.status) }}</el-tag>
          </el-descriptions-item>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getComplaints, createComplaint, getComplaint } from '@/api/complaint'
import { getApplications } from '@/api/application'
import type { Complaint, Application } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const complaints = ref<Complaint[]>([])
const myApplications = ref<Application[]>([])
const complaintDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentComplaint = ref<Complaint | null>(null)
const complaintFormRef = ref<FormInstance>()

const filterForm = reactive({ status: '' })

const complaintForm = reactive({
  type: '',
  applicationId: null as number | null,
  serviceItemId: null as number | null,
  title: '',
  content: '',
})

const complaintRules = {
  type: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入投诉标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入投诉内容', trigger: 'blur' }],
}

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
  if (!userStore.user) return
  loading.value = true
  try {
    complaints.value = await getComplaints(userStore.user.id, filterForm.status || undefined)
  } finally {
    loading.value = false
  }
}

const loadMyApplications = async () => {
  if (!userStore.user) return
  try {
    myApplications.value = await getApplications(userStore.user.id)
  } catch {}
}

const showComplaintDialog = () => {
  loadMyApplications()
  complaintForm.type = ''
  complaintForm.applicationId = null
  complaintForm.serviceItemId = null
  complaintForm.title = ''
  complaintForm.content = ''
  complaintDialogVisible.value = true
}

const onAppChange = (val: number) => {
  const app = myApplications.value.find(a => a.id === val)
  if (app) {
    complaintForm.serviceItemId = app.serviceItemId
  } else {
    complaintForm.serviceItemId = null
  }
}

const submitComplaint = async () => {
  if (!complaintFormRef.value) return
  await complaintFormRef.value.validate()
  if (!userStore.user) return

  submitting.value = true
  try {
    await createComplaint({
      userId: userStore.user.id,
      applicationId: complaintForm.applicationId || undefined,
      serviceItemId: complaintForm.serviceItemId || undefined,
      type: complaintForm.type,
      title: complaintForm.title,
      content: complaintForm.content,
    })
    ElMessage.success('投诉提交成功')
    complaintDialogVisible.value = false
    loadComplaints()
  } catch {
  } finally {
    submitting.value = false
  }
}

const viewComplaint = async (row: Complaint) => {
  try {
    currentComplaint.value = await getComplaint(row.id)
    detailDialogVisible.value = true
  } catch {}
}

const resetFilter = () => {
  filterForm.status = ''
  loadComplaints()
}

onMounted(loadComplaints)
</script>
