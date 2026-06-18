<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card>
      <div class="page-header">
        <h2 class="page-title">跨事项联合申报</h2>
        <el-tag type="info">一次填报，多事项并行办理</el-tag>
      </div>

      <el-steps :active="currentStep" finish-status="success" style="margin: 32px 0 40px">
        <el-step title="选择事项" />
        <el-step title="填写信息" />
        <el-step title="上传材料" />
        <el-step title="确认提交" />
      </el-steps>

      <!-- Step 1: 选择事项 -->
      <div v-if="currentStep === 0">
        <div class="form-section-title">选择办事事项（至少选择2项）</div>
        <el-alert
          title="选择您需要同时办理的多个事项，系统将自动拆单并复用相同材料"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-input
          v-model="searchKeyword"
          placeholder="搜索事项名称或分类..."
          style="max-width: 400px; margin-bottom: 16px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="items-grid">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="item-card"
            :class="{ 'is-selected': selectedItemIds.includes(item.id) }"
            @click="toggleItem(item.id)"
          >
            <div class="item-checkbox">
              <el-checkbox :model-value="selectedItemIds.includes(item.id)" @click.stop />
            </div>
            <div class="item-content">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-meta">
                <el-tag size="small" type="info">{{ item.category }}</el-tag>
                <span class="item-days">{{ item.processingDays }} 个工作日</span>
              </div>
              <div class="item-desc">{{ item.description }}</div>
            </div>
          </div>
        </div>

        <div v-if="filteredItems.length === 0" style="text-align: center; padding: 40px">
          <el-empty description="未找到匹配的事项" />
        </div>

        <div class="step-actions">
          <el-button size="large" @click="$router.back()">取消</el-button>
          <el-button
            type="primary"
            size="large"
            :disabled="selectedItemIds.length < 2"
            @click="goToNextStep"
          >
            下一步（已选 {{ selectedItemIds.length }} 项）
          </el-button>
        </div>
      </div>

      <!-- Step 2: 填写信息 -->
      <div v-if="currentStep === 1">
        <div class="form-section-title">申请人基本信息（一次填报，全部事项共用）</div>

        <el-form
          ref="baseFormRef"
          :model="baseFormData"
          :rules="baseFormRules"
          label-width="120px"
          style="max-width: 800px; margin: 0 auto 40px"
        >
          <el-form-item label="申报标题" prop="title">
            <el-input
              v-model="baseFormData.title"
              placeholder="请输入本次联合申报的标题"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="申请人姓名" prop="name">
            <el-input v-model="baseFormData.name" :disabled="!!userStore.user" />
          </el-form-item>
          <el-form-item label="身份证号" prop="idCard">
            <el-input
              v-model="baseFormData.idCard"
              maxlength="18"
              :disabled="!!userStore.user"
            />
          </el-form-item>
          <el-form-item label="联系电话" prop="phone">
            <el-input
              v-model="baseFormData.phone"
              maxlength="11"
              :disabled="!!userStore.user"
            />
          </el-form-item>
          <el-form-item label="联系地址" prop="address">
            <el-input
              v-model="baseFormData.address"
              type="textarea"
              :rows="2"
            />
          </el-form-item>
        </el-form>

        <div class="form-section-title">各事项补充信息</div>
        <el-alert
          title="以下为各事项需要补充的特有信息，公共信息已自动填入"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-tabs v-model="activeTab" type="card" style="max-width: 900px; margin: 0 auto">
          <el-tab-pane
            v-for="(item, idx) in selectedItems"
            :key="item.id"
            :label="`${idx + 1}. ${item.name}`"
            :name="String(item.id)"
          >
            <div class="tab-item-meta">
              <el-tag size="small">{{ item.category }}</el-tag>
              <span>办理时限：{{ item.processingDays }} 个工作日</span>
            </div>
            <el-form
              :ref="el => setItemFormRef(item.id, el)"
              :model="itemFormData[item.id]"
              label-width="120px"
              style="max-width: 700px; margin-top: 16px"
            >
              <el-form-item label="申请事由">
                <el-input
                  v-model="itemFormData[item.id].reason"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入办理本事项的具体事由"
                />
              </el-form-item>
              <el-form-item label="补充说明">
                <el-input
                  v-model="itemFormData[item.id].remark"
                  type="textarea"
                  :rows="2"
                  placeholder="选填，其他需要说明的事项"
                />
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>

        <div class="step-actions">
          <el-button size="large" @click="currentStep = 0">上一步</el-button>
          <el-button type="primary" size="large" @click="handleStep2Next">下一步</el-button>
        </div>
      </div>

      <!-- Step 3: 上传材料 -->
      <div v-if="currentStep === 2">
        <div class="form-section-title">材料上传与复用</div>
        <el-alert
          title="勾选"共享"可将材料复用于多个事项，避免重复上传"
          type="success"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />

        <el-table :data="materialList" border style="width: 100%">
          <el-table-column label="材料名称" width="200">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <span v-if="row.required" style="color: #f56c6c"> *</span>
            </template>
          </el-table-column>
          <el-table-column label="适用事项" width="280">
            <template #default="{ row }">
              <el-select
                v-model="row.serviceItemIds"
                multiple
                placeholder="选择适用事项"
                style="width: 100%"
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option
                  v-for="item in selectedItems"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="共享复用" width="100" align="center">
            <template #default="{ row }">
              <el-checkbox
                v-model="row.isShared"
                :disabled="!row.serviceItemIds || row.serviceItemIds.length < 2"
              >
                共享
              </el-checkbox>
            </template>
          </el-table-column>
          <el-table-column label="文件上传">
            <template #default="{ row }">
              <el-upload
                :auto-upload="false"
                :limit="1"
                :on-exceed="() => $message.warning('只能上传一个文件')"
                :on-change="(file: any) => handleFileChange(row, file)"
                :on-remove="() => handleFileRemove(row)"
                accept=".jpg,.jpeg,.png,.pdf"
              >
                <el-button type="primary" :icon="Upload">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持 jpg/png/pdf 格式，单个文件不超过 10MB</div>
                </template>
              </el-upload>
              <div v-if="row.uploadedFile" class="file-info">
                <el-icon color="#67c23a"><Check /></el-icon>
                <span>{{ row.uploadedFile.name }} ({{ formatFileSize(row.uploadedFile.size || 0) }})</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ $index }">
              <el-button type="danger" link @click="removeMaterial($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 16px">
          <el-button @click="addMaterial">
            <el-icon><Plus /></el-icon> 添加材料
          </el-button>
        </div>

        <div class="material-stats" v-if="materialList.length > 0">
          <el-statistic title="材料总数" :value="materialList.length" />
          <el-statistic title="共享材料" :value="sharedMaterialCount" />
          <el-statistic title="预计节省上传次数" :value="estimatedSaves" />
        </div>

        <div class="step-actions">
          <el-button size="large" @click="currentStep = 1">上一步</el-button>
          <el-button type="primary" size="large" @click="handleStep3Next">下一步</el-button>
        </div>
      </div>

      <!-- Step 4: 确认提交 -->
      <div v-if="currentStep === 3">
        <div class="form-section-title">确认申报信息</div>

        <el-descriptions :column="2" border style="margin-bottom: 24px">
          <el-descriptions-item label="申报标题">{{ baseFormData.title }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ baseFormData.name }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{ baseFormData.idCard }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ baseFormData.phone }}</el-descriptions-item>
          <el-descriptions-item label="联系地址" :span="2">{{ baseFormData.address }}</el-descriptions-item>
        </el-descriptions>

        <div class="form-section-title">申报事项（{{ selectedItems.length }} 项）</div>
        <el-table :data="selectedItems" border style="margin-bottom: 24px">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="name" label="事项名称" />
          <el-table-column prop="category" label="分类" width="140" />
          <el-table-column prop="processingDays" label="办理时限" width="120">
            <template #default="{ row }">{{ row.processingDays }} 个工作日</template>
          </el-table-column>
        </el-table>

        <div class="form-section-title">材料清单（{{ materialList.length }} 份）</div>
        <el-table :data="materialList" border style="margin-bottom: 24px">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="name" label="材料名称" />
          <el-table-column label="适用事项" width="240">
            <template #default="{ row }">
              <el-tag
                v-for="id in row.serviceItemIds"
                :key="id"
                size="small"
                style="margin-right: 4px"
              >
                {{ getItemName(id) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="共享" width="80" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isShared" type="success" size="small">是</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="文件" width="240">
            <template #default="{ row }">
              <span v-if="row.uploadedFile">{{ row.uploadedFile.name }}</span>
              <el-tag v-else type="danger" size="small">未上传</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="step-actions">
          <el-button size="large" @click="currentStep = 2">上一步</el-button>
          <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            确认提交
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type UploadFile, type FormRules } from 'element-plus'
import { ArrowLeft, Search, Plus, Upload, Check } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getAvailableJointItems, createJointApplication } from '@/api/joint-application'
import type { ServiceItem } from '@/types'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const currentStep = ref(0)
const searchKeyword = ref('')
const availableItems = ref<ServiceItem[]>([])
const selectedItemIds = ref<number[]>([])
const activeTab = ref('')
const baseFormRef = ref<FormInstance>()
const itemFormRefs = reactive<Record<number, FormInstance | undefined>>({})

