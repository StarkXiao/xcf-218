import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { login } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  const initUser = () => {
    const saved = localStorage.getItem('gov_user')
    if (saved) {
      user.value = JSON.parse(saved)
    }
  }

  const doLogin = async (username: string, password: string) => {
    const result = await login(username, password)
    user.value = result
    localStorage.setItem('gov_user', JSON.stringify(result))
    return result
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('gov_user')
  }

  return { user, isLoggedIn, isAdmin, initUser, doLogin, logout }
})
