<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="application">
      <div class="detail-header">
        <div>
          <h2 class="detail-title">代办人申请详情</h2>
          <p class="detail-subtitle">
            申请编号：{{ application.applicationNo }}
            <el-tag :type="getStatusType(application.status)" style="margin-left: 12px">
              {{ getStatusText(application.status) }}
            </el-tag>
            <el-tag v-if="application.riskLevel > 0" :type="getRiskTagType(application.riskLevel)" style="margin-left: 8px">
              风险等级：{{ application.riskLevel }} 级
            </el-tag>
          </p>
        </div>
        <p class="apply-time">提交时间：{{ formatDate(application.createdAt) }}</p>
      </div>

      <el-divider />

      <el-row :gutter="20">
        <el-col :span="14">
          <div class="content-section">
            <h3 class="section-title">委托人信息</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ application.principal?.name }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ maskIdCard(application.principal?.idCard || '') }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ application.principal?.phone }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="content-section">
            <h3 class="section-title">代办人信息</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ application.proxyName }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ maskIdCard(application.proxyIdCard) }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ application.proxyPhone }}</el-descriptions-item>
              <el-descriptions-item label="与委托人关系">{{ application.proxyRelation || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="content-section">
            <h3 class="section-title">授权信息</h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="授权范围">{{ application.authorizationScope }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="content-section">
            <h3 class="section-title">身份证明材料</h3>
            <el-table :data="materialList" style="width: 100%">
              <el-table-column prop="name" label="材料名称" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.exists ? 'success' : 'danger'">
                    {{ row.exists ? '已上传' : '未上传' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button v-if="row.exists" type="primary" link @click="viewMaterial(row)">
                    查看
                  </el-button>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="application.riskTips && application.riskTips.length > 0" class="content-section">
            <h3 class="section-title">风险提示</h3>
            <el-alert
              :title="`风险等级：${application.riskLevel} 级`"
              type="warning"
              :closable="false"
              show-icon
            >
              <ul class="risk-tip-list">
                <li v-for="(tip, index) in application.riskTips" :key="index">
                  <el-icon color="#e6a23c"><WarningFilled /></el-icon>
                  {{ tip }}
                </li>
              </ul>
            </el-alert>
          </div>

          <div v-if="isAdmin && canReview" class="content-section">
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
              </el-form-item>
            </el-form>
          </div>

          <div v-if="application.reviewComment" class="content-section">
            <h3 class="section-title">审核意见</h3>
            <el-alert
              :title="application.reviewComment"
              :type="application.status === 'rejected' ? 'error' : 'success'"
              show-icon
            />
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
                :type="index === 0 ? 'primary' : getTimelineType(record.status)"
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

    <el-dialog v-model="previewVisible" title="材料预览" width="80%" :close-on-click-modal="false">
      <div v-if="currentMaterial" class="preview-container">
        <img v-if="isImage(currentMaterial.path)" :src="previewUrl" alt="预览" class="preview-image" />
        <div v-else class="no-preview">
          <el-icon :size="48"><Document /></el-icon>
          <p>该文件类型不支持在线预览，请下载后查看</p>
          <el-button type="primary" style="margin-top: 16px" @click="downloadMaterial">
            下载文件
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, CircleCheck, CircleClose, Document, WarningFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getProxyApplicationById, reviewProxyApplication } from '@/api/proxy'
import type { ProxyApplication } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const application = ref<ProxyApplication | null>(null)
const previewVisible = ref(false)
const currentMaterial = ref<any>(null)
const previewUrl = ref('')

const reviewForm = reactive({
  comment: '',
})

const isAdmin = computed(() => userStore.user?.role === 'admin')

const canReview = computed(() => {
  return application.value && ['submitted', 'reviewing'].includes(application.value.status)
})

const materialList = computed(() => {
  if (!application.value) return []
  return [
    { name: '代办人身份证正面', path: application.value.idCardFrontPath, exists: !!application.value.idCardFrontPath },
    { name: '代办人身份证背面', path: application.value.idCardBackPath, exists: !!application.value.idCardBackPath },
    { name: '授权委托书', path: application.value.authorizationLetterPath, exists: !!application.value.authorizationLetterPath },
  ]
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
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
  }
  return map[status] || status
}

const getRiskTagType = (level: number) => {
  if (level >= 4) return 'danger'
  if (level >= 2) return 'warning'
  return 'success'
}

const getTimelineType = (status: string) => {
  if (status === 'failed') return 'danger'
  if (status === 'warning') return 'warning'
  if (status === 'processing') return 'primary'
  return 'success'
}

const maskIdCard = (idCard: string) => {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.slice(0, 4) + '********' + idCard.slice(-4)
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const isImage = (path: string) => {
  if (!path) return false
  return /\.(jpg|jpeg|png|gif)$/i.test(path)
}

const loadData = async () => {
  loading.value = true
  try {
    application.value = await getProxyApplicationById(Number(route.params.id))
  } finally {
    loading.value = false
  }
}

const actionText: Record<string, string> = {
  reviewing: '开始审核',
  approve: '审核通过',
  reject: '驳回申请',
}

const doReview = async (action: 'approve' | 'reject' | 'reviewing') => {
  if (!userStore.user) return

  await ElMessageBox.confirm(
    `确定要执行"${actionText[action]}"操作吗？`,
    '确认操作',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    await reviewProxyApplication(
      Number(route.params.id),
      action,
      reviewForm.comment || `${actionText[action]}操作`,
      userStore.user.id
    )
    ElMessage.success('操作成功')
    reviewForm.comment = ''
    await loadData()
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

const viewMaterial = (material: any) => {
  currentMaterial.value = material
  previewUrl.value = `/api/upload/proxy/${material.path}`
  previewVisible.value = true
}

const downloadMaterial = () => {
  if (currentMaterial.value) {
    window.open(`/api/upload/proxy/${currentMaterial.value.path}`, '_blank')
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
.risk-tip-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.risk-tip-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e6a23c;
  margin-bottom: 4px;
}
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  background: #f5f7fa;
  border-radius: 4px;
}
.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
}
.no-preview {
  text-align: center;
  color: #909399;
}
.no-preview p {
  margin-top: 12px;
}
</style>
