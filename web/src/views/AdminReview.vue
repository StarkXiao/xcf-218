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
            <el-table :data="application.materialFiles" style="width: 100%" v-if="application.materialFiles.length > 0">
              <el-table-column type="index" label="序号" width="80" />
              <el-table-column prop="materialName" label="材料名称" />
              <el-table-column prop="originalName" label="文件名" />
              <el-table-column label="版本" width="80">
                <template #default="{ row }">V{{ row.version }}</template>
              </el-table-column>
              <el-table-column label="文件大小" width="120">
                <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
              </el-table-column>
              <el-table-column label="是否必需" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'">
                    {{ row.required ? '必需' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
                  <el-tag v-else type="success">正常</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                  <el-button
                    v-if="row.mimeType.startsWith('image/')"
                    type="primary"
                    link
                    @click="previewImage(row)"
                  >
                    预览
                  </el-button>
                  <el-button
                    v-else-if="row.mimeType === 'application/pdf'"
                    type="primary"
                    link
                    @click="previewPdf(row)"
                  >
                    预览
                  </el-button>
                  <el-button type="primary" link @click="downloadFile(row)">
                    下载
                  </el-button>
                  <el-button type="primary" link @click="viewVersions(row)">
                    历史版本
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无上传的材料文件" />
          </div>

          <div v-if="canReview" class="content-section">
            <h3 class="section-title">办理阶段</h3>
            <el-steps :active="currentStage" finish-status="success" align-center style="margin-bottom: 24px">
              <el-step title="受理" :description="stageDescriptions.accept">
                <template #icon><el-icon><Reading /></el-icon></template>
              </el-step>
              <el-step title="审核" :description="stageDescriptions.review">
                <template #icon><el-icon><DocumentChecked /></el-icon></template>
              </el-step>
              <el-step title="办结" :description="stageDescriptions.complete">
                <template #icon><el-icon><Finished /></el-icon></template>
              </el-step>
            </el-steps>
          </div>

          <div v-if="canReview" class="content-section">
            <h3 class="section-title">审核操作</h3>
            <el-alert
              v-if="currentApproverId"
              :title="`当前待办人：${currentApproverName}`"
              :type="isCurrentApprover ? 'success' : 'warning'"
              show-icon
              style="margin-bottom: 16px"
              :description="isCurrentApprover ? '您是当前审批待办人，可进行审批操作' : '您不是当前审批待办人，无法进行审批操作'"
            />
            <el-form :model="reviewForm" label-width="100px">
              <el-form-item label="审核意见">
                <el-input
                  v-model="reviewForm.comment"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入审核意见（选填）"
                  :disabled="!isCurrentApprover"
                />
              </el-form-item>

              <el-form-item v-if="showAcceptAction" label="受理阶段">
                <el-button
                  type="primary"
                  :loading="submitting"
                  @click="doReview('accept')"
                  :disabled="!isCurrentApprover"
                >
                  <el-icon><Reading /></el-icon> 受理申请
                </el-button>
                <span class="action-tip">确认材料齐全，正式受理申请</span>
              </el-form-item>

              <el-form-item v-if="showReviewActions" label="审核阶段">
                <el-button
                  type="warning"
                  :loading="submitting"
                  @click="doReview('reviewing')"
                  :disabled="application.status === 'reviewing' || !isCurrentApprover"
                >
                  开始审核
                </el-button>
                <el-button type="success" :loading="submitting" @click="doReview('approve')" :disabled="!isCurrentApprover">
                  <el-icon><CircleCheck /></el-icon> 审核通过
                </el-button>
                <el-button type="danger" :loading="submitting" @click="doReview('reject')" :disabled="!isCurrentApprover">
                  <el-icon><CircleClose /></el-icon> 驳回申请
                </el-button>
                <el-button type="warning" :loading="submitting" @click="openRejectDialog" :disabled="!isCurrentApprover">
                  <el-icon><Refresh /></el-icon> 退回材料
                </el-button>
              </el-form-item>

              <el-form-item v-if="showCompleteAction" label="办结阶段">
                <el-button type="primary" :loading="submitting" @click="doReview('complete')" :disabled="!isCurrentApprover">
                  <el-icon><Finished /></el-icon> 办理完成
                </el-button>
                <span class="action-tip">审核通过后，完成办理并出证</span>
              </el-form-item>
            </el-form>
          </div>

          <div v-if="application.reviewComment" class="content-section">
            <h3 class="section-title">审核意见记录</h3>
            <el-alert
              :title="application.reviewComment"
              :type="application.status === 'rejected' || application.status === 'supplementing' ? 'error' : 'success'"
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
                :type="index === 0 ? 'primary' : (record.status === 'failed' || record.status === 'pending' ? 'danger' : 'success')"
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
      <div v-if="previewFile" class="preview-container">
        <img v-if="previewFile.mimeType.startsWith('image/')" :src="previewUrl" alt="预览" class="preview-image" />
        <iframe
          v-else-if="previewFile.mimeType === 'application/pdf'"
          :src="previewUrl"
          class="preview-pdf"
        ></iframe>
        <div v-else class="no-preview">
          <el-icon :size="48"><Document /></el-icon>
          <p>该文件类型不支持在线预览，请下载后查看</p>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="versionVisible" title="版本历史" width="800px" destroy-on-close>
      <div>
        <h4 style="margin-bottom: 12px">{{ currentMaterialName }} - 历史版本</h4>
        <el-table :data="versionList" style="width: 100%">
          <el-table-column prop="version" label="版本号" width="100" />
          <el-table-column prop="originalName" label="文件名" />
          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
              <el-tag v-else-if="row.isCurrent" type="success">当前版本</el-tag>
              <el-tag v-else type="info">历史版本</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="退回原因" show-overflow-tooltip>
            <template #default="{ row }">{{ row.rejectReason || '-' }}</template>
          </el-table-column>
          <el-table-column label="上传时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button type="primary" link @click="previewFile(row)">预览</el-button>
              <el-button type="primary" link @click="downloadFile(row)">下载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="退回材料" width="700px" destroy-on-close>
      <el-form :model="rejectForm" label-width="100px">
        <el-form-item label="退回说明" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="2"
            placeholder="请输入整体退回说明"
          />
        </el-form-item>
        <el-form-item label="选择材料" required>
          <div class="reject-material-list">
            <el-checkbox
              v-for="file in reviewableFiles"
              :key="file.fieldName"
              v-model="rejectForm.selectedMap[file.fieldName]"
              :label="file.fieldName"
            >
              <span style="font-weight: 500">{{ file.materialName }}</span>
              <span style="color: #909399; margin-left: 8px">（当前版本：V{{ file.version }}）</span>
            </el-checkbox>
            <div v-for="file in reviewableFiles" :key="'detail-' + file.fieldName" v-if="rejectForm.selectedMap[file.fieldName]" class="reject-reason-item">
              <el-input
                v-model="rejectForm.reasonMap[file.fieldName]"
                type="textarea"
                :rows="1"
                :placeholder="`请输入【${file.materialName}】的具体退回原因`"
                size="small"
                style="margin-top: 8px; margin-left: 28px; width: calc(100% - 28px)"
              />
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitRejectMaterials">
          确认退回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, CircleCheck, CircleClose, Finished, Refresh, Document, Reading, DocumentChecked } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getApplicationById, downloadMaterial, previewMaterial } from '@/api/application'
