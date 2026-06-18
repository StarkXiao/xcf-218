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
          <el-menu-item index="/supplement-center">
            <el-icon><Refresh /></el-icon>
            <span>补件中心</span>
          </el-menu-item>
          <el-menu-item index="/messages">
            <el-icon><Bell /></el-icon>
            <span>消息中心</span>
          </el-menu-item>
          <el-menu-item v-if="userStore.isAdmin" index="/admin">
            <el-icon><Setting /></el-icon>
            <span>管理后台</span>
          </el-menu-item>
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

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)

const activeMenu = computed(() => {
  if (route.path.startsWith('/services')) return '/services'
  if (route.path.startsWith('/book')) return '/services'
  if (route.path.startsWith('/apply')) return '/services'
  if (route.path.startsWith('/applications')) return '/my-applications'
  if (route.path.startsWith('/admin/schedule')) return '/admin'
  if (route.path.startsWith('/admin/appointments')) return '/admin'
  if (route.path.startsWith('/admin/supplement')) return '/admin'
  if (route.path.startsWith('/admin')) return '/admin'
  if (route.path.startsWith('/supplement-center')) return '/supplement-center'
  return route.path
})

const loadUnreadCount = async () => {
  if (userStore.user?.id) {
    unreadCount.value = await getUnreadCount(userStore.user.id)
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

onMounted(loadUnreadCount)
watch(() => route.path, loadUnreadCount)
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
</style>
