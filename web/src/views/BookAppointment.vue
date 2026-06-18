<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="item">
      <div class="page-header">
        <h2 class="page-title">预约取号 - {{ item.name }}</h2>
        <el-tag type="info">{{ item.processingDays }} 个工作日</el-tag>
      </div>

      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 40px">
        <el-step title="选择日期" />
        <el-step title="选择时段" />
        <el-step title="确认预约" />
      </el-steps>

      <div v-if="currentStep === 0" class="step-content">
        <div class="section-title">请选择预约日期</div>
        <div class="date-picker-wrapper">
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            :disabled-date="disabledDate"
            value-format="YYYY-MM-DD"
            size="large"
            style="width: 300px"
            @change="loadSchedules"
          />
        </div>
        <div class="quick-dates">
          <el-button
            v-for="d in quickDates"
            :key="d.value"
            :type="selectedDate === d.value ? 'primary' : ''"
            @click="selectDate(d.value)"
          >
            {{ d.label }}
          </el-button>
        </div>
        <div class="footer-actions">
          <el-button size="large" @click="$router.back()">取消</el-button>
          <el-button type="primary" size="large" :disabled="!selectedDate" @click="nextStep">
            下一步
          </el-button>
        </div>
      </div>

      <div v-else-if="currentStep === 1" class="step-content">
        <div class="section-title">
          请选择预约时段
          <span class="date-info">{{ selectedDate }} ({{ weekdayText }})</span>
        </div>
        <div v-if="schedules.length === 0" class="empty-state">
          <el-empty description="该日期暂无可用时段，请选择其他日期" />
        </div>
        <div v-else class="time-slots">
          <div
            v-for="slot in schedules"
            :key="slot.id"
            class="time-slot"
            :class="{
              'is-selected': selectedScheduleId === slot.id,
              'is-full': slot.bookedCount >= slot.capacity,
            }"
            @click="selectSlot(slot)"
          >
            <div class="slot-time">
              <el-icon><Clock /></el-icon>
              {{ slot.startTime }} - {{ slot.endTime }}
            </div>
            <div class="slot-availability">
              <el-progress
                :percentage="Math.round((slot.bookedCount / slot.capacity) * 100)"
                :color="slot.bookedCount >= slot.capacity ? '#f56c6c' : '#67c23a'"
                :stroke-width="6"
                :show-text="false"
                style="width: 80px; margin-right: 8px"
              />
              <span :class="slot.bookedCount >= slot.capacity ? 'full' : 'available'">
                {{ slot.capacity - slot.bookedCount }}/{{ slot.capacity }} 剩余
              </span>
            </div>
          </div>
        </div>
        <div class="footer-actions">
          <el-button size="large" @click="prevStep">上一步</el-button>
          <el-button type="primary" size="large" :disabled="!selectedScheduleId" @click="nextStep">
            下一步
          </el-button>
        </div>
      </div>

      <div v-else-if="currentStep === 2" class="step-content">
        <div class="section-title">确认预约信息</div>
        <div class="confirm-card" v-if="selectedSlot">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="事项名称">{{ item.name }}</el-descriptions-item>
            <el-descriptions-item label="事项编码">{{ item.code }}</el-descriptions-item>
            <el-descriptions-item label="预约日期">{{ selectedDate }} ({{ weekdayText }})</el-descriptions-item>
            <el-descriptions-item label="预约时段">{{ selectedSlot.startTime }} - {{ selectedSlot.endTime }}</el-descriptions-item>
            <el-descriptions-item label="剩余名额">{{ selectedSlot.capacity - selectedSlot.bookedCount }} 个</el-descriptions-item>
          </el-descriptions>

          <div class="remark-section">
            <el-input
              v-model="remark"
              type="textarea"
              :rows="2"
              placeholder="备注信息（可选）"
              maxlength="200"
              show-word-limit
            />
          </div>

          <el-alert
            title="温馨提示"
            type="info"
            :closable="false"
            style="margin-top: 16px"
          >
            <p>1. 请按时到达办理地点，逾期未到预约将自动取消</p>
            <p>2. 请携带相关材料原件和复印件</p>
            <p>3. 如需取消预约，请提前操作</p>
          </el-alert>
        </div>
        <div class="footer-actions">
          <el-button size="large" @click="prevStep">上一步</el-button>
          <el-button type="primary" size="large" :loading="submitting" @click="submitBooking">
            确认预约
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getServiceItemById } from '@/api/service-item'
import { getAvailableSchedules } from '@/api/schedule'
import { createAppointment } from '@/api/appointment'
import type { ServiceItem, Schedule } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const item = ref<ServiceItem | null>(null)
const currentStep = ref(0)
const selectedDate = ref('')
const selectedScheduleId = ref<number | null>(null)
const schedules = ref<Schedule[]>([])
const remark = ref('')

const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const weekdayText = computed(() => {
  if (!selectedDate.value) return ''
  const d = dayjs(selectedDate.value)
  return weekdayMap[d.day()]
})

const selectedSlot = computed(() => schedules.value.find(s => s.id === selectedScheduleId.value))

const quickDates = computed(() => {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = dayjs().add(i, 'day')
    dates.push({
      label: i === 0 ? '今天' : i === 1 ? '明天' : `${d.month() + 1}/${d.date()} ${weekdayMap[d.day()]}`,
      value: d.format('YYYY-MM-DD'),
    })
  }
  return dates
})

const disabledDate = (time: Date) => {
  return time.getTime() < dayjs().startOf('day').valueOf()
}

const loadItem = async () => {
  loading.value = true
  try {
    item.value = await getServiceItemById(Number(route.params.id))
    selectedDate.value = dayjs().format('YYYY-MM-DD')
    await loadSchedules()
  } finally {
    loading.value = false
  }
}

const loadSchedules = async () => {
  if (!selectedDate.value || !item.value) return
  schedules.value = await getAvailableSchedules(item.value.id, selectedDate.value)
  selectedScheduleId.value = null
}

const selectDate = (date: string) => {
  selectedDate.value = date
  loadSchedules()
}

const selectSlot = (slot: Schedule) => {
  if (slot.bookedCount >= slot.capacity) return
  selectedScheduleId.value = slot.id
}

const nextStep = () => {
  if (currentStep.value < 2) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const submitBooking = async () => {
  if (!userStore.user || !selectedScheduleId.value) return
  submitting.value = true
  try {
    const result = await createAppointment({
      userId: userStore.user.id,
      scheduleId: selectedScheduleId.value,
      remark: remark.value,
    })
    ElMessage.success(`预约成功！排队号：${result.queueNumber}`)
    router.push(`/my-appointments`)
  } finally {
    submitting.value = false
  }
}

onMounted(loadItem)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.step-content {
  max-width: 800px;
  margin: 0 auto;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}
.section-title .date-info {
  font-size: 14px;
  font-weight: 400;
  color: #909399;
  margin-left: 12px;
}
.date-picker-wrapper {
  margin-bottom: 20px;
}
.quick-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 32px;
}
.time-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}
.time-slot {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.time-slot:hover {
  border-color: #409eff;
}
.time-slot.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.time-slot.is-full {
  opacity: 0.6;
  cursor: not-allowed;
}
.time-slot.is-full:hover {
  border-color: #e4e7ed;
}
.slot-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}
.slot-availability {
  display: flex;
  align-items: center;
  font-size: 13px;
}
.slot-availability .available {
  color: #67c23a;
}
.slot-availability .full {
  color: #f56c6c;
}
.empty-state {
  padding: 60px 0;
}
.confirm-card {
  margin-bottom: 32px;
}
.remark-section {
  margin-top: 20px;
}
.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}
</style>