import { reviewApplication } from '@/api/admin'
import { approvalApi } from '@/api/approval'
import { getMaterialVersions, rejectMaterials } from '@/api/supplement-center'
import type { Application, MaterialFile, ApprovalRecord } from '@/types'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const application = ref<Application | null>(null)
const previewVisible = ref(false)
const previewFile = ref<MaterialFile | null>(null)
const previewUrl = ref('')

const versionVisible = ref(false)
const versionList = ref<MaterialFile[]>([])
const currentMaterialName = ref('')

const rejectVisible = ref(false)
const rejectForm = reactive({
  reason: '',
  selectedMap: {} as Record<string, boolean>,
  reasonMap: {} as Record<string, string>,
})

const reviewForm = reactive({
  comment: '',
})

const approvalRecords = ref<ApprovalRecord[]>([])
const currentApproverId = computed(() => {
  const pending = approvalRecords.value.find(r => r.status === 'pending')
  return pending?.approverId
})

const currentApproverName = computed(() => {
  const pending = approvalRecords.value.find(r => r.status === 'pending')
  return pending?.approver?.name || '未指派'
})

const isCurrentApprover = computed(() => {
  if (!userStore.user) return false
  if (!currentApproverId.value) {
    return canReview.value
  }
  return userStore.user.id === currentApproverId.value
})

const canReview = computed(() => {
  return application.value && ['submitted', 'accepted', 'reviewing', 'approved', 'supplementing'].includes(application.value.status)
})

const reviewableFiles = computed(() => {
  if (!application.value) return []
  return application.value.materialFiles.filter(f => f.isCurrent)
})

