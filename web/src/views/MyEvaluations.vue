<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">我的评价</h2>
      <el-button type="primary" @click="showEvaluateDialog">评价办件</el-button>
    </div>

    <el-card style="margin-bottom: 20px">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="评分">
          <el-select v-model="filterForm.rating" placeholder="全部评分" clearable style="width: 120px">
            <el-option label="5星" :value="5" />
            <el-option label="4星" :value="4" />
            <el-option label="3星" :value="3" />
            <el-option label="2星" :value="2" />
            <el-option label="1星" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadEvaluations">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-loading="loading">
      <el-table :data="filteredEvaluations" style="width: 100%">
        <el-table-column label="事项名称" min-width="160">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="评分" width="180">
          <template #default="{ row }">
            <el-rate :model-value="row.rating" disabled />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in (row.tags || [])" :key="tag" size="small" style="margin: 2px">{{ tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="管理员回复" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.reply" style="color: #409eff">{{ row.reply }}</span>
            <span v-else style="color: #c0c4cc">暂无回复</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评价时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && evaluations.length === 0" description="暂无评价记录" />
    </el-card>

    <el-dialog v-model="evaluateDialogVisible" title="评价办件" width="600px" :close-on-click-modal="false">
      <el-form :model="evaluateForm" label-width="100px" :rules="evaluateRules" ref="evaluateFormRef">
        <el-form-item label="选择办件" prop="applicationId">
          <el-select v-model="evaluateForm.applicationId" placeholder="请选择已完成的办件" style="width: 100%" @change="onApplicationChange">
            <el-option
              v-for="app in completedApplications"
              :key="app.id"
              :label="`${app.applicationNo} - ${app.serviceItem?.name || ''}`"
              :value="app.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="评分" prop="rating">
          <el-rate v-model="evaluateForm.rating" :texts="['很差', '较差', '一般', '较好', '很好']" show-text />
        </el-form-item>
        <el-form-item label="标签">
          <el-checkbox-group v-model="evaluateForm.tags">
            <el-checkbox label="办事效率高" />
            <el-checkbox label="服务态度好" />
            <el-checkbox label="流程清晰" />
            <el-checkbox label="等待时间长" />
            <el-checkbox label="材料复杂" />
            <el-checkbox label="需要改进" />
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="评价内容">
          <el-input v-model="evaluateForm.content" type="textarea" :rows="4" placeholder="请输入您的评价（选填）" :maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="匿名评价">
          <el-switch v-model="evaluateForm.anonymous" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="evaluateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEvaluate" :loading="submitting">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getEvaluations, createEvaluation } from '@/api/evaluation'
import { getApplications } from '@/api/application'
import type { Evaluation, Application } from '@/types'
import dayjs from 'dayjs'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const evaluations = ref<Evaluation[]>([])
const completedApplications = ref<Application[]>([])
const evaluateDialogVisible = ref(false)
const evaluateFormRef = ref<FormInstance>()

const filterForm = reactive({ rating: null as number | null })

const evaluateForm = reactive({
  applicationId: null as number | null,
  serviceItemId: null as number | null,
  rating: 0,
  tags: [] as string[],
  content: '',
  anonymous: false,
})

const evaluateRules = {
  applicationId: [{ required: true, message: '请选择办件', trigger: 'change' }],
  rating: [{ required: true, message: '请选择评分', trigger: 'change' as const }],
}

const filteredEvaluations = computed(() => {
  if (!filterForm.rating) return evaluations.value
  return evaluations.value.filter(e => e.rating === filterForm.rating)
})

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadEvaluations = async () => {
  if (!userStore.user) return
  loading.value = true
  try {
    evaluations.value = await getEvaluations(userStore.user.id)
  } finally {
    loading.value = false
  }
}

const loadCompletedApplications = async () => {
  if (!userStore.user) return
  try {
    const apps = await getApplications(userStore.user.id, 'completed')
    completedApplications.value = apps
  } catch {}
}

const showEvaluateDialog = () => {
  loadCompletedApplications()
  evaluateForm.applicationId = null
  evaluateForm.serviceItemId = null
  evaluateForm.rating = 0
  evaluateForm.tags = []
  evaluateForm.content = ''
  evaluateForm.anonymous = false
  evaluateDialogVisible.value = true
}

const onApplicationChange = (val: number) => {
  const app = completedApplications.value.find(a => a.id === val)
  if (app) {
    evaluateForm.serviceItemId = app.serviceItemId
  }
}

const submitEvaluate = async () => {
  if (!evaluateFormRef.value) return
  await evaluateFormRef.value.validate()
  if (!userStore.user || !evaluateForm.applicationId || !evaluateForm.serviceItemId) return

  submitting.value = true
  try {
    await createEvaluation({
      userId: userStore.user.id,
      applicationId: evaluateForm.applicationId,
      serviceItemId: evaluateForm.serviceItemId,
      rating: evaluateForm.rating,
      content: evaluateForm.content || undefined,
      tags: evaluateForm.tags.length > 0 ? JSON.stringify(evaluateForm.tags) : undefined,
      anonymous: evaluateForm.anonymous,
    })
    ElMessage.success('评价提交成功')
    evaluateDialogVisible.value = false
    loadEvaluations()
  } catch {
  } finally {
    submitting.value = false
  }
}

const resetFilter = () => {
  filterForm.rating = null
}

onMounted(loadEvaluations)
</script>
