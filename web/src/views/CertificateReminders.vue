<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">证照到期提醒</h2>
      <div>
        <el-button type="primary" @click="loadReminders">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon stat-icon-warning">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">待续办</div>
              <div class="stat-value">{{ stats.pending }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon stat-icon-success">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">已续办</div>
              <div class="stat-value">{{ stats.completed }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon stat-icon-danger">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">7天内到期</div>
              <div class="stat-value">{{ stats.urgent }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon stat-icon-info">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">已过期</div>
              <div class="stat-value">{{ stats.expired }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 160px">
            <el-option label="待续办" value="pending" />
            <el-option label="已续办" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadReminders">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="reminders" style="width: 100%">
        <el-table-column label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getUrgencyType(row.daysBeforeExpiry)" effect="dark" size="small">
              {{ getUrgencyText(row.daysBeforeExpiry) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="证照编号" width="220">
          <template #default="{ row }">{{ row.certificate?.certificateNo }}</template>
        </el-table-column>
        <el-table-column label="证照类型" width="120">
          <template #default="{ row }">{{ row.certificate?.certificateType }}</template>
        </el-table-column>
        <el-table-column label="证照名称">
          <template #default="{ row }">{{ row.serviceItem?.name || row.certificate?.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="到期日期" width="180">
          <template #default="{ row }">{{ formatDate(row.expiredAt) }}</template>
        </el-table-column>
        <el-table-column label="剩余天数" width="120">
          <template #default="{ row }">
            <span :class="getDaysClass(row.daysBeforeExpiry)">
              {{ getDaysText(row.daysBeforeExpiry) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.renewalInitiated ? 'success' : 'warning'" size="small">
              {{ row.renewalInitiated ? '已续办' : '待续办' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提醒时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button
              v-if="!row.renewalInitiated && row.serviceItemId"
              type="warning"
              link
              @click="goToRenew(row)"
            >
              立即续办
            </el-button>
            <el-button
              v-if="row.serviceItemId"
              type="primary"
              link
              @click="goToServiceItem(row.serviceItemId!)"
            >
              查看事项
            </el-button>
            <el-button
              type="info"
              link
              @click="viewCertificate(row.certificateId)"
            >
              查看证照
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end; display: flex"
        @size-change="loadReminders"
        @current-change="loadReminders"
      />

      <el-empty v-if="!loading && reminders.length === 0" description="暂无到期提醒" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getMyReminders, initiateRenewal } from '@/api/certificate-reminder'
import type { CertificateReminder } from '@/types'
import dayjs from 'dayjs'
import { Refresh, Clock, Check, Warning, Document } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const reminders = ref<CertificateReminder[]>([])
const total = ref(0)

const stats = reactive({
  pending: 0,
  completed: 0,
  urgent: 0,
  expired: 0,
})

const filterForm = reactive({
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
})

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const getUrgencyType = (days: number) => {
  if (days <= 0) return 'info'
  if (days <= 1) return 'danger'
  if (days <= 7) return 'warning'
  if (days <= 15) return ''
  return 'success'
}

const getUrgencyText = (days: number) => {
  if (days <= 0) return '已过期'
  if (days <= 1) return '特别紧急'
  if (days <= 7) return '紧急'
  if (days <= 15) return '提醒'
  return '温馨提示'
}

const getDaysClass = (days: number) => {
  if (days <= 0) return 'text-red-600 font-bold'
  if (days <= 7) return 'text-orange-600 font-bold'
  if (days <= 15) return 'text-yellow-600'
  return 'text-green-600'
}

const getDaysText = (days: number) => {
  if (days <= 0) return `已过期${Math.abs(days)}天`
  return `剩余${days}天`
}

const calculateStats = () => {
  const pending = reminders.value.filter(r => !r.renewalInitiated)
  stats.pending = pending.length
  stats.completed = reminders.value.filter(r => r.renewalInitiated).length
  stats.urgent = pending.filter(r => r.daysBeforeExpiry > 0 && r.daysBeforeExpiry <= 7).length
  stats.expired = pending.filter(r => r.daysBeforeExpiry <= 0).length
}

const loadReminders = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const result = await getMyReminders({
      status: filterForm.status || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    reminders.value = result.list
    total.value = result.total
    calculateStats()
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.status = ''
  pagination.page = 1
  loadReminders()
}

const goToRenew = async (reminder: CertificateReminder) => {
  try {
    await ElMessageBox.confirm(
      `该证照将在${reminder.daysBeforeExpiry > 0 ? reminder.daysBeforeExpiry + '天后' : '已'}到期，确定要申请续办吗？`,
      '证照续办',
      {
        confirmButtonText: '立即续办',
        cancelButtonText: '取消',
        type: reminder.daysBeforeExpiry <= 7 ? 'error' : 'warning',
      }
    )
    await initiateRenewal(reminder.id)
    if (reminder.serviceItemId) {
      router.push(`/apply/${reminder.serviceItemId}?renewal=1&certificateId=${reminder.certificateId}`)
    }
    loadReminders()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败，请重试')
    }
  }
}

const goToServiceItem = (serviceItemId: number) => {
  router.push(`/services/${serviceItemId}`)
}

const viewCertificate = (certificateId: number) => {
  router.push(`/certificates/${certificateId}`)
}

onMounted(loadReminders)
</script>

<style scoped>
.stat-card {
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
}

.stat-icon-warning {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.stat-icon-success {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
}

.stat-icon-danger {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon-info {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}
</style>