const sortedRecords = computed(() => {
  if (!application.value?.progressRecords) return []
  return [...application.value.progressRecords].reverse()
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    accepted: 'info',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    supplementing: 'warning',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '待审核',
    accepted: '已受理',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
    supplementing: '待补件',
  }
  return map[status] || status
}

const currentStage = computed(() => {
  if (!application.value) return 0
  const status = application.value.status
  if (status === 'submitted') return 0
  if (status === 'accepted') return 1
  if (['reviewing', 'supplementing'].includes(status)) return 1
  if (['approved'].includes(status)) return 2
  if (status === 'completed') return 3
  if (status === 'rejected') return 1
  return 0
})

const stageDescriptions = computed(() => {
  if (!application.value) return { accept: '', review: '', complete: '' }
  const status = application.value.status
  return {
    accept: status === 'submitted' ? '待受理' : (status === 'accepted' || status !== 'submitted' ? '已受理' : ''),
    review: ['reviewing', 'supplementing'].includes(status) ? '审核中' : (['approved', 'completed'].includes(status) ? '已审核' : '待审核'),
    complete: status === 'completed' ? '已办结' : '待办结',
  }
})

const showAcceptAction = computed(() => {
  if (!application.value) return false
  return application.value.status === 'submitted'
})

const showReviewActions = computed(() => {
  if (!application.value) return false
  return ['submitted', 'accepted', 'reviewing', 'supplementing'].includes(application.value.status)
})

const showCompleteAction = computed(() => {
  if (!application.value) return false
  return ['approved'].includes(application.value.status)
})

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const loadData = async () => {
  loading.value = true
  try {
    application.value = await getApplicationById(Number(route.params.id))
    try {
      approvalRecords.value = await approvalApi.getRecordsByApplication(Number(route.params.id))
    } catch {
      approvalRecords.value = []
    }
  } finally {
    loading.value = false
  }
}

const actionText: Record<string, string> = {
  accept: '受理申请',
  reviewing: '开始审核',
  approve: '审核通过',
  reject: '驳回申请',
  complete: '办理完成',
}

const doReview = async (action: 'accept' | 'approve' | 'reject' | 'reviewing' | 'complete') => {
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
    reviewForm.comment = ''
    await loadData()
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

const previewImage = (file: MaterialFile) => {
  previewFile.value = file
  previewUrl.value = previewMaterial(file.id)
  previewVisible.value = true
}

const previewPdf = (file: MaterialFile) => {
  previewFile.value = file
  previewUrl.value = previewMaterial(file.id)
  previewVisible.value = true
}

const downloadFile = (file: MaterialFile) => {
  window.open(downloadMaterial(file.id), '_blank')
}

const viewVersions = async (file: MaterialFile) => {
  currentMaterialName.value = file.materialName
  versionList.value = await getMaterialVersions(file.applicationId, file.fieldName)
  versionVisible.value = true
}

const openRejectDialog = () => {
  rejectForm.reason = ''
  rejectForm.selectedMap = {}
  rejectForm.reasonMap = {}
  rejectVisible.value = true
}

const submitRejectMaterials = async () => {
  if (!userStore.user || !application.value) return

  const selectedFiles = reviewableFiles.value.filter(f => rejectForm.selectedMap[f.fieldName])
  if (selectedFiles.length === 0) {
    ElMessage.warning('请至少选择一项需要退回的材料')
    return
  }

  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入退回说明')
    return
  }

  for (const file of selectedFiles) {
    if (!rejectForm.reasonMap[file.fieldName]?.trim()) {
      ElMessage.warning(`请输入【${file.materialName}】的具体退回原因`)
      return
    }
  }

  await ElMessageBox.confirm(
    `确定要退回 ${selectedFiles.length} 项材料吗？用户将收到补件通知。`,
    '确认退回',
    { type: 'warning' }
  )

  submitting.value = true
  try {
    const rejectedMaterials = selectedFiles.map(f => ({
      fieldName: f.fieldName,
      materialName: f.materialName,
      reason: rejectForm.reasonMap[f.fieldName],
    }))

    await rejectMaterials(
      application.value.id,
      userStore.user.id,
      rejectForm.reason,
      rejectedMaterials
    )

    ElMessage.success('材料已退回，用户已收到补件通知')
    rejectVisible.value = false
    await loadData()
  } catch (e) {
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
.preview-pdf {
  width: 100%;
  height: 600px;
  border: none;
}
.no-preview {
  text-align: center;
  color: #909399;
}
.no-preview p {
  margin-top: 12px;
}
.reject-material-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}
.reject-material-list .el-checkbox {
  display: block;
  margin-bottom: 12px;
}
.action-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}
</style>
