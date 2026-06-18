<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">代办关系管理</h2>
    </div>

    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="我的代办人" name="proxy">
          <el-table :data="proxyRelations" v-loading="loading" style="width: 100%">
            <el-table-column label="代办人姓名" width="140">
              <template #default="{ row }">{{ row.proxy?.name }}</template>
            </el-table-column>
            <el-table-column label="身份证号" width="220">
              <template #default="{ row }">{{ maskIdCard(row.proxy?.idCard || '') }}</template>
            </el-table-column>
            <el-table-column label="联系电话" width="140">
              <template #default="{ row }">{{ row.proxy?.phone }}</template>
            </el-table-column>
            <el-table-column prop="proxyRelation" label="关系" width="120" />
            <el-table-column prop="authorizationScope" label="授权范围" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? '生效中' : '已解除' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="绑定时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.isActive"
                  type="danger"
                  link
                  @click="deactivateRelation(row)"
                >
                  解除关系
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loading && proxyRelations.length === 0" description="暂无代办人" />
        </el-tab-pane>

        <el-tab-pane label="我代办的委托人" name="principal">
          <el-table :data="principalRelations" v-loading="loading" style="width: 100%">
            <el-table-column label="委托人姓名" width="140">
              <template #default="{ row }">{{ row.principal?.name }}</template>
            </el-table-column>
            <el-table-column label="身份证号" width="220">
              <template #default="{ row }">{{ maskIdCard(row.principal?.idCard || '') }}</template>
            </el-table-column>
            <el-table-column label="联系电话" width="140">
              <template #default="{ row }">{{ row.principal?.phone }}</template>
            </el-table-column>
            <el-table-column prop="proxyRelation" label="关系" width="120" />
            <el-table-column prop="authorizationScope" label="授权范围" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? '生效中' : '已解除' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="绑定时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>

          <el-empty v-if="!loading && principalRelations.length === 0" description="暂无委托人" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getProxyRelations, getMyPrincipals, deactivateProxyRelation } from '@/api/proxy'
import type { ProxyRelation } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const activeTab = ref('proxy')
const proxyRelations = ref<ProxyRelation[]>([])
const principalRelations = ref<ProxyRelation[]>([])

const maskIdCard = (idCard: string) => {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.slice(0, 4) + '********' + idCard.slice(-4)
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadProxyRelations = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    proxyRelations.value = await getProxyRelations(userStore.user.id)
  } finally {
    loading.value = false
  }
}

const loadPrincipalRelations = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    principalRelations.value = await getMyPrincipals(userStore.user.id)
  } finally {
    loading.value = false
  }
}

const deactivateRelation = async (row: ProxyRelation) => {
  if (!userStore.user) return

  await ElMessageBox.confirm(
    `确定要解除与代办人【${row.proxy?.name}】的代理关系吗？解除后代办人将无法再为您代办业务。`,
    '确认解除',
    { type: 'warning', confirmButtonText: '确认解除', cancelButtonText: '取消' }
  )

  try {
    await deactivateProxyRelation(row.id, userStore.user.id)
    ElMessage.success('代理关系已解除')
    loadProxyRelations()
  } catch (e) {
  }
}

onMounted(() => {
  loadProxyRelations()
  loadPrincipalRelations()
})
</script>

<style scoped>
</style>
