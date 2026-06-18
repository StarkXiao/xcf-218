<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">我的预约</h2>
      <div class="filter-bar">
        <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 160px" @change="loadList">
          <el-option label="待办理" value="pending" />
          <el-option label="已签到" value="checked_in" />
          <el-option label="办理中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="已过期" value="no_show" />
        </el-select>
      </div>
    </div>

    <el-empty v-if="!loading && list.length === 0" description="暂无预约记录" style="padding: 80px 0" />

    <div v-else class="appointment-list">
      <el-card
        v-for="appt in list"
        :key="appt.id"
        class="appointment-card"
        :class="{ 'is-highlight': highlightId === appt.id }"
        shadow="hover"
      >
        <div class="card-header">
          <div class="card-title">
            <el-tag :type="statusTagType(appt.status)" effect="dark" style="margin-right: 12px">
              {{ statusText(appt.status) }}
            </el-tag>
            <span class="service-name">{{ appt.serviceItem?.name }}</span>
          </div>
          <div class="queue-no">
            <span class="label">排队号</span>
            <span class="value">{{ appt.queueNumber }}</span>
          </div>
        </div>

        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <el-icon><Calendar /></el-icon>
              <span class="info-label">预约日期</span>
              <span class="info-value">{{ appt.appointmentDate }} ({{ weekdayText(appt.appointmentDate) }})</span>
            </div>
            <div class="info-item">
              <el-icon><Clock /></el-icon>
              <span class="info-label">预约时段</span>
              <span class="info-value">{{ appt.startTime }} - {{ appt.endTime }}</span>
            </div>
            <div class="info-item">
              <el-icon><Tickets /></el-icon>
              <span class="info-label">预约编号</span>
              <span class="info-value">{{ appt.appointmentNo }}</span>
            </div>
            <div class="info-item" v-if="appt.checkInTime">
              <el-icon><CircleCheck /></el-icon>
              <span class="info-label">签到时间</span>
              <span class="info-value">{{ formatDateTime(appt.checkInTime) }}</span>
            </div>
          </div>

          <div v-if="appt.remark" class="remark-box">
            <el-icon color="#e6a23c"><Warning /></el-icon>
            <span>备注：{{ appt.remark }}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="create-time">创建时间：{{ formatDateTime(appt.createdAt) }}</span>
          <div class="action-btns">
            <el-button
              v-if="appt.status === 'pending'"
              type="danger"
              plain
              @click="handleCancel(appt)"
            >
              取消预约
            </el-button>
            <el-button
              v-if="appt.applicationId"
              type="primary"
              link
              @click="$router.push(`/applications/${appt.applicationId}`)"
            >
              查看申请详情
            </el-button>
            <el-button
              v-if="appt.status === 'pending'"
              type="primary"
              @click="goApply(appt)"
            >
              提交材料
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getAppointments, cancelAppointment, linkAppointmentApplication } from '@/api/appointment'
import type { Appointment } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const list = ref<Appointment[]>([])
const statusFilter = ref('')
const highlightId = ref<number | null>(null)

const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const weekdayText = (date: string) => {
  return weekdayMap[dayjs(date).day()]
}

const formatDateTime = (t: string) => {
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

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

const loadList = async () => {
  if (!userStore.user?.id) return
  loading.value = true
  try {
    list.value = await getAppointments({
      userId: userStore.user.id,
      status: statusFilter.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

const handleCancel = async (appt: Appointment) => {
  try {
    await ElMessageBox.confirm('确定要取消该预约吗？', '提示', {
      confirmButtonText: '确定取消',
      cancelButtonText: '再想想',
      type: 'warning',
    })
    await cancelAppointment(appt.id, userStore.user!.id)
    ElMessage.success('预约已取消')
    loadList()
  } catch (_) {
    // user cancelled
  }
}

const goApply = async (appt: Appointment) => {
  router.push(`/apply/${appt.serviceItemId}?appointmentId=${appt.id}`)
}

onMounted(async () => {
  if (route.query.highlight) {
    highlightId.value = Number(route.query.highlight)
  }
  await loadList()
  if (highlightId.value) {
    await nextTick()
    const el = document.querySelector('.is-highlight')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.appointment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.appointment-card {
  border-radius: 8px;
}
.appointment-card.is-highlight {
  border: 2px solid #409eff;
  animation: highlight-fade 3s ease-out;
}
@keyframes highlight-fade {
  0% { box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.4); }
  100% { box-shadow: none; }
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.card-title {
  display: flex;
  align-items: center;
}
.service-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.queue-no {
  text-align: right;
}
.queue-no .label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.queue-no .value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}
.card-body {
  margin-bottom: 16px;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}
.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.info-item .el-icon {
  color: #909399;
}
.info-label {
  color: #909399;
}
.info-value {
  color: #303133;
  font-weight: 500;
}
.remark-box {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: #fdf6ec;
  border-radius: 4px;
  font-size: 13px;
  color: #e6a23c;
  margin-top: 12px;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
.create-time {
  font-size: 12px;
  color: #909399;
}
.action-btns {
  display: flex;
  gap: 8px;
}
</style>
