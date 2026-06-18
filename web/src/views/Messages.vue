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
            <el-tag :type="row.type === 'application' ? 'primary' : 'info'" size="small">
              {{ row.type === 'application' ? '申请通知' : '系统通知' }}
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
        <el-table-column label="操作" width="120">
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
              v-if="row.applicationId"
              type="primary"
              link
              @click.stop="goToApplication(row.applicationId)"
            >
              查看申请
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
  if (row.applicationId) {
    goToApplication(row.applicationId)
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

onMounted(loadMessages)
</script>

<style scoped>
.unread-title {
  font-weight: 600;
  color: #303133;
}
</style>
