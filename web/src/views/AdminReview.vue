<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="application">
      <div class="detail-header">
        <div>
          <h2 class="detail-title">{{ application.serviceItem?.name }}</h2>
          <p class="detail-subtitle">
            申请编号：{{ application.applicationNo }}
            <el-tag :type="getStatusType(application.status)" style="margin-left: 12px">
              {{ getStatusText(application.status) }}
            </el-tag>
          </p>
        </div>
        <p class="apply-time">提交时间：{{ formatDate(application.createdAt) }}</p>
      </div>

      <el-divider />

      <el-row :gutter="20">
        <el-col :span="14">
          <div class="content-section">
            <h3 class="section-title">申请人信息</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ application.user?.name }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ application.formData.idCard }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ application.formData.phone }}</el-descriptions-item>
              <el-descriptions-item label="联系地址">{{ application.formData.address }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="content-section">
            <h3 class="section-title">申请信息</h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="申请事由">{{ application.formData.reason }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="content-section">
            <h3 class="section-title">提交材料</h3>
            <el-table :data="application.materials" style="width: 100%">
              <el-table-column type="index" label="序号" width="80" />
              <el-table-column prop="name" label="材料名称" />
              <el-table-column label="是否必需" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'">
                    {{ row.required ? '必需' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="上传状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.uploaded ? 'success' : 'warning'">
                    {{ row.uploaded ? '已上传' : '未上传' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="文件名">
                <template #default="{ row }">
                  <span v-if="row.fileName">{{ row.fileName }}</span>
                  <span v-else style="color: #c0c4cc">-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="canReview" class="content-section">
            <h3 class="section-title">审核操作</h3>
            <el-form :model="reviewForm" label-width="100px">
              <el-form-item label="审核意见">
                <el-input
                  v-model="reviewForm.comment"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入审核意见（选填）"
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="warning"
                  :loading="submitting"
                  @click="doReview('reviewing')"
                  :disabled="application.status === 'reviewing'"
                >
                  开始审核
                </el-button>
                <el-button type="success" :loading="submitting" @click="doReview('approve')">
                  <el-icon><CircleCheck /></el-icon> 审核通过
                </el-button>
                <el-button type="danger" :loading="submitting" @click="doReview('reject')">
                  <el-icon><CircleClose /></el-icon> 驳回申请
                </el-button>
                <el-button type="primary" :loading="submitting" @click="doReview('complete')">
                  <el-icon><Finished /></el-icon> 办理完成
                </el-button>
              </el-form-item>
            </el-form>
          </div>

          <div v-if="application.reviewComment" class="content-section">
            <h3 class="section-title">审核意见记录</h3>
            <el-alert :title="application.reviewComment" :type="application.status === 'rejected' ? 'error' : 'success'" show-icon />
          </div>
        </el-col>

        <el-col :span="10">
          <div class="content-section">
            <h3 class="section-title">办理进度</h3>
            <el-timeline>
              <el-timeline-item
                v-for="(record, index) in sortedRecords"
                :key="record.id"
                :timestamp="formatDate(record.createdAt)"
                placement="top"
                :type="index === 0 ? 'primary' : (record.status === 'failed' ? 'danger' : 'success')"
                :hollow="index === 0"
              >
                <div class="timeline-content">
                  <h4>{{ record.step }}</h4>
                  <p v-if="record.remark">{{ record.remark }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getApplicationById } from '@/api/application'
import { reviewApplication } from '@/api/admin'
import type { Application } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const application = ref<Application | null>(null)

const reviewForm = reactive({
  comment: '',
})

const canReview = computed(() => {
  return application.value && ['submitted', 'reviewing', 'approved'].includes(application.value.status)
})

const sortedRecords = computed(() => {
  if (!application.value?.progressRecords) return []
  return [...application.value.progressRecords].reverse()
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
  }
  return map[status] || status
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadData = async () => {
  loading.value = true
  try {
    application.value = await getApplicationById(Number(route.params.id))
  } finally {
    loading.value = false
  }
}

const actionText: Record<string, string> = {
  reviewing: '开始审核',
  approve: '审核通过',
  reject: '驳回申请',
  complete: '办理完成',
}

const doReview = async (action: 'approve' | 'reject' | 'reviewing' | 'complete') => {
  if (!userStore.user) return

  await ElMessageBox.confirm(
    `确定要执行"${actionText[action]}"操作吗？`,
    '确认操作',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    await reviewApplication(
      Number(route.params.id),
      action,
      reviewForm.comment || `${actionText[action]}操作`,
      userStore.user.id
    )
    ElMessage.success('操作成功')
    await loadData()
  } catch (e) {
    // 取消确认时不做处理
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.detail-subtitle {
  font-size: 14px;
  color: #606266;
}
.apply-time {
  font-size: 13px;
  color: #909399;
}
.timeline-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.timeline-content p {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
</style>
