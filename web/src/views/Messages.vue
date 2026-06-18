<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">消息中心</h2>
      <div>
        <el-button type="primary" @click="markAllRead" :disabled="!hasUnread">
          全部标为已读
        </el-button>
        <el-button @click="loadMessages">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-card v-loading="loading">
      <el-table :data="messages" style="width: 100%" @row-click="handleRowClick">
        <el-table-column width="60" align="center">
          <template #default="{ row }">
            <el-badge :is-dot="!row.read" />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getMessageType(row.type)" size="small">
              {{ getMessageTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <span :class="{ 'unread-title': !row.read }">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button
              v-if="!row.read"
              type="primary"
              link
              @click.stop="markOneRead(row.id)"
            >
              标为已读
            </el-button>
            <el-button
              v-if="row.type === 'supplement' && userStore.isAdmin && row.applicationId"
              type="warning"
              link
              @click.stop="goToReview(row.applicationId)"
            >
              前往审核
            </el-button>
            <el-button
              v-if="row.type === 'supplement' && !userStore.isAdmin"
              type="warning"
              link
              @click.stop="goToSupplement"
            >
              前往补件
            </el-button>
            <el-button
              v-if="row.applicationId"
              type="primary"
              link
              @click.stop="goToApplication(row.applicationId)"
            >
              查看申请
            </el-button>
            <el-button
              v-if="row.appointmentId"
              type="success"
              link
              @click.stop="goToAppointment(row.appointmentId)"
            >
              查看预约
            </el-button>
            <el-button
              v-if="row.type === 'subscription' && row.serviceItemId"
              type="success"
              link
              @click.stop="goToServiceItem(row.serviceItemId)"
            >
              查看事项
            </el-button>
            <el-button
              v-if="row.type === 'certificate'"
              type="success"
              link
              @click.stop="goToCertificates"
            >
              查看证明
            </el-button>
            <el-button
              v-if="row.type === 'certificate-reminder'"
              type="warning"
              link
              @click.stop="goToCertificateRenewal(row)"
            >
              立即续办
            </el-button>
            <el-button
              v-if="row.type === 'certificate-reminder' && row.serviceItemId"
              type="primary"
              link
              @click.stop="goToServiceItem(row.serviceItemId)"
            >
              查看事项
            </el-button>
            <el-button
              v-if="(row.type === 'window' || row.type === 'queue') && row.windowHandlingId"
              type="warning"
              link
              @click.stop="goToWindowHandling(row.windowHandlingId)"
            >
              查看窗口记录
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && messages.length === 0" description="暂无消息" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getMessages, markAsRead, markAllAsRead } from '@/api/message'
import type { Message } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const messages = ref<Message[]>([])

const hasUnread = computed(() => messages.value.some(m => !m.read))

const getMessageType = (type: string) => {
  const map: Record<string, string> = {
    application: 'primary',
    appointment: 'success',
    supplement: 'warning',
    subscription: 'success',
    certificate: 'success',
    'certificate-reminder': 'warning',
    window: 'warning',
    queue: 'danger',
    system: 'info',
  }
  return map[type] || 'info'
}

const getMessageTypeText = (type: string) => {
  const map: Record<string, string> = {
    application: '申请通知',
    appointment: '预约通知',
    supplement: '补件通知',
    subscription: '订阅通知',
    certificate: '证明通知',
    'certificate-reminder': '证照提醒',
    window: '窗口通知',
    queue: '叫号通知',
    system: '系统通知',
  }
  return map[type] || '系统通知'
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadMessages = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    messages.value = await getMessages(userStore.user.id)
  } finally {
    loading.value = false
  }
}

const handleRowClick = async (row: Message) => {
  if (!row.read) {
    await markOneRead(row.id)
  }
  if (row.type === 'certificate') {
    goToCertificates()
  } else if (row.type === 'certificate-reminder') {
    goToCertificateRenewal(row)
  } else if (row.type === 'supplement') {
    if (userStore.isAdmin && row.applicationId) {
      goToReview(row.applicationId)
    } else {
      goToSupplement()
    }
  } else if (row.type === 'window' || row.type === 'queue') {
    if (row.windowHandlingId) {
      goToWindowHandling(row.windowHandlingId)
    }
  } else if (row.appointmentId) {
    goToAppointment(row.appointmentId)
  } else if (row.applicationId) {
    goToApplication(row.applicationId)
  } else if (row.type === 'subscription' && row.serviceItemId) {
    goToServiceItem(row.serviceItemId)
  }
}

const markOneRead = async (id: number) => {
  await markAsRead(id)
  const msg = messages.value.find(m => m.id === id)
  if (msg) msg.read = true
}

const markAllRead = async () => {
  if (!userStore.user) return
  await markAllAsRead(userStore.user.id)
  messages.value.forEach(m => (m.read = true))
  ElMessage.success('已全部标为已读')
}

const goToApplication = (id: number) => {
  router.push(`/applications/${id}`)
}

const goToAppointment = (id: number) => {
  router.push(`/my-appointments?highlight=${id}`)
}

const goToSupplement = () => {
  router.push('/supplement-center')
}

const goToReview = (applicationId: number) => {
  router.push(`/admin/review/${applicationId}`)
}

const goToServiceItem = (serviceItemId: number) => {
  router.push(`/services/${serviceItemId}`)
}

const goToCertificates = () => {
  router.push('/my-certificates')
}

const goToCertificateRenewal = (row: Message) => {
  if (row.serviceItemId) {
    router.push(`/apply/${row.serviceItemId}?renewal=1`)
  } else {
    router.push('/certificate-reminders')
  }
}

const goToWindowHandling = (id: number) => {
  if (userStore.isAdmin) {
    router.push(`/admin/window-coordination?highlight=${id}`)
  } else {
    router.push(`/my-window-handlings?highlight=${id}`)
  }
}

onMounted(loadMessages)
</script>

<style scoped>
.unread-title {
  font-weight: 600;
  color: #303133;
}
</style>
