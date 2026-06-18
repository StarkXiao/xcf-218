<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回列表
    </el-button>

    <el-card v-if="item">
      <div class="detail-header">
        <div>
          <el-tag type="primary" effect="dark" size="large" style="margin-right: 12px">
            {{ item.category }}
          </el-tag>
          <h2 class="detail-title">{{ item.name }}</h2>
          <p class="detail-code">事项编码：{{ item.code }}</p>
        </div>
        <div class="detail-actions">
          <div class="processing-info">
            <el-icon :size="20" color="#e6a23c"><Clock /></el-icon>
            <div>
              <span class="label">办理时限</span>
              <span class="value">{{ item.processingDays }} 个工作日</span>
            </div>
          </div>
          <div class="stats-row">
            <div class="stat-item">
              <el-icon :size="16" color="#f56c6c"><View /></el-icon>
              <span>{{ item.viewCount || 0 }} 浏览</span>
            </div>
            <div class="stat-item">
              <el-icon :size="16" color="#f56c6c"><Star /></el-icon>
              <span>{{ item.favoriteCount || 0 }} 收藏</span>
            </div>
          </div>
          <div class="follow-actions">
            <el-button
              :type="item.isFavorited ? 'danger' : 'default'"
              @click="handleToggleFavorite"
            >
              <el-icon><Star :fill="item.isFavorited ? '#f56c6c' : 'none'" /></el-icon>
              {{ item.isFavorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button
              :type="item.isSubscribed ? 'success' : 'default'"
              @click="handleToggleSubscription"
            >
              <el-icon><Bell :fill="item.isSubscribed ? '#67c23a' : 'none'" /></el-icon>
              {{ item.isSubscribed ? '已订阅' : '订阅' }}
            </el-button>
          </div>
          <div class="action-buttons">
            <el-button type="success" size="large" @click="goBook">
              <el-icon><Calendar /></el-icon> 预约取号
            </el-button>
            <el-button type="primary" size="large" @click="goApply">
              <el-icon><EditPen /></el-icon> 直接办理
            </el-button>
          </div>
        </div>
      </div>

      <el-divider />

      <div class="content-section">
        <h3 class="section-title">事项描述</h3>
        <p class="content-text">{{ item.description }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">办理条件</h3>
        <p class="content-text">{{ item.requirements }}</p>
      </div>

      <div class="content-section">
        <h3 class="section-title">所需材料</h3>
        <el-table :data="materialList" style="width: 100%">
          <el-table-column type="index" label="序号" width="80" />
          <el-table-column prop="name" label="材料名称" />
          <el-table-column label="是否必需" width="120">
            <template #default="{ row }">
              <el-tag :type="row.required ? 'danger' : 'info'">
                {{ row.required ? '必需' : '选填' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="faqList.length > 0" class="content-section">
        <h3 class="section-title">
          <el-icon><QuestionFilled /></el-icon> 常见问题
        </h3>
        <el-collapse>
          <el-collapse-item
            v-for="(faq, index) in faqList"
            :key="index"
            :title="faq.question"
            :name="String(index)"
          >
            <div class="faq-answer">{{ faq.answer }}</div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <div v-if="exampleList.length > 0" class="content-section">
        <h3 class="section-title">
          <el-icon><Document /></el-icon> 办理示例
        </h3>
        <div class="example-list">
          <div v-for="(example, index) in exampleList" :key="index" class="example-card">
            <div class="example-header">
              <h4 class="example-title">{{ example.title }}</h4>
              <el-tag type="info" size="small">{{ example.scenario }}</el-tag>
            </div>
            <p class="example-desc">{{ example.description }}</p>
            <div class="example-steps">
              <div class="steps-title">办理步骤</div>
              <el-steps :active="example.steps.length" finish-status="success" direction="vertical">
                <el-step
                  v-for="(step, stepIndex) in example.steps"
                  :key="stepIndex"
                  :title="`第 ${stepIndex + 1} 步`"
                  :description="step"
                />
              </el-steps>
            </div>
            <div class="example-result">
              <el-icon color="#67c23a"><CircleCheck /></el-icon>
              <span>办理结果：{{ example.result }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="riskTipList.length > 0" class="content-section">
        <h3 class="section-title">
          <el-icon><Warning /></el-icon> 申请前风险提示
        </h3>
        <div class="risk-tip-list">
          <div
            v-for="(risk, index) in riskTipList"
            :key="index"
            class="risk-tip-item"
            :class="`risk-${risk.level}`"
          >
            <div class="risk-icon">
              <el-icon :size="24">
                <Warning v-if="risk.level === 'high'" />
                <InfoFilled v-else-if="risk.level === 'medium'" />
                <QuestionFilled v-else />
              </el-icon>
            </div>
            <div class="risk-content">
              <div class="risk-title">
                <el-tag :type="getRiskTagType(risk.level)" size="small">
                  {{ getRiskLevelLabel(risk.level) }}
                </el-tag>
                <span class="risk-title-text">{{ risk.title }}</span>
              </div>
              <p class="risk-text">{{ risk.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getServiceItemById } from '@/api/service-item'
import { toggleFavorite } from '@/api/favorite'
import { toggleSubscription } from '@/api/subscription'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import {
  Star,
  Bell,
  View,
  Clock,
  Calendar,
  EditPen,
  QuestionFilled,
  Document,
  Warning,
  CircleCheck,
  InfoFilled,
} from '@element-plus/icons-vue'
import type { ServiceItem, FaqItem, HandlingExample, RiskTip } from '@/types'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const item = ref<ServiceItem | null>(null)
const materialList = ref<any[]>([])
const faqList = ref<FaqItem[]>([])
const exampleList = ref<HandlingExample[]>([])
const riskTipList = ref<RiskTip[]>([])

const parseJsonSafe = <T>(str: string | undefined, defaultValue: T): T => {
  if (!str) return defaultValue
  try {
    const parsed = JSON.parse(str)
    return parsed as T
  } catch {
    return defaultValue
  }
}

const getRiskLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }
  return labels[level] || level
}

const getRiskTagType = (level: string) => {
  const types: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
  }
  return types[level] || 'info'
}

const loadItem = async () => {
  loading.value = true
  try {
    item.value = await getServiceItemById(Number(route.params.id), userStore.user?.id)
    if (item.value?.materials) {
      try {
        materialList.value = JSON.parse(item.value.materials)
      } catch {
        materialList.value = []
      }
    }
    faqList.value = parseJsonSafe<FaqItem[]>(item.value?.faqs, [])
    exampleList.value = parseJsonSafe<HandlingExample[]>(item.value?.handlingExamples, [])
    riskTipList.value = parseJsonSafe<RiskTip[]>(item.value?.riskTips, [])
  } finally {
    loading.value = false
  }
}

const handleToggleFavorite = async () => {
  if (!userStore.user || !item.value) return
  try {
    const res = await toggleFavorite(userStore.user.id, item.value.id)
    item.value.isFavorited = res.favorited
    if (res.favorited) {
      item.value.favoriteCount = (item.value.favoriteCount || 0) + 1
      ElMessage.success('收藏成功')
    } else {
      item.value.favoriteCount = Math.max(0, (item.value.favoriteCount || 0) - 1)
      ElMessage.success('已取消收藏')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleToggleSubscription = async () => {
  if (!userStore.user || !item.value) return
  try {
    const res = await toggleSubscription(userStore.user.id, item.value.id)
    item.value.isSubscribed = res.subscribed
    ElMessage.success(res.subscribed ? '订阅成功，将及时接收该事项的更新通知' : '已取消订阅')
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const goBook = () => {
  router.push(`/book/${route.params.id}`)
}

const goApply = () => {
  router.push(`/apply/${route.params.id}`)
}

onMounted(loadItem)
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detail-title {
  font-size: 24px;
  font-weight: 600;
  margin: 12px 0 8px;
  color: #303133;
}
.detail-code {
  font-size: 14px;
  color: #909399;
}
.detail-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}
.action-buttons {
  display: flex;
  gap: 12px;
}
.processing-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fdf6ec;
  padding: 12px 20px;
  border-radius: 4px;
}
.processing-info .label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.processing-info .value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #e6a23c;
}
.stats-row {
  display: flex;
  gap: 20px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}
.follow-actions {
  display: flex;
  gap: 8px;
}
.content-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  padding: 0 8px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  padding-left: 12px;
  border-left: 4px solid #409eff;
}
.faq-answer {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  padding: 8px 0;
}
.example-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.example-card {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
}
.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.example-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
.example-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 16px;
}
.example-steps {
  margin: 16px 0;
  padding: 16px;
  background: #fff;
  border-radius: 6px;
}
.steps-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}
.example-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9eb;
  border-radius: 6px;
  font-size: 14px;
  color: #67c23a;
}
.risk-tip-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.risk-tip-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid;
}
.risk-tip-item.risk-high {
  background: #fef0f0;
  border-left-color: #f56c6c;
  color: #f56c6c;
}
.risk-tip-item.risk-medium {
  background: #fdf6ec;
  border-left-color: #e6a23c;
  color: #e6a23c;
}
.risk-tip-item.risk-low {
  background: #f0f9eb;
  border-left-color: #67c23a;
  color: #67c23a;
}
.risk-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.risk-content {
  flex: 1;
}
.risk-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.risk-title-text {
  font-weight: 600;
  font-size: 15px;
}
.risk-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0;
}
</style>
