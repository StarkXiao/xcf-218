<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">预约办理</h2>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <div class="filter-bar">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 200px"
              @change="loadData"
            />
            <el-select
              v-model="filterServiceItemId"
              placeholder="全部事项"
              clearable
              style="width: 200px"
              @change="loadData"
            >
              <el-option
                v-for="item in serviceItems"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 160px"
              @change="loadAppointments"
            >
              <el-option label="待办理" value="pending" />
              <el-option label="已签到" value="checked_in" />
              <el-option label="办理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="已过期" value="no_show" />
            </el-select>
            <el-button type="primary" @click="loadData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6" v-for="stat in statsList" :key="stat.key">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>预约列表</span>
              <div>
                <el-button
                  v-if="pendingList.length > 0"
                  type="warning"
                  @click="callNext"
                  :disabled="calling"
                >
                  <el-icon><Microphone /></el-icon> 叫下一号
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="appointments" style="width: 100%">
            <el-table-column label="排队号" width="140">
              <template #default="{ row }">
                <span class="queue-no">{{ row.queueNumber }}</span>
              </template>
            </el-table-column>
            <el-table-column label="预约编号" width="180" prop="appointmentNo" />
            <el-table-column label="办事事项" min-width="160">
              <template #default="{ row }">{{ row.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="申请人" width="100">
              <template #default="{ row }">{{ row.user?.name }}</template>
            </el-table-column>
            <el-table-column label="时段" width="160">
              <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="签到时间" width="180">
              <template #default="{ row }">
                {{ row.checkInTime ? formatDateTime(row.checkInTime) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'pending'"
                  type="success"
                  size="small"
                  @click="handleCheckIn(row)"
                >
                  签到
                </el-button>
                <el-button
                  v-if="row.status === 'checked_in'"
                  type="primary"
                  size="small"
                  @click="handleStartProcess(row)"
                >
                  开始办理
                </el-button>
                <el-button
                  v-if="row.status === 'processing'"
                  type="success"
                  size="small"
                  @click="handleComplete(row)"
                >
                  完成办理
                </el-button>
                <el-button
                  v-if="['pending', 'checked_in'].includes(row.status)"
                  type="danger"
                  size="small"
                  @click="handleNoShow(row)"
                >
                  标记未到
                </el-button>
                <el-button
                  v-if="row.applicationId"
                  type="primary"
                  link
                  size="small"
                  @click="$router.push(`/admin/review/${row.applicationId}`)"
                >
                  申请详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loading && appointments.length === 0" description="暂无预约" style="padding: 60px 0" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="completeDialogVisible" title="完成办理" width="500px">
      <el-form :model="completeForm" label-width="100px">
        <el-form-item label="办理结果">
          <el-radio-group v-model="completeForm.result">
            <el-radio value="success">办理成功</el-radio>
            <el-radio value="failed">材料不足</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="completeForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入办理备注"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmComplete">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getServiceItems } from '@/api/service-item'
import { getAppointments, getAppointmentStats, updateAppointmentStatus } from '@/api/appointment'
import type { Appointment, AppointmentStats, ServiceItem } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const calling = ref(false)
const serviceItems = ref<ServiceItem[]>([])
const appointments = ref<Appointment[]>([])
const stats = ref<AppointmentStats[]>([])
const filterDate = ref(dayjs().format('YYYY-MM-DD'))
const filterServiceItemId = ref<number | null>(null)
const filterStatus = ref('')
const completeDialogVisible = ref(false)
const currentAppointment = ref<Appointment | null>(null)
const completeForm = ref({
  result: 'success',
  remark: '',
})

const pendingList = computed(() => appointments.value.filter(a => a.status === 'pending' || a.status === 'checked_in'))

const statsList = computed(() => {
  const all = appointments.value
  return [
    { key: 'total', label: '今日预约总数', value: all.length, color: '#409eff' },
    { key: 'pending', label: '待办理', value: all.filter(a => a.status === 'pending').length, color: '#e6a23c' },
    { key: 'checked_in', label: '已签到', value: all.filter(a => a.status === 'checked_in').length, color: '#409eff' },
    { key: 'completed', label: '已完成', value: all.filter(a => a.status === 'completed').length, color: '#67c23a' },
  ]
})

const statusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待办理',
    checked_in: '已签到',
    processing: '办理中',
    completed: '已完成',
    cancelled: '已取消',
    no_show: '已过期',
  }
  return map[status] || status
}

const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    checked_in: 'primary',
    processing: '',
    completed: 'success',
    cancelled: 'info',
    no_show: 'danger',
  }
  return map[status] || ''
}

const formatDateTime = (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')

const loadServiceItems = async () => {
  serviceItems.value = await getServiceItems()
}

const loadAppointments = async () => {
  loading.value = true
  try {
    appointments.value = await getAppointments({
      serviceItemId: filterServiceItemId.value || undefined,
      date: filterDate.value,
      status: filterStatus.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  if (filterDate.value) {
    stats.value = await getAppointmentStats(filterDate.value)
  }
}

const loadData = () => {
  loadAppointments()
  loadStats()
}

const handleCheckIn = async (row: Appointment) => {
  await updateAppointmentStatus(row.id, 'checked_in', undefined, userStore.user?.id)
  ElMessage.success(`排队号 ${row.queueNumber} 签到成功`)
  loadAppointments()
}

const handleStartProcess = async (row: Appointment) => {
  await updateAppointmentStatus(row.id, 'processing', undefined, userStore.user?.id)
  ElMessage.success(`开始办理 ${row.queueNumber}`)
  loadAppointments()
}

const handleComplete = (row: Appointment) => {
  currentAppointment.value = row
  completeForm.value = { result: 'success', remark: '' }
  completeDialogVisible.value = true
}

const confirmComplete = async () => {
  if (!currentAppointment.value) return
  const remark = completeForm.value.result === 'success'
    ? (completeForm.value.remark || '办理完成')
    : (completeForm.value.remark || '材料不足，请补充材料')
  await updateAppointmentStatus(
    currentAppointment.value.id,
    'completed',
    remark,
    userStore.user?.id
  )
  ElMessage.success('办理完成')
  completeDialogVisible.value = false
  loadAppointments()
}

const handleNoShow = async (row: Appointment) => {
  await updateAppointmentStatus(row.id, 'no_show', undefined, userStore.user?.id)
  ElMessage.success(`已标记 ${row.queueNumber} 未到场`)
  loadAppointments()
}

const callNext = async () => {
  calling.value = true
  try {
    const next = pendingList.value[0]
    if (next) {
      ElMessage.info(`请 ${next.queueNumber} 号（${next.user?.name}）到窗口办理`)
      await new Promise(r => setTimeout(r, 2000))
    }
  } finally {
    calling.value = false
  }
}

onMounted(() => {
  loadServiceItems()
  loadData()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.queue-no {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
}
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
}
</style>
