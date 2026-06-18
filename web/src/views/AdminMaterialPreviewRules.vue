<template>
  <div class="admin-material-preview-rules">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>材料预审规则配置</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新增规则
          </el-button>
        </div>
      </template>

      <el-form :inline="true" @submit.prevent class="search-form">
        <el-form-item label="所属事项">
          <el-select
            v-model="searchForm.serviceItemId"
            placeholder="选择事项"
            clearable
            style="width: 240px"
            @change="loadRules"
          >
            <el-option
              v-for="item in serviceItems"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关联模板">
          <el-select
            v-model="searchForm.materialTemplateId"
            placeholder="选择模板"
            clearable
            style="width: 240px"
            @change="loadRules"
          >
            <el-option
              v-for="tpl in templates"
              :key="tpl.id"
              :label="`${tpl.name} (v${tpl.version})`"
              :value="tpl.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="generateFromTemplate" :disabled="!searchForm.serviceItemId">
            <el-icon><Refresh /></el-icon>
            从模板生成规则
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        title="提示：选择办事事项后，系统会自动加载已有规则；如果没有规则，可从材料模板自动生成或手动添加。"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <div v-if="searchForm.serviceItemId">
        <div class="rules-header">
          <span>规则列表（按校验顺序排列，可拖动调整顺序）</span>
          <el-button type="primary" size="small" @click="handleSaveAll" :loading="saving">
            保存全部
          </el-button>
        </div>

        <el-table
          :data="rules"
          style="width: 100%"
          v-loading="loading"
          row-key="id"
        >
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">
              {{ $index + 1 }}
            </template>
          </el-table-column>
          <el-table-column label="字段标识" min-width="120">
            <template #default="{ row }">
              <el-input
                v-model="row.fieldName"
                placeholder="如 idCard_front"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="字段名称" min-width="120">
            <template #default="{ row }">
              <el-input
                v-model="row.fieldLabel"
                placeholder="如 身份证正面"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="必填" width="70" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.required" />
            </template>
          </el-table-column>
          <el-table-column label="允许格式" min-width="180">
            <template #default="{ row }">
              <el-select
                v-model="row.allowedFileTypes"
                multiple
                placeholder="选择格式"
                size="small"
                style="width: 100%"
              >
                <el-option label="JPG" value=".jpg" />
                <el-option label="JPEG" value=".jpeg" />
                <el-option label="PNG" value=".png" />
                <el-option label="PDF" value=".pdf" />
                <el-option label="DOC" value=".doc" />
                <el-option label="DOCX" value=".docx" />
                <el-option label="XLS" value=".xls" />
                <el-option label="XLSX" value=".xlsx" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="大小(MB)" width="120">
            <template #default="{ row }">
              <el-input-number
                v-model="row.maxFileSize"
                :min="1"
                :max="100"
                size="small"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="命名规则" min-width="140">
            <template #default="{ row }">
              <el-input
                v-model="row.validationPattern"
                placeholder="正则表达式"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="规则提示" min-width="140">
            <template #default="{ row }">
              <el-input
                v-model="row.validationMessage"
                placeholder="校验提示"
                size="small"
              />
            </template>
          </el-table-column>
          <el-table-column label="启用" width="70" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ $index }">
              <el-button type="danger" link size="small" @click="removeRule($index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 16px">
          <el-button type="primary" :icon="Plus" @click="addRule">
            添加规则
          </el-button>
        </div>
      </div>

      <el-empty v-else description="请先选择办事事项" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  getPreviewRules,
  batchCreatePreviewRules,
  type MaterialPreviewRule,
} from '@/api/material-preview'
import { getAdminServiceItems } from '@/api/service-item'
import { getCurrentTemplate, getTemplatesByServiceItem } from '@/api/material-template'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh } from '@element-plus/icons-vue'
import type { ServiceItem, MaterialTemplate, TemplateFieldDef } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const rules = ref<MaterialPreviewRule[]>([])
const serviceItems = ref<ServiceItem[]>([])
const templates = ref<MaterialTemplate[]>([])

const searchForm = reactive({
  serviceItemId: null as number | null,
  materialTemplateId: null as number | null,
})

const loadServiceItems = async () => {
  try {
    serviceItems.value = await getAdminServiceItems()
  } catch (e) {
    ElMessage.error('加载事项列表失败')
  }
}