interface MaterialRow {
  name: string
  required: boolean
  fieldName: string
  isShared: boolean
  serviceItemIds: number[]
  uploadedFile: UploadFile | null
}

const materialList = ref<MaterialRow[]>([])

const baseFormData = reactive({
  title: '',
  name: '',
  idCard: '',
  phone: '',
  address: '',
})

const itemFormData = reactive<Record<number, { reason: string; remark: string }>>({})

const baseFormRules: FormRules = {
  title: [{ required: true, message: '请输入申报标题', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号码格式不正确', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入联系地址', trigger: 'blur' }],
}

const setItemFormRef = (id: number, el: any) => {
  if (el) itemFormRefs[id] = el as FormInstance
}

const filteredItems = computed(() => {
  if (!searchKeyword.value) return availableItems.value
  const kw = searchKeyword.value.toLowerCase()
  return availableItems.value.filter(
    i =>
      i.name.toLowerCase().includes(kw) ||
      i.category.toLowerCase().includes(kw) ||
      i.code.toLowerCase().includes(kw),
  )
})

const selectedItems = computed(() =>
  availableItems.value.filter(i => selectedItemIds.value.includes(i.id)),
)

const sharedMaterialCount = computed(() =>
  materialList.value.filter(m => m.isShared).length,
)

