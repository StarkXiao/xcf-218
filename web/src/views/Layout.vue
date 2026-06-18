<template>
  <el-container class="layout-container">
    <el-header class="layout-header">
      <div class="header-left">
        <span class="logo-icon">🏛️</span>
        <span class="system-title">政务办事大厅</span>
      </div>
      <div class="header-right">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="msg-badge">
          <el-button text @click="goMessages">
            <el-icon><Bell /></el-icon>
            <span style="margin-left: 4px">消息中心</span>
          </el-button>
        </el-badge>
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-avatar :size="32" style="background: #409eff">
              {{ userStore.user?.name?.charAt(0) || 'U' }}
            </el-avatar>
            <span class="username">{{ userStore.user?.name }}</span>
            <el-tag v-if="userStore.isAdmin" type="danger" size="small" style="margin-left: 8px">
              管理员
            </el-tag>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人信息</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    <el-container>
      <el-aside width="220px" class="layout-aside">
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#001529"
          text-color="#ffffffa6"
          active-text-color="#ffffff"
        >
          <el-menu-item index="/home">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/high-frequency">
            <el-icon><HotWater /></el-icon>
            <span>高频事项</span>
          </el-menu-item>
          <el-menu-item index="/services">
            <el-icon><Search /></el-icon>
            <span>事项查询</span>
          </el-menu-item>
          <el-menu-item index="/my-appointments">
            <el-icon><Calendar /></el-icon>
            <span>我的预约</span>
          </el-menu-item>
          <el-menu-item index="/my-applications">
            <el-icon><List /></el-icon>
            <span>进度跟踪</span>
          </el-menu-item>
          <el-sub-menu index="joint">
            <template #title>
              <el-icon><DocumentCopy /></el-icon>
              <span>联合申报</span>
            </template>
            <el-menu-item index="/joint-apply">发起联合申报</el-menu-item>
            <el-menu-item index="/my-joint-applications">我的联合申报</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/approvals/pending">
            <el-icon><EditPen /></el-icon>
            <span>待办审批</span>
          </el-menu-item>
          <el-menu-item index="/supplement-center">
            <el-icon><Refresh /></el-icon>
            <span>补件中心</span>
          </el-menu-item>
          <el-sub-menu index="proxy">
            <template #title>
              <el-icon><UserFilled /></el-icon>
              <span>代办人管理</span>
            </template>
            <el-menu-item index="/proxy-apply">代办人申请</el-menu-item>
            <el-menu-item index="/my-proxy-applications">我的申请</el-menu-item>
            <el-menu-item index="/proxy-relations">代办关系</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="personal">
            <template #title>
              <el-icon><User /></el-icon>
              <span>个人中心</span>
            </template>
            <el-menu-item index="/my-favorites">我的收藏</el-menu-item>
            <el-menu-item index="/my-subscriptions">我的订阅</el-menu-item>
            <el-menu-item index="/my-certificates">我的证明</el-menu-item>
            <el-menu-item index="/certificate-reminders">
              <el-badge :value="reminderCount" :hidden="reminderCount === 0" class="inline-badge">
                证照到期提醒
              </el-badge>
            </el-menu-item>
            <el-menu-item index="/my-window-handlings">窗口办理</el-menu-item>
            <el-menu-item index="/my-evaluations">我的评价</el-menu-item>
            <el-menu-item index="/my-complaints">我的投诉</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/messages">
            <el-icon><Bell /></el-icon>
            <span>消息中心</span>
          </el-menu-item>
          <el-sub-menu v-if="userStore.isAdmin" index="admin-menu">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>管理后台</span>
            </template>
            <el-menu-item index="/admin">管理首页</el-menu-item>
            <el-menu-item index="/admin/service-items">事项管理</el-menu-item>
            <el-menu-item index="/admin/schedule">排班管理</el-menu-item>
            <el-menu-item index="/admin/appointments">预约办理</el-menu-item>
            <el-menu-item index="/admin/supplement">补件管理</el-menu-item>
            <el-menu-item index="/admin/withdrawal-review">撤回审批</el-menu-item>
            <el-menu-item index="/admin/proxy">代办人审核</el-menu-item>
            <el-menu-item index="/admin/certificates">证明管理</el-menu-item>
            <el-menu-item index="/admin/window-coordination">窗口协同办理</el-menu-item>
            <el-menu-item index="/admin/queue-display">叫号大屏</el-menu-item>
            <el-menu-item index="/admin/material-templates">材料模板管理</el-menu-item>
            <el-menu-item index="/admin/evaluation-dashboard">评价统计看板</el-menu-item>
            <el-menu-item index="/admin/complaints">投诉处理与回访</el-menu-item>
            <el-menu-item index="/admin/high-frequency">高频事项配置</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getUnreadCount } from '@/api/message'