const loadTemplates = async () => {
  if (!searchForm.serviceItemId) {
    templates.value = []
    return
  }
  try {
    templates.value = await getTemplatesByServiceItem(searchForm.serviceItemId)
  } catch (e) {
    templates.value = []
  }
}

const loadRules = async () => {
  if (!searchForm.serviceItemId) {
    rules.value = []
    return
  }

  await loadTemplates()

  loading.value = true
  try {
    rules.value = await getPreviewRules(
      searchForm.serviceItemId,
      searchForm.materialTemplateId || undefined,
    )
    if (rules.value.length === 0) {
      ElMessage.info('暂无预审规则，可从模板生成或手动添加')
    }
  } catch (e) {
    ElMessage.error('加载规则失败')
  } finally {
    loading.value = false
  }
}

const addRule = () => {
  rules.value.push({
    id: 0,
    serviceItemId: searchForm.serviceItemId!,
    materialTemplateId: searchForm.materialTemplateId || undefined,
    fieldName: '',
    fieldLabel: '',
    required: true,
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxFileSize: 10,
    validationPattern: '',
    validationMessage: '',
    customRule: '',
    enabled: true,
    sortOrder: rules.value.length,
    createdAt: '',
    updatedAt: '',
  })
}

const removeRule = (index: number) => {
  ElMessageBox.confirm('确定要删除此规则吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      rules.value.splice(index, 1)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

const generateFromTemplate = async () => {
  if (!searchForm.serviceItemId) {
    ElMessage.warning('请先选择办事事项')
    return
  }

  try {
    let tplFields: TemplateFieldDef[] = []
    
    if (searchForm.materialTemplateId) {
      const tpl = templates.value.find(t => t.id === searchForm.materialTemplateId)
      if (tpl && tpl.fields) {
        tplFields = Array.isArray(tpl.fields) ? tpl.fields : []
      }
    } else {
      const currentTpl = await getCurrentTemplate(searchForm.serviceItemId)
      if (currentTpl && currentTpl.fields) {
        tplFields = Array.isArray(currentTpl.fields) ? currentTpl.fields : []
      }
    }

    if (tplFields.length === 0) {
      ElMessage.warning('未找到可用的材料模板字段')
      return
    }

    const fileFields = tplFields.filter(f => f.type === 'file')
    if (fileFields.length === 0) {
      ElMessage.warning('模板中没有文件类型的字段')
      return
    }

    if (rules.value.length > 0) {
      await ElMessageBox.confirm(
        '已有规则，是否覆盖现有规则？',
        '提示',
        {
          confirmButtonText: '覆盖',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
    }

    rules.value = fileFields.map((field, index) => ({
      id: 0,
      serviceItemId: searchForm.serviceItemId!,
      materialTemplateId: searchForm.materialTemplateId || undefined,
      fieldName: field.key,
      fieldLabel: field.label,
      required: field.required ?? true,
      allowedFileTypes: field.allowedFileTypes || ['.jpg', '.jpeg', '.png', '.pdf'],
      maxFileSize: field.maxFileSize || 10,
      validationPattern: field.pattern || '',
      validationMessage: field.patternMessage || '',
      customRule: '',
      enabled: true,
      sortOrder: index,
      createdAt: '',
      updatedAt: '',
    }))

    ElMessage.success(`已从模板生成 ${rules.value.length} 条规则`)
  } catch (e) {
    ElMessage.error('生成规则失败')
  }
}

const handleAdd = () => {
  if (!searchForm.serviceItemId) {
    ElMessage.warning('请先选择办事事项')
    return
  }
  addRule()
}

const handleSaveAll = async () => {
  if (rules.value.length === 0) {
    ElMessage.warning('没有可保存的规则')
    return
  }

  const invalid = rules.value.find(r => !r.fieldName || !r.fieldLabel)
  if (invalid) {
    ElMessage.warning('请完善所有规则的字段标识和字段名称')
    return
  }

  saving.value = true
  try {
    await batchCreatePreviewRules(
      searchForm.serviceItemId!,
      rules.value,
      searchForm.materialTemplateId || undefined,
    )
    ElMessage.success('保存成功')
    await loadRules()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadServiceItems)
</script>

<style scoped>
.admin-material-preview-rules {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.search-form {
  margin-bottom: 16px;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-weight: 500;
  color: #303133;
}
</style>
