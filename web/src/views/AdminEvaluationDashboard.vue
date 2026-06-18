<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">评价统计看板</h2>
    </div>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="36" color="#409eff"><Star /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #409eff">{{ stats?.totalCount || 0 }}</span>
              <span class="stat-label">评价总数</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="36" color="#e6a23c"><TrendCharts /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #e6a23c">{{ stats?.avgRating || 0 }}</span>
              <span class="stat-label">平均评分</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="36" color="#67c23a"><CircleCheck /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #67c23a">{{ goodRatePercent }}%</span>
              <span class="stat-label">好评率(4-5星)</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card card-hover" shadow="hover">
          <div class="stat-content">
            <el-icon :size="36" color="#f56c6c"><Warning /></el-icon>
            <div class="stat-info">
              <span class="stat-value" style="color: #f56c6c">{{ badRatePercent }}%</span>
              <span class="stat-label">差评率(1-2星)</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="12">
        <el-card>
          <template #header><span style="font-weight: 600">评分分布</span></template>
          <div class="rating-dist">
            <div v-for="i in [5, 4, 3, 2, 1]" :key="i" class="rating-row">
              <span class="rating-label">{{ i }}星</span>
              <el-progress
                :percentage="ratingPercent(i)"
                :color="ratingColor(i)"
                :stroke-width="20"
                :text-inside="true"
                :format="() => `${stats?.ratingDistribution[i] || 0}条`"
              />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><span style="font-weight: 600">热门标签</span></template>
          <div class="tag-cloud" v-if="stats?.tagCount && Object.keys(stats.tagCount).length > 0">
            <el-tag
              v-for="(count, tag) in stats.tagCount"
              :key="tag"
              :size="tagSize(count)"
              :type="tagType(count)"
              style="margin: 4px"
            >
              {{ tag }} ({{ count }})
            </el-tag>
          </div>
          <el-empty v-else description="暂无标签数据" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="24">
        <el-card>
          <template #header><span style="font-weight: 600">各事项评价统计</span></template>
          <el-table :data="stats?.byServiceItem || []" style="width: 100%">
            <el-table-column prop="serviceItemName" label="事项名称" min-width="180" />
            <el-table-column prop="count" label="评价数" width="100" />
            <el-table-column prop="avgRating" label="平均评分" width="180">
              <template #default="{ row }">
                <el-rate :model-value="row.avgRating" disabled allow-half />
                <span style="margin-left: 8px; color: #e6a23c; font-weight: 600">{{ row.avgRating }}</span>
              </template>
            </el-table-column>
            <el-table-column label="评分占比" min-width="200">
              <template #default="{ row }">
                <el-progress :percentage="Math.round(row.avgRating * 20)" :color="ratingColor(Math.round(row.avgRating))" />
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!stats?.byServiceItem || stats.byServiceItem.length === 0" description="暂无数据" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: 600">评价列表</span>
          <el-select v-model="filterServiceItemId" placeholder="全部事项" clearable style="width: 200px" @change="loadData">
            <el-option
              v-for="item in stats?.byServiceItem || []"
              :key="item.serviceItemId"
              :label="item.serviceItemName"
              :value="item.serviceItemId"
            />
          </el-select>
        </div>
      </template>
      <el-table :data="evaluations" style="width: 100%" v-loading="loading">
        <el-table-column label="评价人" width="120">
          <template #default="{ row }">{{ row.anonymous ? '匿名用户' : (row.user?.name || '-') }}</template>
        </el-table-column>
        <el-table-column label="事项名称" min-width="160">
          <template #default="{ row }">{{ row.serviceItem?.name }}</template>
        </el-table-column>
        <el-table-column label="评分" width="180">
          <template #default="{ row }"><el-rate :model-value="row.rating" disabled /></template>
        </el-table-column>
        <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag v-for="tag in (row.tags || [])" :key="tag" size="small" style="margin: 2px">{{ tag }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="回复" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.reply" style="color: #409eff">{{ row.reply }}</span>
            <el-button v-else type="primary" link @click="openReplyDialog(row)">回复</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评价时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="replyDialogVisible" title="回复评价" width="500px">
      <el-form :model="replyForm" label-width="80px">
        <el-form-item label="评价内容">
          <span>{{ replyTarget?.content || '无文字评价' }}</span>
        </el-form-item>
        <el-form-item label="回复内容">
          <el-input v-model="replyForm.reply" type="textarea" :rows="4" placeholder="请输入回复内容" :maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="replying">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getEvaluationStatistics, getEvaluations, replyEvaluation } from '@/api/evaluation'
import type { Evaluation, EvaluationStatistics } from '@/types'
import { Star, TrendCharts, CircleCheck, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const userStore = useUserStore()
const loading = ref(false)
const replying = ref(false)
const stats = ref<EvaluationStatistics | null>(null)
const evaluations = ref<Evaluation[]>([])
const filterServiceItemId = ref<number | undefined>(undefined)
const replyDialogVisible = ref(false)
const replyTarget = ref<Evaluation | null>(null)
const replyForm = reactive({ reply: '' })

const goodRatePercent = computed(() => {
  if (!stats.value || stats.value.totalCount === 0) return 0
  const good = (stats.value.ratingDistribution[5] || 0) + (stats.value.ratingDistribution[4] || 0)
  return Math.round((good / stats.value.totalCount) * 100)
})

const badRatePercent = computed(() => {
  if (!stats.value || stats.value.totalCount === 0) return 0
  const bad = (stats.value.ratingDistribution[1] || 0) + (stats.value.ratingDistribution[2] || 0)
  return Math.round((bad / stats.value.totalCount) * 100)
})

const ratingPercent = (rating: number) => {
  if (!stats.value || stats.value.totalCount === 0) return 0
  return Math.round(((stats.value.ratingDistribution[rating] || 0) / stats.value.totalCount) * 100)
}

const ratingColor = (rating: number) => {
  if (rating >= 4) return '#67c23a'
  if (rating >= 3) return '#e6a23c'
  return '#f56c6c'
}

const tagSize = (count: number) => {
  if (count >= 10) return 'large'
  if (count >= 5) return 'default'
  return 'small'
}

const tagType = (count: number) => {
  if (count >= 10) return 'danger'
  if (count >= 5) return 'warning'
  return 'info'
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const loadData = async () => {
  loading.value = true
  try {
    const [statsData, evalData] = await Promise.all([
      getEvaluationStatistics(filterServiceItemId.value),
      getEvaluations(undefined, filterServiceItemId.value),
    ])
    stats.value = statsData
    evaluations.value = evalData
  } finally {
    loading.value = false
  }
}

const openReplyDialog = (evaluation: Evaluation) => {
  replyTarget.value = evaluation
  replyForm.reply = ''
  replyDialogVisible.value = true
}

const submitReply = async () => {
  if (!replyTarget.value || !replyForm.reply.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (!userStore.user) return

  replying.value = true
  try {
    await replyEvaluation(replyTarget.value.id, replyForm.reply, userStore.user.id)
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
    loadData()
  } catch {
  } finally {
    replying.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.stat-card {
  margin-bottom: 20px;
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.rating-dist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rating-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rating-label {
  width: 36px;
  text-align: right;
  font-weight: 500;
  color: #606266;
}
.rating-row .el-progress {
  flex: 1;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8px 0;
}
</style>