import { getMyReminders } from '@/api/certificate-reminder'
import {
  HomeFilled,
  Search,
  Calendar,
  List,
  Refresh,
  UserFilled,
  Bell,
  Setting,
  User,
  ArrowDown,
  EditPen,
  DocumentCopy,
  HotWater,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)
const reminderCount = ref(0)

const activeMenu = computed(() => {
  if (route.path.startsWith('/high-frequency')) return '/high-frequency'
  if (route.path.startsWith('/services')) return '/services'
  if (route.path.startsWith('/book')) return '/services'
  if (route.path.startsWith('/apply')) return '/services'
  if (route.path.startsWith('/applications')) return '/my-applications'
  if (route.path.startsWith('/my-favorites')) return '/my-favorites'
  if (route.path.startsWith('/my-subscriptions')) return '/my-subscriptions'
  if (route.path.startsWith('/my-certificates')) return '/my-certificates'
  if (route.path.startsWith('/certificate-reminders')) return '/certificate-reminders'
  if (route.path.startsWith('/certificates')) return '/my-certificates'
  if (route.path.startsWith('/admin/service-items')) return '/admin/service-items'
  if (route.path.startsWith('/admin/schedule')) return '/admin/schedule'
  if (route.path.startsWith('/admin/appointments')) return '/admin/appointments'
  if (route.path.startsWith('/admin/supplement')) return '/admin/supplement'
  if (route.path.startsWith('/admin/withdrawal-review')) return '/admin/withdrawal-review'
  if (route.path.startsWith('/admin/proxy')) return '/admin/proxy'
  if (route.path.startsWith('/admin/certificates')) return '/admin/certificates'
  if (route.path.startsWith('/admin/window-coordination')) return '/admin/window-coordination'
  if (route.path.startsWith('/admin/queue-display')) return '/admin/queue-display'
  if (route.path.startsWith('/admin/material-templates')) return '/admin/material-templates'
  if (route.path.startsWith('/admin/evaluation-dashboard')) return '/admin/evaluation-dashboard'
  if (route.path.startsWith('/admin/complaints')) return '/admin/complaints'
  if (route.path.startsWith('/admin/high-frequency')) return '/admin/high-frequency'
  if (route.path.startsWith('/my-window-handlings')) return '/my-window-handlings'
  if (route.path.startsWith('/my-evaluations')) return '/my-evaluations'
  if (route.path.startsWith('/my-complaints')) return '/my-complaints'
  if (route.path.startsWith('/admin/review')) return '/admin'
  if (route.path.startsWith('/admin')) return '/admin'
  if (route.path.startsWith('/supplement-center')) return '/supplement-center'
  if (route.path.startsWith('/proxy-apply')) return '/proxy-apply'
  if (route.path.startsWith('/proxy-applications')) return '/my-proxy-applications'
  if (route.path.startsWith('/my-proxy-applications')) return '/my-proxy-applications'
  if (route.path.startsWith('/proxy-relations')) return '/proxy-relations'
  if (route.path.startsWith('/approvals/pending')) return '/approvals/pending'
  if (route.path.startsWith('/approvals/')) return '/approvals/pending'
  if (route.path.startsWith('/joint-apply')) return '/joint-apply'
  if (route.path.startsWith('/joint-applications')) return '/my-joint-applications'
  if (route.path.startsWith('/my-joint-applications')) return '/my-joint-applications'
  return route.path
})

const loadUnreadCount = async () => {
  if (userStore.user?.id) {
    unreadCount.value = await getUnreadCount(userStore.user.id)
  }
}

const loadReminderCount = async () => {
  if (userStore.user?.id) {
    try {
      const result = await getMyReminders({ status: 'pending', page: 1, pageSize: 1 })
      reminderCount.value = result.total
    } catch (error) {
      console.error('获取提醒数量失败', error)
    }
  }
}

const goMessages = () => {
  router.push('/messages')
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    userStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  loadUnreadCount()
  loadReminderCount()
})
watch(() => route.path, () => {
  loadUnreadCount()
  loadReminderCount()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.layout-header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  position: relative;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo-icon {
  font-size: 28px;
  margin-right: 12px;
}

.system-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d4e89;
  letter-spacing: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.msg-badge {
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
  padding: 0 8px;
}

.username {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.layout-aside {
  background: #001529;
  overflow: hidden;
}

.layout-aside :deep(.el-menu) {
  border-right: none;
}

.layout-main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.inline-badge {
  display: inline-flex;
  align-items: center;
}
</style>
