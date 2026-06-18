<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="detail">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ detail.title }}</h2>
          <div class="page-subtitle">
            <span>编号：{{ detail.jointApplicationNo }}</span>
            <el-tag :type="statusTypeMap[detail.status]" style="margin-left: 12px">
              {{ statusTextMap[detail.status] }}
            </el-tag>
          </div>
        </div>
        <div class="header-stats">
          <el-statistic title="事项总数" :value="detail.totalItems" />
          <el-statistic title="已通过" :value="detail.approvedItems">
            <template #suffix><span style="color: #67c23a; font-size: 14px">项</span></template>
          </el-statistic>
          <el-statistic title="审核中" :value="detail.processingItems">
            <template #suffix><span style="color: #e6a23c; font-size: 14px">项</span></template>
          </el-statistic>
          <el-statistic title="已驳回" :value="detail.rejectedItems">
            <template #suffix><span style="color: #f56c6c; font-size: 14px">项</span></template>
          </el-statistic>
        </div>
      </div>

      <el-descriptions :column="2" border style="margin-bottom: 24px">
        <el-descriptions-item label="申请人">
          {{ detail.user?.name || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ detail.user?.phone || detail.formData?.phone || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ detail.user?.idCard || detail.formData?.idCard || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ formatDate(detail.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审批汇总" :span="2">
          {{ detail.summary || '审批进行中...' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="事项审批进度" name="items">
          <el-table :data="detail.subApplications" border>
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column label="事项名称" min-width="200">
              <template #default="{ row }">
                {{ row.serviceItem?.name || '-' }}
                <el-tag v-if="row.serviceItem?.category" size="small" style="margin-left: 8px">
                  {{ row.serviceItem.category }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="拆单状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.splitStatus === 'completed' ? 'success' : 'warning'" size="small">
                  {{ row.splitStatus === 'completed' ? '已拆单' : '拆单中' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="申请编号" width="200">
              <template #default="{ row }">
                <el-button
                  v-if="row.applicationId"
                  type="primary"
                  link
                  @click="goApplication(row.applicationId)"
                >
                  {{ row.application?.applicationNo }}
                </el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="审批状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="subStatusTypeMap[row.status] || 'info'">
                  {{ subStatusTextMap[row.status] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="完成时间" width="180">
              <template #default="{ row }">
                {{ row.completedAt ? formatDate(row.completedAt) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="审批意见">
              <template #default="{ row }">
                <span :title="row.reviewComment || ''">
                  {{ row.reviewComment || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.applicationId"
                  type="primary"
                  link
                  @click="goApplication(row.applicationId)"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="材料复用情况" name="materials">
          <div v-if="materialStats" class="material-overview">
            <el-card class="overview-card">
              <el-statistic title="上传材料总数" :value="materialStats.totalMaterials" />
            </el-card>
            <el-card class="overview-card">
              <el-statistic title="共享材料数" :value="materialStats.sharedMaterials">
                <template #suffix>
                  <span style="color: #67c23a; font-size: 14px">份</span>
                </template>
              </el-statistic>
            </el-card>
            <el-card class="overview-card">
              <el-statistic title="复用次数" :value="materialStats.totalReusedTimes">
                <template #suffix>
                  <span style="color: #409eff; font-size: 14px">次</span>
                </template>
              </el-statistic>
            </el-card>
            <el-card class="overview-card highlight">
              <el-statistic title="节省上传" :value="materialStats.savedUploads">
                <template #suffix>
                  <span style="color: #67c23a; font-size: 14px">次</span>
                </template>
              </el-statistic>
            </el-card>
          </div>

          <el-table
            v-if="materialStats?.details"
            :data="materialStats.details"
            border
            style="margin-top: 16px"
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="materialName" label="材料名称" min-width="180" />
            <el-table-column label="是否共享" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isShared" type="success" size="small">是</el-tag>
                <el-tag v-else size="small">否</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="复用次数" width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.reuseCount > 0" type="success" size="small">
                  {{ row.reuseCount }} 次
                </el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="适用事项">
              <template #default="{ row }">
                <el-tag
                  v-for="id in row.usedByServiceItemIds"
                  :key="id"
                  size="small"
                  style="margin-right: 4px"
                >
                  {{ getItemName(id) }}
                </el-tag>
                <span v-if="!row.usedByServiceItemIds?.length">-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  getJointApplicationById,
  getJointMaterialStats,
  getAvailableJointItems,
} from '@/api/joint-application'
import type { JointApplication, JointMaterialStats, ServiceItem } from '@/types'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<JointApplication | null>(null)
const materialStats = ref<JointMaterialStats | null>(null)
const activeTab = ref('items')
const serviceItems = ref<ServiceItem[]>([])

const statusTextMap: Record<string, string> = {
  submitted: '已提交',
  processing: '处理中',
  approved: '全部通过',
  rejected: '全部驳回',
  completed: '已完成',
}

const statusTypeMap: Record<string, string> = {
  submitted: 'info',
  processing: 'warning',
  approved: 'success',
  rejected: 'danger',
  completed: 'success',
}

const subStatusTextMap: Record<string, string> = {
  pending: '待处理',
  submitted: '已提交',
  reviewing: '审核中',
  supplementing: '待补件',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
}

const subStatusTypeMap: Record<string, string> = {
  pending: 'info',
  submitted: 'primary',
  reviewing: 'warning',
  supplementing: 'warning',
  approved: 'success',
  rejected: 'danger',
  completed: 'success',
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getItemName = (id: number) => {
  return serviceItems.value.find(i => i.id === id)?.name || `事项${id}`
}

const goApplication = (id: number) => {
  router.push(`/applications/${id}`)
}

const loadDetail = async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    const [detailData, statsData, itemsData] = await Promise.all([
      getJointApplicationById(id),
      getJointMaterialStats(id),
      getAvailableJointItems().catch(() => []),
    ])
    detail.value = detailData
    materialStats.value = statsData
    serviceItems.value = itemsData
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}
.page-title {
  margin: 0 0 8px;
  font-size: 20px;
}
.page-subtitle {
  display: flex;
  align-items: center;
  color: #606266;
  font-size: 14px;
}
.header-stats {
  display: flex;
  gap: 32px;
}
.material-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.overview-card {
  text-align: center;
}
.overview-card.highlight {
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
}
</style>
