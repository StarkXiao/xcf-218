<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">排班管理</h2>
      <el-button type="primary" size="large" @click="openBatchDialog">
        <el-icon><Plus /></el-icon> 批量排班
      </el-button>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-select
          v-model="filterServiceItemId"
          placeholder="选择办事事项"
          clearable
          style="width: 240px"
          @change="loadSchedules"
        >
          <el-option
            v-for="item in serviceItems"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
        <el-date-picker
          v-model="filterDate"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 300px"
          @change="loadSchedules"
        />
      </div>

      <el-table :data="schedules" style="width: 100%; margin-top: 16px">
        <el-table-column label="办事事项" min-width="180">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="140" />
        <el-table-column label="时段" width="180">
          <template #default="{ row }">{{ row.startTime }} - {{ row.endTime }}</template>
        </el-table-column>
        <el-table-column label="预约情况" width="200">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.round((row.bookedCount / row.capacity) * 100)"
              :color="row.bookedCount >= row.capacity ? '#f56c6c' : '#67c23a'"
            />
            <span style="margin-left: 8px; font-size: 13px">
              {{ row.bookedCount }}/{{ row.capacity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.active"
              active-text="启用"
              inactive-text="停用"
              @change="toggleActive(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && schedules.length === 0" description="暂无排班记录" style="padding: 60px 0" />
    </el-card>

    <el-dialog v-model="batchDialogVisible" title="批量排班" width="600px">
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="办事事项" prop="serviceItemId">
          <el-select v-model="batchForm.serviceItemId" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="item in serviceItems"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="batchDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效星期">
          <el-checkbox-group v-model="batchForm.weekdays">
            <el-checkbox :value="1">周一</el-checkbox>
            <el-checkbox :value="2">周二</el-checkbox>
            <el-checkbox :value="3">周三</el-checkbox>
            <el-checkbox :value="4">周四</el-checkbox>
            <el-checkbox :value="5">周五</el-checkbox>
            <el-checkbox :value="6">周六</el-checkbox>
            <el-checkbox :value="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="时段设置">
          <div style="width: 100%">
            <div
              v-for="(slot, idx) in batchForm.timeSlots"
              :key="idx"
              class="time-slot-row"
            >
              <el-time-picker
                v-model="slot.startTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="开始时间"
              />
              <span style="margin: 0 8px">-</span>
              <el-time-picker
                v-model="slot.endTime"
                format="HH:mm"
                value-format="HH:mm"
                placeholder="结束时间"
              />
              <el-input-number
                v-model="slot.capacity"
                :min="1"
                :max="100"
                placeholder="容量"
                style="width: 120px; margin-left: 12px"
              />
              <span style="margin-left: 8px">人</span>
              <el-button
                v-if="batchForm.timeSlots.length > 1"
                type="danger"
                link
                style="margin-left: 12px"
                @click="batchForm.timeSlots.splice(idx, 1)"
              >
                移除
              </el-button>
            </div>
            <el-button type="primary" link style="margin-top: 8px" @click="addTimeSlot">
              <el-icon><Plus /></el-icon> 添加时段
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitBatch">确认生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getServiceItems } from '@/api/service-item'
import { getSchedules, deleteSchedule, updateSchedule, batchCreateSchedules } from '@/api/schedule'
import type { ServiceItem, Schedule } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const serviceItems = ref<ServiceItem[]>([])
const schedules = ref<Schedule[]>([])
const filterServiceItemId = ref<number | null>(null)
const filterDate = ref<string[]>([])
const batchDialogVisible = ref(false)
const batchDateRange = ref<string[]>([])

const batchForm = ref({
  serviceItemId: null as number | null,
  weekdays: [1, 2, 3, 4, 5] as number[],
  timeSlots: [
    { startTime: '09:00', endTime: '10:00', capacity: 10 },
    { startTime: '10:00', endTime: '11:00', capacity: 10 },
    { startTime: '14:00', endTime: '15:00', capacity: 10 },
    { startTime: '15:00', endTime: '16:00', capacity: 10 },
  ],
})

const addTimeSlot = () => {
  batchForm.value.timeSlots.push({ startTime: '09:00', endTime: '10:00', capacity: 10 })
}

const openBatchDialog = () => {
  batchDialogVisible.value = true
}

const loadServiceItems = async () => {
  serviceItems.value = await getServiceItems()
}

const loadSchedules = async () => {
  loading.value = true
  try {
    schedules.value = await getSchedules({
      serviceItemId: filterServiceItemId.value || undefined,
      startDate: filterDate.value?.[0],
      endDate: filterDate.value?.[1],
    })
  } finally {
    loading.value = false
  }
}

const toggleActive = async (row: Schedule) => {
  await updateSchedule(row.id, { active: row.active })
  ElMessage.success(row.active ? '已启用' : '已停用')
}

const handleDelete = async (row: Schedule) => {
  try {
    await ElMessageBox.confirm('确定要删除该排班吗？', '提示', {
      type: 'warning',
    })
    await deleteSchedule(row.id)
    ElMessage.success('删除成功')
    loadSchedules()
  } catch (_) {
    // user cancelled
  }
}

const submitBatch = async () => {
  if (!batchForm.value.serviceItemId) {
    ElMessage.warning('请选择办事事项')
    return
  }
  if (!batchDateRange.value || batchDateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围')
    return
  }
  if (batchForm.value.timeSlots.length === 0) {
    ElMessage.warning('请添加至少一个时段')
    return
  }
  submitting.value = true
  try {
    const created = await batchCreateSchedules({
      serviceItemId: batchForm.value.serviceItemId!,
      startDate: batchDateRange.value[0],
      endDate: batchDateRange.value[1],
      weekdays: batchForm.value.weekdays,
      timeSlots: batchForm.value.timeSlots,
    })
    ElMessage.success(`成功生成 ${created.length} 个排班`)
    batchDialogVisible.value = false
    loadSchedules()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadServiceItems()
  loadSchedules()
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
.filter-bar {
  display: flex;
  gap: 16px;
}
.time-slot-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>