const estimatedSaves = computed(() =>
  materialList.value.reduce((sum, m) => {
    if (m.isShared && m.serviceItemIds?.length > 1) {
      return sum + (m.serviceItemIds.length - 1)
    }
    return sum
  }, 0),
)

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const getItemName = (id: number) => {
  return availableItems.value.find(i => i.id === id)?.name || `事项${id}`
}

const toggleItem = (id: number) => {
  const idx = selectedItemIds.value.indexOf(id)
  if (idx > -1) {
    selectedItemIds.value.splice(idx, 1)
  } else {
    selectedItemIds.value.push(id)
  }
}

const addMaterial = () => {
  materialList.value.push({
    name: '',
    required: true,
    fieldName: `material_${Date.now()}`,
    isShared: false,
    serviceItemIds: [...selectedItemIds.value],
    uploadedFile: null,
  })
}

const removeMaterial = (index: number) => {
  materialList.value.splice(index, 1)
}

const handleFileChange = (row: MaterialRow, file: UploadFile) => {
  if (file.raw) {
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 10MB')
      return
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
      ElMessage.error('仅支持 JPG/PNG/PDF 格式')
      return
    }
  }
  row.uploadedFile = file
}

const handleFileRemove = (row: MaterialRow) => {
  row.uploadedFile = null
}

