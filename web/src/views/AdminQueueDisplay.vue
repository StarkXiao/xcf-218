<template>
  <div class="display-container">
    <div class="display-header">
      <div class="header-title">
        <el-icon class="title-icon"><OfficeBuilding /></el-icon>
        <span>政务办事大厅</span>
      </div>
      <div class="header-time">
        <el-icon><Clock /></el-icon>
        <span>{{ currentTime }}</span>
      </div>
    </div>

    <div class="display-body">
      <div class="left-panel">
        <div class="panel-card calling-card">
          <div class="card-title">
            <el-icon><Microphone /></el-icon>
            <span>正在叫号</span>
          </div>
          <div class="calling-list">
            <div v-for="call in displayData.calling" :key="call.id" class="calling-item">
              <div class="calling-window">
                <span class="window-label">{{ call.windowNumber }}号窗口</span>
              </div>
              <div class="calling-number">{{ call.queueNumber }}</div>
              <div class="calling-service">{{ call.serviceItem?.name || '-' }}</div>
              <div class="calling-name">{{ call.applicantName || call.user?.name || '-' }}</div>
            </div>
            <el-empty v-if="displayData.calling.length === 0" description="暂无叫号" :image-size="80" />
          </div>
        </div>

        <div class="panel-card completed-card">
          <div class="card-title">
            <el-icon><CircleCheck /></el-icon>
            <span>已办理完成</span>
          </div>
          <div class="completed-list">
            <div v-for="call in displayData.completed" :key="call.id" class="completed-item">
              <span class="completed-number">{{ call.queueNumber }}</span>
              <span class="completed-window">{{ call.windowNumber }}号窗口</span>
              <span class="completed-service">{{ call.serviceItem?.name || '-' }}</span>
            </div>
            <el-empty v-if="displayData.completed.length === 0" description="暂无完成记录" :image-size="60" />
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-card waiting-card">
          <div class="card-title">
            <el-icon><List /></el-icon>
            <span>等待队列</span>
            <span class="waiting-count">共 {{ displayData.waiting.length }} 人等待</span>
          </div>
          <div class="waiting-list">
            <div
              v-for="(item, idx) in displayData.waiting"
              :key="item.id"
              class="waiting-item"
              :class="{ first: idx === 0 }"
            >
              <div class="waiting-rank">
                <span v-if="idx === 0" class="rank-first">1</span>
                <span v-else class="rank-normal">{{ idx + 1 }}</span>
              </div>
              <div class="waiting-info">
                <div class="waiting-number">{{ item.queueNumber }}</div>
                <div class="waiting-name">{{ item.applicantName || item.user?.name }}</div>
              </div>
              <div class="waiting-service">{{ item.serviceItem?.name }}</div>
              <div class="waiting-window">{{ item.windowNumber }}号窗口</div>
            </div>
            <el-empty v-if="displayData.waiting.length === 0" description="暂无等待人员" :image-size="100" />
          </div>
        </div>
      </div>
    </div>

    <div class="display-footer">
      <el-button type="primary" @click="refreshData" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新数据
      </el-button>
      <el-button @click="goBack">
        <el-icon><Back /></el-icon> 返回
      </el-button>
      <div class="auto-refresh">
        <el-switch v-model="autoRefresh" active-text="自动刷新" />
        <span v-if="autoRefresh" class="refresh-tip">（每 {{ refreshInterval / 1000 }} 秒）</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { OfficeBuilding, Clock, Microphone, CircleCheck, List, Refresh, Back } from '@element-plus/icons-vue'
import { getDisplayCalls } from '@/api/window-coordination'
import type { DisplayCalls } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const autoRefresh = ref(true)
const refreshInterval = 10000
let timer: any = null

const currentTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
const displayData = reactive<DisplayCalls>({
  calling: [],
  waiting: [],
  completed: [],
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await getDisplayCalls()
    displayData.calling = data.calling
    displayData.waiting = data.waiting
    displayData.completed = data.completed
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const updateTime = () => {
  currentTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadData()
  updateTime()
  timer = setInterval(() => {
    updateTime()
    if (autoRefresh.value) {
      loadData()
    }
  }, refreshInterval)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped>
.display-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: #fff;
  padding: 20px;
}
.display-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 4px;
}
.title-icon {
  font-size: 40px;
}
.header-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 500;
}
.display-body {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}
.left-panel {
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.right-panel {
  width: 50%;
}
.panel-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(10px);
}
.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}
.calling-card {
  flex: 1;
}
.calling-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.calling-item {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
.calling-window {
  margin-bottom: 8px;
}
.window-label {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
}
.calling-number {
  font-size: 56px;
  font-weight: 900;
  letter-spacing: 4px;
  margin: 8px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}
.calling-service {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 4px;
}
.calling-name {
  font-size: 18px;
  opacity: 0.85;
}
.completed-card {
  max-height: 300px;
}
.completed-list {
  max-height: 220px;
  overflow-y: auto;
}
.completed-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.completed-item:last-child {
  border-bottom: none;
}
.completed-number {
  font-size: 20px;
  font-weight: 700;
  color: #67c23a;
  min-width: 100px;
}
.completed-window {
  font-size: 14px;
  opacity: 0.8;
  min-width: 100px;
}
.completed-service {
  font-size: 14px;
  opacity: 0.7;
  flex: 1;
}
.waiting-card {
  min-height: 600px;
}
.waiting-count {
  margin-left: auto;
  font-size: 14px;
  font-weight: 400;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 20px;
}
.waiting-list {
  max-height: 500px;
  overflow-y: auto;
}
.waiting-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 10px;
  transition: all 0.3s;
}
.waiting-item.first {
  background: linear-gradient(135deg, rgba(230, 162, 60, 0.3) 0%, rgba(230, 162, 60, 0.1) 100%);
  border: 1px solid rgba(230, 162, 60, 0.5);
}
.waiting-rank {
  min-width: 40px;
  text-align: center;
}
.rank-first {
  display: inline-block;
  width: 36px;
  height: 36px;
  line-height: 36px;
  background: linear-gradient(135deg, #e6a23c 0%, #d48806 100%);
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}
.rank-normal {
  font-size: 20px;
  font-weight: 600;
  opacity: 0.7;
}
.waiting-info {
  flex: 1;
}
.waiting-number {
  font-size: 24px;
  font-weight: 700;
}
.waiting-name {
  font-size: 14px;
  opacity: 0.8;
  margin-top: 2px;
}
.waiting-service {
  font-size: 14px;
  opacity: 0.7;
  min-width: 150px;
}
.waiting-window {
  font-size: 14px;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 20px;
}
.display-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
}
.auto-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
}
.refresh-tip {
  font-size: 14px;
  opacity: 0.8;
}
:deep(.el-empty__description) {
  color: rgba(255, 255, 255, 0.6);
}
</style>
