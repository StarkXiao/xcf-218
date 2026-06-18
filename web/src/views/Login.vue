<template>
  <div class="login-container">
    <div class="login-header">
      <h1>政务办事大厅</h1>
      <p>Government Service Hall</p>
    </div>
    <el-card class="login-card" shadow="hover">
      <h2 class="login-title">用户登录</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-width="80px"
        @keyup.enter="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-tips">
        <p>普通用户：user / user123</p>
        <p>管理员：admin / admin123</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.doLogin(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    if (userStore.isAdmin) {
      router.push('/admin')
    } else {
      router.push('/home')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d4e89 0%, #2c7da0 100%);
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  color: #fff;
}

.login-header h1 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: 4px;
}

.login-header p {
  font-size: 14px;
  opacity: 0.8;
  letter-spacing: 2px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 20px;
}

.login-title {
  text-align: center;
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #303133;
}

.login-btn {
  width: 100%;
  height: 42px;
  font-size: 16px;
}

.login-tips {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #909399;
  line-height: 1.8;
}
</style>