const goToNextStep = () => {
  currentStep.value = 1
  if (selectedItems.value.length > 0) {
    activeTab.value = String(selectedItems.value[0].id)
  }
  selectedItems.value.forEach(item => {
    if (!itemFormData[item.id]) {
      itemFormData[item.id] = { reason: '', remark: '' }
    }
  })
}

const handleStep2Next = async () => {
  if (!baseFormRef.value) return
  const valid = await baseFormRef.value.validate().catch(() => false)
  if (!valid) return
  currentStep.value = 2
  if (materialList.value.length === 0) {
    addMaterial()
  }
}

const handleStep3Next = async () => {
  for (let i = 0; i < materialList.value.length; i++) {
    const m = materialList.value[i]
    if (!m.name.trim()) {
      ElMessage.error(`请填写第 ${i + 1} 项材料的名称`)
      return
    }
    if (!m.serviceItemIds || m.serviceItemIds.length === 0) {
      ElMessage.error(`请选择材料"${m.name}"的适用事项`)
      return
    }
    if (!m.uploadedFile) {
      ElMessage.error(`请上传材料"${m.name}"`)
      return
    }
    if (m.isShared && m.serviceItemIds.length < 2) {
      ElMessage.error(`共享材料"${m.name}"需要至少适用于2个事项`)
      return
    }
  }
  currentStep.value = 3
}

const handleSubmit = async () => {
  if (!userStore.user) {
    ElMessage.error('请先登录')
    return
  }

  submitting.value = true
  try {
    const formDataObj = new FormData()
    formDataObj.append('userId', String(userStore.user.id))
    formDataObj.append('title', baseFormData.title)

    const formPayload: Record<string, any> = {
      name: baseFormData.name,
      idCard: baseFormData.idCard,
      phone: baseFormData.phone,
      address: baseFormData.address,
    }
    formDataObj.append('formData', JSON.stringify(formPayload))

    const subApplications = selectedItemIds.value.map((sid, idx) => {
      const mats = materialList.value
        .filter(m => m.serviceItemIds.includes(sid))
        .map(m => ({
          name: m.name,
          required: m.required,
          fieldName: m.fieldName,
          isShared: m.isShared,
          serviceItemIds: m.serviceItemIds,
        }))
      return {
        serviceItemId: sid,
        formData: itemFormData[sid] || {},
        materialsInfo: mats,
        sortOrder: idx,
      }
    })
    formDataObj.append('subApplications', JSON.stringify(subApplications))

    for (const m of materialList.value) {
      if (m.uploadedFile?.raw) {
        formDataObj.append(m.fieldName, m.uploadedFile.raw, m.uploadedFile.name)
      }
    }

    const result = await createJointApplication(formDataObj)
    ElMessage.success('联合申报提交成功，系统已自动拆单')
    router.push(`/joint-applications/${result.id}`)
  } finally {
    submitting.value = false
  }
}

const loadItems = async () => {
  loading.value = true
  try {
    availableItems.value = await getAvailableJointItems()
    if (userStore.user) {
      baseFormData.name = userStore.user.name
      baseFormData.idCard = userStore.user.idCard
      baseFormData.phone = userStore.user.phone
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadItems)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
}
.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 24px 0 16px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.item-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.item-card:hover {
  border-color: #409eff;
  background: #f0f7ff;
}
.item-card.is-selected {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}
.item-checkbox {
  flex-shrink: 0;
  padding-top: 2px;
}
.item-content {
  flex: 1;
  min-width: 0;
}
.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.item-days {
  font-size: 13px;
  color: #909399;
}
.item-desc {
  font-size: 13px;
  color: #606266;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tab-item-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  color: #606266;
  font-size: 13px;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: #67c23a;
}
.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}
.material-stats {
  display: flex;
  gap: 40px;
  margin-top: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}
</style>
