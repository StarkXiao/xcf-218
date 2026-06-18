<template>
  <div class="page-container">
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">异地办理总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-warning">
          <div class="stat-value">{{ stats.pendingVerify + stats.pendingAccept }}</div>
          <div class="stat-label">待处理</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-primary">
          <div class="stat-value">{{ stats.processingLocal + stats.processingRemote }}</div>
          <div class="stat-label">审核中</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-success">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <div class="page-header">
        <h2 class="page-title">异地办理协同管理</h2>
        <div class="header-actions">
          <el-select v-model="filterStatus" placeholder="按状态筛选" clearable style="width: 160px; margin-right: 8px" @change="loadApplications">
            <el-option label="待属地校验" value="pending_verify" />
            <el-option label="待异地受理" value="pending_accept" />
            <el-option label="属地审核中" value="processing_local" />
            <el-option label="异地审核中" value="processing_remote" />
            <el-option label="审核通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="办理完成" value="completed" />
            <el-option label="校验未通过" value="verify_failed" />
          </el-select>
          <el-select v-model="filterHandler" placeholder="按处理方筛选" clearable style="width: 140px" @change="loadApplications">
            <el-option label="属地部门" value="local" />
            <el-option label="异地部门" value="remote" />
          </el-select>
        </div>
      </div>

      <el-table :data="applications" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="crossRegionNo" label="申请编号" width="170" />
        <el-table-column label="申请人" width="90">
          <template #default="{ row }">
            {{ row.user?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="办理事项" min-width="130">
          <template #default="{ row }">
            {{ row.serviceItem?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="属地部门" width="120">
          <template #default="{ row }">
            {{ row.localDepartment?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="异地受理部门" width="120">
          <template #default="{ row }">
            {{ row.remoteDepartment?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前处理" width="90">
          <template #default="{ row }">
            <el-tag :type="row.currentHandler === 'local' ? '' : 'warning'" size="small">
              {{ row.currentHandlerLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.statusLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="属地校验" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.jurisdictionVerifyStatus === 'passed'" type="success" size="small">通过</el-tag>
            <el-tag v-else-if="row.jurisdictionVerifyStatus === 'failed'" type="danger" size="small">未通过</el-tag>
            <el-tag v-else type="info" size="small">待校验</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="155">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending_verify'"
              type="success"
              link
              size="small"
              @click="openVerifyDialog(row, true)"
            >校验通过</el-button>
            <el-button
              v-if="row.status === 'pending_verify'"
              type="danger"
              link
              size="small"
              @click="openVerifyDialog(row, false)"
            >校验驳回</el-button>
            <el-button
              v-if="['pending_accept', 'processing_local', 'processing_remote'].includes(row.status)"
              type="warning"
              link
              size="small"
              @click="openSwitchDialog(row)"
            >切换部门</el-button>
            <el-button
              v-if="['pending_accept', 'processing_local'].includes(row.status)"
              type="success"
              link
              size="small"
              @click="openStatusDialog(row, 'approved')"
            >通过</el-button>
            <el-button
              v-if="['pending_accept', 'processing_local', 'processing_remote'].includes(row.status)"
              type="danger"
              link
              size="small"
              @click="openStatusDialog(row, 'rejected')"
            >驳回</el-button>
            <el-button
              v-if="['approved', 'processing_local', 'processing_remote'].includes(row.status)"
              type="primary"
              link
              size="small"
              @click="completeApplication(row)"
            >完成</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="verifyDialogVisible" :title="verifyPassed ? '属地校验通过' : '属地校验驳回'" width="500px">
      <el-form :model="verifyForm" label-width="100px">
        <el-form-item label="申请编号">{{ currentApp?.crossRegionNo }}</el-form-item>
        <el-form-item label="办理事项">{{ currentApp?.serviceItem?.name }}</el-form-item>
        <el-form-item label="校验意见">
          <el-input v-model="verifyForm.reason" type="textarea" :rows="3" :placeholder="verifyPassed ? '校验通过意见（可选）' : '请填写驳回原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialogVisible = false">取消</el-button>
        <el-button :type="verifyPassed ? 'success' : 'danger'" @click="submitVerify" :loading="actionLoading">
          确认{{ verifyPassed ? '通过' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="switchDialogVisible" title="切换受理部门" width="500px">
      <el-form :model="switchForm" label-width="100px">
        <el-form-item label="申请编号">{{ currentApp?.crossRegionNo }}</el-form-item>
        <el-form-item label="当前处理方">
          <el-tag :type="currentApp?.currentHandler === 'local' ? '' : 'warning'">
            {{ currentApp?.currentHandlerLabel }}
          </el-tag>
        </el-form-item>
        <el-form-item label="切换至">
          <el-radio-group v-model="switchForm.targetHandler">
            <el-radio value="local">属地部门（{{ currentApp?.localDepartment?.name }}）</el-radio>
            <el-radio value="remote">异地部门（{{ currentApp?.remoteDepartment?.name }}）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="切换原因">
          <el-input v-model="switchForm.reason" type="textarea" :rows="3" placeholder="请填写切换原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="switchDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="submitSwitch" :loading="actionLoading">确认切换</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" :title="statusAction === 'approved' ? '审核通过' : '审核驳回'" width="500px">
      <el-form :model="statusForm" label-width="100px">
        <el-form-item label="申请编号">{{ currentApp?.crossRegionNo }}</el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="statusForm.comment" type="textarea" :rows="3" :placeholder="statusAction === 'approved' ? '审核意见（可选）' : '请填写驳回原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button :type="statusAction === 'approved' ? 'success' : 'danger'" @click="submitStatus" :loading="actionLoading">
          确认{{ statusAction === 'approved' ? '通过' : '驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { crossRegionApi } from '@/api/cross-region'
import type { CrossRegionApplication, CrossRegionStatistics } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const actionLoading = ref(false)
const applications = ref<CrossRegionApplication[]>([])
const stats = ref<CrossRegionStatistics>({
  total: 0, pendingVerify: 0, pendingAccept: 0, processingLocal: 0, processingRemote: 0,
  approved: 0, rejected: 0, completed: 0, verifyFailed: 0, byLocalDept: {}, byRemoteDept: {}, switchCount: 0,
})

const filterStatus = ref('')
const filterHandler = ref('')

const verifyDialogVisible = ref(false)
const verifyPassed = ref(true)
const currentApp = ref<CrossRegionApplication | null>(null)
const verifyForm = ref({ reason: '' })

const switchDialogVisible = ref(false)
const switchForm = ref({ targetHandler: 'remote' as 'local' | 'remote', reason: '' })

const statusDialogVisible = ref(false)
const statusAction = ref('approved')
const statusForm = ref({ comment: '' })

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending_verify: 'warning', pending_accept: 'warning', processing_local: '', processing_remote: '',
    approved: 'success', rejected: 'danger', completed: 'success', verify_failed: 'danger',
  }
  return map[status] || 'info'
}

const formatTime = (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm')

const loadApplications = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterHandler.value) params.currentHandler = filterHandler.value
    applications.value = await crossRegionApi.getAllApplications(params)
  } catch (error) {
    console.error('加载失败', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await crossRegionApi.getStatistics()
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

const openVerifyDialog = (app: CrossRegionApplication, passed: boolean) => {
  currentApp.value = app
  verifyPassed.value = passed
  verifyForm.value.reason = ''
  verifyDialogVisible.value = true
}

const submitVerify = async () => {
  if (!currentApp.value || !userStore.user?.id) return
  if (!verifyPassed.value && !verifyForm.value.reason) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  actionLoading.value = true
  try {
    await crossRegionApi.verifyJurisdiction({
      crossRegionApplicationId: currentApp.value.id,
      verifierId: userStore.user.id,
      passed: verifyPassed.value,
      reason: verifyForm.value.reason,
    })
    ElMessage.success(verifyPassed.value ? '属地校验已通过' : '属地校验已驳回')
    verifyDialogVisible.value = false
    await loadApplications()
    await loadStats()
  } catch (error) {
    console.error('操作失败', error)
  } finally {
    actionLoading.value = false
  }
}

const openSwitchDialog = (app: CrossRegionApplication) => {
  currentApp.value = app
  switchForm.value.targetHandler = app.currentHandler === 'local' ? 'remote' : 'local'
  switchForm.value.reason = ''
  switchDialogVisible.value = true
}

const submitSwitch = async () => {
  if (!currentApp.value || !userStore.user?.id) return
  if (!switchForm.value.reason) {
    ElMessage.warning('请填写切换原因')
    return
  }
  actionLoading.value = true
  try {
    await crossRegionApi.switchDepartment({
      crossRegionApplicationId: currentApp.value.id,
      operatorId: userStore.user.id,
      targetHandler: switchForm.value.targetHandler,
      reason: switchForm.value.reason,
    })
    ElMessage.success('受理部门已切换')
    switchDialogVisible.value = false
    await loadApplications()
    await loadStats()
  } catch (error) {
    console.error('切换失败', error)
  } finally {
    actionLoading.value = false
  }
}

const openStatusDialog = (app: CrossRegionApplication, action: string) => {
  currentApp.value = app
  statusAction.value = action
  statusForm.value.comment = ''
  statusDialogVisible.value = true
}

const submitStatus = async () => {
  if (!currentApp.value) return
  if (statusAction.value === 'rejected' && !statusForm.value.comment) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  actionLoading.value = true
  try {
    await crossRegionApi.updateStatus(
      currentApp.value.id,
      statusAction.value,
      statusForm.value.comment,
      userStore.user?.id,
    )
    ElMessage.success(statusAction.value === 'approved' ? '已通过' : '已驳回')
    statusDialogVisible.value = false
    await loadApplications()
    await loadStats()
  } catch (error) {
    console.error('操作失败', error)
  } finally {
    actionLoading.value = false
  }
}

const completeApplication = async (app: CrossRegionApplication) => {
  try {
    await ElMessageBox.confirm('确定将该异地办理标记为完成？', '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await crossRegionApi.updateStatus(app.id, 'completed', '', userStore.user?.id)
    ElMessage.success('已标记为完成')
    await loadApplications()
    await loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('操作失败', error)
    }
  }
}

onMounted(async () => {
  await Promise.all([loadApplications(), loadStats()])
})
</script>

<style scoped>
.page-container {
  max-width: 1400px;
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
.header-actions {
  display: flex;
  align-items: center;
}
.stat-card {
  text-align: center;
  padding: 10px 0;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.stat-warning .stat-value { color: #e6a23c; }
.stat-primary .stat-value { color: #409eff; }
.stat-success .stat-value { color: #67c23a; }
</style>
