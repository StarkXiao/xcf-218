<template>
  <div class="my-subscriptions">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的订阅</span>
          <el-tag type="info" effect="plain">共 {{ subscriptions.length }} 项</el-tag>
        </div>
      </template>

      <el-table :data="subscriptions" style="width: 100%" v-loading="loading" empty-text="暂无订阅">
        <el-table-column prop="serviceItem.name" label="事项名称" />
        <el-table-column prop="serviceItem.category" label="分类" width="120" />
        <el-table-column label="通知设置" width="200">
          <template #default="{ row }">
            <el-tag size="small" :type="row.notifyOnUpdate ? 'success' : 'info'">
              {{ row.notifyOnUpdate ? '内容更新' : '不通知' }}
            </el-tag>
            <el-tag size="small" style="margin-left: 4px" :type="row.notifyOnStatusChange ? 'success' : 'info'">
              {{ row.notifyOnStatusChange ? '状态变更' : '不通知' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="收藏状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.favorited ? 'danger' : 'info'" size="small">
              {{ row.favorited ? '已收藏' : '未收藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订阅时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="360">
          <template #default="{ row }">
            <el-button type="primary" link @click="goDetail(row.serviceItemId)">查看详情</el-button>
            <el-button type="primary" link @click="handleSettings(row)">通知设置</el-button>
            <el-button
              :type="row.favorited ? 'warning' : 'danger'"
              link
              @click="handleToggleFavorite(row)"
            >
              {{ row.favorited ? '取消收藏' : '加入收藏' }}
            </el-button>
            <el-button type="danger" link @click="handleCancelSubscription(row)">取消订阅</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && subscriptions.length === 0" description="还没有订阅任何事项，订阅后可及时获取事项更新通知">
        <el-button type="primary" @click="$router.push('/services')">去浏览事项</el-button>
      </el-empty>
    </el-card>

    <el-dialog v-model="settingsVisible" title="通知设置" width="400px">
      <el-form label-width="120px">
        <el-form-item label="内容更新通知">
          <el-switch v-model="currentSettings.notifyOnUpdate" active-text="开启" inactive-text="关闭" />
        </el-form-item>
        <el-form-item label="状态变更通知">
          <el-switch v-model="currentSettings.notifyOnStatusChange" active-text="开启" inactive-text="关闭" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getSubscriptions, toggleSubscription } from '@/api/subscription'
import { checkFavorite, toggleFavorite } from '@/api/favorite'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import type { Subscription } from '@/types'

type SubWithFav = Subscription & { favorited?: boolean }

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const subscriptions = ref<SubWithFav[]>([])
const settingsVisible = ref(false)
const currentSettings = reactive({
  id: 0,
  notifyOnUpdate: true,
  notifyOnStatusChange: true,
})

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const goDetail = (id: number) => {
  router.push(`/services/${id}`)
}

const handleSettings = (row: SubWithFav) => {
  currentSettings.id = row.serviceItemId
  currentSettings.notifyOnUpdate = row.notifyOnUpdate
  currentSettings.notifyOnStatusChange = row.notifyOnStatusChange
  settingsVisible.value = true
}

const saveSettings = async () => {
  if (!userStore.user) return
  try {
    await toggleSubscription(
      userStore.user.id,
      currentSettings.id,
      currentSettings.notifyOnUpdate,
      currentSettings.notifyOnStatusChange,
    )
    ElMessage.success('设置已保存')
    settingsVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const handleCancelSubscription = async (row: SubWithFav) => {
  try {
    await ElMessageBox.confirm('确定要取消订阅该事项吗？取消后将不再接收该事项的更新通知。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    if (!userStore.user) return
    await toggleSubscription(userStore.user.id, row.serviceItemId)
    ElMessage.success('已取消订阅')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleToggleFavorite = async (row: SubWithFav) => {
  if (!userStore.user) return
  try {
    const res = await toggleFavorite(userStore.user.id, row.serviceItemId)
    row.favorited = res.favorited
    ElMessage.success(res.favorited ? '已加入收藏' : '已取消收藏')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const loadData = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    const data = await getSubscriptions(userStore.user.id)
    const items = await Promise.all(
      data.map(async (sub) => {
        const fav = await checkFavorite(userStore.user!.id, sub.serviceItemId)
        return { ...sub, favorited: fav.favorited }
      })
    )
    subscriptions.value = items
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
.my-subscriptions {
  padding: 20px;
}
</style>
