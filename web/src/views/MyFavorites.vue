<template>
  <div class="my-favorites">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的收藏</span>
          <el-tag type="info" effect="plain">共 {{ favorites.length }} 项</el-tag>
        </div>
      </template>

      <el-table :data="favorites" style="width: 100%" v-loading="loading" empty-text="暂无收藏">
        <el-table-column prop="serviceItem.name" label="事项名称" />
        <el-table-column prop="serviceItem.category" label="分类" width="120" />
        <el-table-column label="办理时限" width="120">
          <template #default="{ row }">{{ row.serviceItem?.processingDays }} 个工作日</template>
        </el-table-column>
        <el-table-column label="订阅状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.subscribed ? 'success' : 'info'" size="small">
              {{ row.subscribed ? '已订阅' : '未订阅' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收藏时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.serviceItemId)">查看详情</el-button>
            <el-button type="primary" link @click="goApply(row.serviceItemId)">立即办理</el-button>
            <el-button
              :type="row.subscribed ? 'warning' : 'success'"
              link
              @click="handleToggleSubscription(row)"
            >
              {{ row.subscribed ? '取消订阅' : '订阅通知' }}
            </el-button>
            <el-button type="danger" link @click="handleCancelFavorite(row)">取消收藏</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && favorites.length === 0" description="还没有收藏任何事项，快去发现感兴趣的事项吧">
        <el-button type="primary" @click="$router.push('/services')">去浏览事项</el-button>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getFavorites, toggleFavorite } from '@/api/favorite'
import { checkSubscription, toggleSubscription } from '@/api/subscription'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import type { Favorite } from '@/types'

type FavoriteWithSub = Favorite & { subscribed?: boolean }

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const favorites = ref<FavoriteWithSub[]>([])

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const goDetail = (id: number) => {
  router.push(`/services/${id}`)
}

const goApply = (id: number) => {
  router.push(`/apply/${id}`)
}

const handleCancelFavorite = async (row: FavoriteWithSub) => {
  try {
    await ElMessageBox.confirm('确定要取消收藏该事项吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    if (!userStore.user) return
    await toggleFavorite(userStore.user.id, row.serviceItemId)
    ElMessage.success('已取消收藏')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleToggleSubscription = async (row: FavoriteWithSub) => {
  if (!userStore.user) return
  try {
    const res = await toggleSubscription(userStore.user.id, row.serviceItemId)
    row.subscribed = res.subscribed
    ElMessage.success(res.subscribed ? '订阅成功，将及时接收该事项的更新通知' : '已取消订阅')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const data = await getFavorites(userStore.user.id)
    const items = await Promise.all(
      data.map(async (fav) => {
        const sub = await checkSubscription(userStore.user!.id, fav.serviceItemId)
        return { ...fav, subscribed: sub.subscribed }
      })
    )
    favorites.value = items
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.my-favorites {
  padding: 20px;
}
</style>
