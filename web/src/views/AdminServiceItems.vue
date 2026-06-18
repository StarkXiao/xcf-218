<template>
  <div class="admin-service-items">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>事项管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增事项
          </el-button>
        </div>
      </template>

      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入事项名称" clearable @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="items" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="事项名称" min-width="180" />
        <el-table-column prop="code" label="事项编码" width="140" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column label="发布状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.publishStatus === 'published' ? 'success' : 'info'">
              {{ row.publishStatus === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推荐" width="80">
          <template #default="{ row }">
            <el-switch
              v-model="row.recommended"
              @change="(val: boolean) => handleToggleRecommend(row.id, val)"
              active-text="是"
              inactive-text="否"
            />
          </template>
        </el-table-column>
        <el-table-column label="数据统计" width="180">
          <template #default="{ row }">
            <div class="stats-cell">
              <span><el-icon><View /></el-icon> {{ row.viewCount || 0 }}</span>
              <span><el-icon><Star /></el-icon> {{ row.favoriteCount || 0 }}</span>
              <span><el-icon><Bell /></el-icon> {{ row.subscriptionCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="row.publishStatus !== 'published'"
              type="success"
              link
              @click="handlePublish(row)"
            >发布</el-button>
            <el-button
              v-else
              type="warning"
              link
              @click="handleUnpublish(row)"
            >下架</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑事项' : '新增事项'"
      width="900px"
      @close="resetForm"
    >
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="基本信息" name="basic">
          <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
            <el-form-item label="事项名称" prop="name">
              <el-input v-model="formData.name" placeholder="请输入事项名称" />
            </el-form-item>
            <el-form-item label="事项编码" prop="code">
              <el-input v-model="formData.code" placeholder="请输入事项编码" />
            </el-form-item>
            <el-form-item label="所属分类" prop="category">
              <el-input v-model="formData.category" placeholder="如：户籍办理、社会保障等" />
            </el-form-item>
            <el-form-item label="办理时限" prop="processingDays">
              <el-input-number v-model="formData.processingDays" :min="1" :max="365" />
              <span style="margin-left: 8px">个工作日</span>
            </el-form-item>
            <el-form-item label="事项描述" prop="description">
              <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入事项描述" />
            </el-form-item>
            <el-form-item label="办理条件" prop="requirements">
              <el-input v-model="formData.requirements" type="textarea" :rows="3" placeholder="请输入办理条件" />
            </el-form-item>
            <el-form-item label="所需材料" prop="materials">
              <el-input
                v-model="materialsText"
                type="textarea"
                :rows="4"
                placeholder="JSON格式，如：[{&quot;name&quot;:&quot;身份证&quot;,&quot;required&quot;:true}]"
              />
            </el-form-item>
            <el-form-item label="更新说明" prop="changeLog">
              <el-input
                v-model="formData.changeLog"
                type="textarea"
                :rows="2"
                placeholder="填写本次更新内容，将通知给订阅用户"
              />
            </el-form-item>
            <el-form-item label="立即发布">
              <el-switch v-model="publishNow" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="常见问题" name="faqs">
          <div class="tab-content">
            <div style="margin-bottom: 16px">
              <el-button type="primary" @click="addFaq">
                <el-icon><Plus /></el-icon> 添加问题
              </el-button>
            </div>
            <div v-if="faqList.length === 0" class="empty-tip">
              暂无常见问题，点击上方按钮添加
            </div>
            <div v-else class="faq-editor-list">
              <div v-for="(faq, index) in faqList" :key="index" class="faq-editor-item">
                <div class="faq-item-header">
                  <span class="faq-item-index">问题 {{ index + 1 }}</span>
                  <el-button type="danger" link @click="removeFaq(index)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
                <el-input
                  v-model="faq.question"
                  placeholder="请输入问题"
                  style="margin-bottom: 8px"
                />
                <el-input
                  v-model="faq.answer"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入答案"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="办理示例" name="examples">
          <div class="tab-content">
            <div style="margin-bottom: 16px">
              <el-button type="primary" @click="addExample">
                <el-icon><Plus /></el-icon> 添加示例
              </el-button>
            </div>
            <div v-if="exampleList.length === 0" class="empty-tip">
              暂无办理示例，点击上方按钮添加
            </div>
            <div v-else class="example-editor-list">
              <div v-for="(example, index) in exampleList" :key="index" class="example-editor-item">
                <div class="example-item-header">
                  <span class="example-item-index">示例 {{ index + 1 }}</span>
                  <el-button type="danger" link @click="removeExample(index)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
                <el-form label-width="80px">
                  <el-form-item label="标题">
                    <el-input v-model="example.title" placeholder="请输入示例标题" />
                  </el-form-item>
                  <el-form-item label="场景">
                    <el-input v-model="example.scenario" placeholder="请输入适用场景描述" />
                  </el-form-item>
                  <el-form-item label="描述">
                    <el-input v-model="example.description" type="textarea" :rows="2" placeholder="请输入示例描述" />
                  </el-form-item>
                  <el-form-item label="步骤">
                    <div class="steps-editor">
                      <div v-for="(step, stepIndex) in example.steps" :key="stepIndex" class="step-item">
                        <el-input v-model="example.steps[stepIndex]" placeholder={`步骤 ${stepIndex + 1}`} />
                        <el-button type="danger" link @click="removeExampleStep(index, stepIndex)">
                          <el-icon><Delete /></el-icon>
                        </el-button>
                      </div>
                      <el-button type="primary" link @click="addExampleStep(index)">
                        <el-icon><Plus /></el-icon> 添加步骤
                      </el-button>
                    </div>
                  </el-form-item>
                  <el-form-item label="结果">
                    <el-input v-model="example.result" type="textarea" :rows="2" placeholder="请输入办理结果说明" />
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="风险提示" name="risks">
          <div class="tab-content">
            <div style="margin-bottom: 16px">
              <el-button type="primary" @click="addRiskTip">
                <el-icon><Plus /></el-icon> 添加风险提示
              </el-button>
              <span style="margin-left: 12px; color: #909399; font-size: 13px">
                风险提示将在用户申请前展示
              </span>
            </div>
            <div v-if="riskTipList.length === 0" class="empty-tip">
              暂无风险提示，点击上方按钮添加
            </div>
            <div v-else class="risk-editor-list">
              <div v-for="(risk, index) in riskTipList" :key="index" class="risk-editor-item">
                <div class="risk-item-header">
                  <span class="risk-item-index">提示 {{ index + 1 }}</span>
                  <el-select v-model="risk.level" size="small" style="width: 120px">
                    <el-option label="低风险" value="low" />
                    <el-option label="中风险" value="medium" />
                    <el-option label="高风险" value="high" />
                  </el-select>
                  <el-button type="danger" link @click="removeRiskTip(index)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </div>
                <el-input
                  v-model="risk.title"
                  placeholder="请输入风险标题"
                  style="margin-bottom: 8px"
                />
                <el-input
                  v-model="risk.content"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入风险详细说明"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  getAdminServiceItems,
  getCategories,
  createServiceItem,
  updateServiceItem,
  publishServiceItem,
  unpublishServiceItem,
  toggleRecommend,
  deleteServiceItem,
} from '@/api/service-item'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, View, Star, Bell, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { ServiceItem, FaqItem, HandlingExample, RiskTip } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const items = ref<ServiceItem[]>([])
const categories = ref<string[]>([])

const searchForm = reactive({
  keyword: '',
  category: '',
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const publishNow = ref(false)
const materialsText = ref('')
const activeTab = ref('basic')
const faqList = ref<FaqItem[]>([])
const exampleList = ref<HandlingExample[]>([])
const riskTipList = ref<RiskTip[]>([])

const formData = reactive<Partial<ServiceItem>>({
  name: '',
  code: '',
  category: '',
  description: '',
  requirements: '',
  materials: '',
  processingDays: 5,
  changeLog: '',
  active: true,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入事项名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入事项编码', trigger: 'blur' }],
  category: [{ required: true, message: '请输入所属分类', trigger: 'blur' }],
  description: [{ required: true, message: '请输入事项描述', trigger: 'blur' }],
  requirements: [{ required: true, message: '请输入办理条件', trigger: 'blur' }],
}

const formRef = ref<FormInstance>()

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const loadData = async () => {
  loading.value = true
  try {
    const [data, cats] = await Promise.all([
      getAdminServiceItems(searchForm.keyword || undefined, searchForm.category || undefined),
      getCategories(),
    ])
    items.value = data
    categories.value = cats
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.category = ''
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  publishNow.value = false
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: ServiceItem) => {
  isEdit.value = true
  editId.value = row.id
  Object.assign(formData, {
    name: row.name,
    code: row.code,
    category: row.category,
    description: row.description,
    requirements: row.requirements,
    materials: row.materials,
    processingDays: row.processingDays,
    changeLog: '',
    active: row.active,
    faqs: row.faqs,
    handlingExamples: row.handlingExamples,
    riskTips: row.riskTips,
  })
  materialsText.value = row.materials || ''
  faqList.value = parseJsonSafe<FaqItem[]>(row.faqs, [])
  exampleList.value = parseJsonSafe<HandlingExample[]>(row.handlingExamples, [])
  riskTipList.value = parseJsonSafe<RiskTip[]>(row.riskTips, [])
  publishNow.value = false
  activeTab.value = 'basic'
  dialogVisible.value = true
}

const resetForm = () => {
  formData.name = ''
  formData.code = ''
  formData.category = ''
  formData.description = ''
  formData.requirements = ''
  formData.materials = ''
  formData.processingDays = 5
  formData.changeLog = ''
  formData.active = true
  formData.faqs = ''
  formData.handlingExamples = ''
  formData.riskTips = ''
  materialsText.value = ''
  faqList.value = []
  exampleList.value = []
  riskTipList.value = []
  activeTab.value = 'basic'
  formRef.value?.resetFields()
}

const parseJsonSafe = <T>(str: string | undefined, defaultValue: T): T => {
  if (!str) return defaultValue
  try {
    const parsed = JSON.parse(str)
    return parsed as T
  } catch {
    return defaultValue
  }
}

const addFaq = () => {
  faqList.value.push({ question: '', answer: '', sort: faqList.value.length + 1 })
}

const removeFaq = (index: number) => {
  faqList.value.splice(index, 1)
}

const addExample = () => {
  exampleList.value.push({
    title: '',
    description: '',
    scenario: '',
    steps: [''],
    result: '',
    sort: exampleList.value.length + 1,
  })
}

const removeExample = (index: number) => {
  exampleList.value.splice(index, 1)
}

const addExampleStep = (exampleIndex: number) => {
  exampleList.value[exampleIndex].steps.push('')
}

const removeExampleStep = (exampleIndex: number, stepIndex: number) => {
  exampleList.value[exampleIndex].steps.splice(stepIndex, 1)
}

const addRiskTip = () => {
  riskTipList.value.push({
    level: 'medium',
    title: '',
    content: '',
    sort: riskTipList.value.length + 1,
  })
}

const removeRiskTip = (index: number) => {
  riskTipList.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        let materials = materialsText.value
        if (materials) {
          try {
            JSON.parse(materials)
          } catch {
            ElMessage.error('材料格式不正确，请输入有效的JSON')
            return
          }
        }

        const faqs = faqList.value.length > 0 ? JSON.stringify(faqList.value) : ''
        const handlingExamples = exampleList.value.length > 0 ? JSON.stringify(exampleList.value) : ''
        const riskTips = riskTipList.value.length > 0 ? JSON.stringify(riskTipList.value) : ''

        const data = { ...formData, materials, faqs, handlingExamples, riskTips }
        if (isEdit.value) {
          await updateServiceItem(editId.value, data)
          if (publishNow.value && userStore.user) {
            await publishServiceItem(editId.value, userStore.user.id)
          }
          ElMessage.success('更新成功')
        } else {
          const res = await createServiceItem(data)
          if (publishNow.value && userStore.user) {
            await publishServiceItem(res.id, userStore.user.id)
          }
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadData()
      } catch (e) {
        ElMessage.error('操作失败')
      }
    }
  })
}

const handlePublish = async (row: ServiceItem) => {
  try {
    await ElMessageBox.confirm('确定要发布该事项吗？发布后用户即可查看和办理。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    if (!userStore.user) return
    await publishServiceItem(row.id, userStore.user.id)
    ElMessage.success('发布成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleUnpublish = async (row: ServiceItem) => {
  try {
    await ElMessageBox.confirm('确定要下架该事项吗？下架后用户将无法查看。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await unpublishServiceItem(row.id)
    ElMessage.success('已下架')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

const handleToggleRecommend = async (id: number, recommended: boolean) => {
  try {
    await toggleRecommend(id, recommended)
    ElMessage.success(recommended ? '已设为推荐' : '已取消推荐')
  } catch (e) {
    ElMessage.error('操作失败')
    loadData()
  }
}

const handleDelete = async (row: ServiceItem) => {
  try {
    await ElMessageBox.confirm('确定要删除该事项吗？此操作不可恢复。', '警告', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'error',
    })
    await deleteServiceItem(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
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
.admin-service-items {
  padding: 20px;
}
.stats-cell {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #606266;
}
.stats-cell span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tab-content {
  padding: 8px 0;
}
.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
  background: #f5f7fa;
  border-radius: 4px;
}
.faq-editor-list,
.example-editor-list,
.risk-editor-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.faq-editor-item,
.example-editor-item,
.risk-editor-item {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 16px;
}
.faq-item-header,
.example-item-header,
.risk-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.faq-item-index,
.example-item-index,
.risk-item-index {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.steps-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-item .el-input {
  flex: 1;
}
</style>
