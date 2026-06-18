<template>
  <div class="admin-material-templates">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>事项材料模板管理</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon> 新建模板
          </el-button>
        </div>
      </template>

      <el-form :inline="true" @submit.prevent>
        <el-form-item label="所属事项">
          <el-select
            v-model="searchForm.serviceItemId"
            placeholder="全部事项"
            clearable
            style="width: 240px"
            @change="loadData"
          >
            <el-option
              v-for="item in serviceItems"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="templates" style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="模板名称" min-width="160" />
        <el-table-column label="所属事项" min-width="140">
          <template #default="{ row }">
            {{ getServiceItemName(row.serviceItemId) }}
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '已启用' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前版本" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isCurrent" type="warning" effect="dark">使用中</el-tag>
            <span v-else style="color: #909399">—</span>
          </template>
        </el-table-column>
        <el-table-column label="字段数" width="80" align="center">
          <template #default="{ row }">
            {{ row.fields?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewVersions(row)">版本</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="!row.isActive"
              type="success"
              link
              @click="handleEnable(row)"
            >启用</el-button>
            <el-button
              v-if="row.isActive && !row.isCurrent"
              type="warning"
              link
              @click="handleDisable(row)"
            >停用</el-button>
            <el-button
              v-if="!row.isCurrent && row.isActive"
              type="success"
              link
              @click="handleSwitch(row)"
            >切换为当前</el-button>
            <el-button
              v-if="!row.isCurrent"
              type="danger"
              link
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑模板' : '新建模板'"
      width="860px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="所属事项" prop="serviceItemId">
          <el-select
            v-model="formData.serviceItemId"
            placeholder="请选择事项"
            style="width: 100%"
            :disabled="isEdit"
          >
            <el-option
              v-for="item in serviceItems"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板描述">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入模板描述" />
        </el-form-item>
        <el-form-item label="变更说明">
          <el-input v-model="formData.changeLog" type="textarea" :rows="2" placeholder="本次创建/更新的变更说明" />
        </el-form-item>

        <div class="field-section-header">
          <span>字段定义</span>
          <el-button type="primary" size="small" @click="addField">
            <el-icon><Plus /></el-icon> 添加字段
          </el-button>
        </div>

        <div v-for="(field, index) in formData.fields" :key="index" class="field-item">
          <el-card shadow="never" class="field-card">
            <div class="field-card-header">
              <span>字段 {{ index + 1 }}</span>
              <el-button type="danger" size="small" link @click="removeField(index)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="字段标识" :prop="`fields.${index}.key`" :rules="[{ required: true, message: '请输入字段标识', trigger: 'blur' }]">
                  <el-input v-model="field.key" placeholder="如 idCard" :disabled="isEdit" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="显示名称" :prop="`fields.${index}.label`" :rules="[{ required: true, message: '请输入显示名称', trigger: 'blur' }]">
                  <el-input v-model="field.label" placeholder="如 身份证号" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="字段类型" :prop="`fields.${index}.type`" :rules="[{ required: true, message: '请选择字段类型', trigger: 'change' }]">
                  <el-select v-model="field.type" placeholder="请选择" style="width: 100%">
                    <el-option label="单行文本" value="text" />
                    <el-option label="多行文本" value="textarea" />
                    <el-option label="数字" value="number" />
                    <el-option label="日期" value="date" />
                    <el-option label="下拉选择" value="select" />
                    <el-option label="文件上传" value="file" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="是否必填">
                  <el-switch v-model="field.required" active-text="必填" inactive-text="选填" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="占位提示">
                  <el-input v-model="field.placeholder" placeholder="输入提示文字" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item v-if="field.type === 'text' || field.type === 'textarea'" label="最大长度">
                  <el-input-number v-model="field.maxLength" :min="1" :max="5000" placeholder="不限" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item v-if="field.type === 'text'" label="校验正则">
                  <el-input v-model="field.pattern" placeholder="如 ^1[3-9]\\d{9}$" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item v-if="field.type === 'text' && field.pattern" label="正则提示">
                  <el-input v-model="field.patternMessage" placeholder="校验不通过时提示" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row v-if="field.type === 'select'" :gutter="16">
              <el-col :span="16">
                <el-form-item label="选项列表">
                  <el-input
                    v-model="field.optionsText"
                    type="textarea"
                    :rows="2"
                    placeholder="每行一个选项"
                    @blur="parseOptions(field)"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row v-if="field.type === 'file'" :gutter="16">
              <el-col :span="8">
                <el-form-item label="允许格式">
                  <el-select v-model="field.allowedFileTypes" multiple placeholder="请选择" style="width: 100%">
                    <el-option label="JPG" value=".jpg" />
                    <el-option label="JPEG" value=".jpeg" />
                    <el-option label="PNG" value=".png" />
                    <el-option label="PDF" value=".pdf" />
                    <el-option label="DOC" value=".doc" />
                    <el-option label="DOCX" value=".docx" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="大小上限(MB)">
                  <el-input-number v-model="field.maxFileSize" :min="1" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="默认值">
                  <el-input v-model="field.defaultValue" placeholder="可选" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <el-empty v-if="formData.fields.length === 0" description="暂无字段，请点击上方添加" />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionDialogVisible" title="版本历史" width="700px">
      <el-table :data="versionList" v-loading="versionLoading">
        <el-table-column prop="version" label="版本" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="120" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isCurrent" type="warning" size="small" effect="dark">使用中</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changeLog" label="变更说明" min-width="120" show-overflow-tooltip />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button
              v-if="!row.isCurrent && row.isActive"
              type="success"
              link
              size="small"
              @click="handleSwitchFromVersion(row)"
            >切换</el-button>
            <el-button
              v-if="row.isActive && !row.isCurrent"
              type="warning"
              link
              size="small"
              @click="handleDisableFromVersion(row)"
            >停用</el-button>
            <el-button
              v-if="!row.isActive"
              type="success"
              link
              size="small"
              @click="handleEnableFromVersion(row)"
            >启用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  getMaterialTemplates,
  createMaterialTemplate,
  updateMaterialTemplate,
  enableTemplate,
  disableTemplate,
  switchTemplateVersion,
  deleteMaterialTemplate,
  getTemplatesByServiceItem,
} from '@/api/material-template'
import { getAdminServiceItems } from '@/api/service-item'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { MaterialTemplate, TemplateFieldDef, ServiceItem } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const templates = ref<MaterialTemplate[]>([])
const serviceItems = ref<ServiceItem[]>([])

const searchForm = reactive({
  serviceItemId: null as number | null,
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)

const versionDialogVisible = ref(false)
const versionLoading = ref(false)
const versionList = ref<MaterialTemplate[]>([])

interface FieldForm extends TemplateFieldDef {
  optionsText?: string
}

const formData = reactive({
  name: '',
  serviceItemId: null as number | null,
  description: '',
  changeLog: '',
  fields: [] as FieldForm[],
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  serviceItemId: [{ required: true, message: '请选择所属事项', trigger: 'change' }],
}

const formRef = ref<FormInstance>()

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')

const getServiceItemName = (id: number) => {
  return serviceItems.value.find(i => i.id === id)?.name || '—'
}

const loadData = async () => {
  loading.value = true
  try {
    const [data, items] = await Promise.all([
      getMaterialTemplates(searchForm.serviceItemId || undefined),
      getAdminServiceItems(),
    ])
    templates.value = data
    serviceItems.value = items
  } finally {
    loading.value = false
  }
}

const addField = () => {
  formData.fields.push({
    key: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    maxLength: undefined,
    pattern: '',
    patternMessage: '',
    options: [],
    optionsText: '',
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
    maxFileSize: 10,
    defaultValue: '',
  })
}

const removeField = (index: number) => {
  formData.fields.splice(index, 1)
}

const parseOptions = (field: FieldForm) => {
  if (field.optionsText) {
    field.options = field.optionsText.split('\n').map(o => o.trim()).filter(Boolean)
  } else {
    field.options = []
  }
}

const handleAdd = () => {
  isEdit.value = false
  dialogVisible.value = true
}

const handleEdit = (row: MaterialTemplate) => {
  isEdit.value = true
  editId.value = row.id
  formData.name = row.name
  formData.serviceItemId = row.serviceItemId
  formData.description = row.description || ''
  formData.changeLog = ''
  formData.fields = (row.fields || []).map(f => ({
    ...f,
    optionsText: f.options?.join('\n') || '',
  }))
  dialogVisible.value = true
}

const resetForm = () => {
  formData.name = ''
  formData.serviceItemId = null
  formData.description = ''
  formData.changeLog = ''
  formData.fields = []
  formRef.value?.resetFields()
}

const buildFieldsPayload = (): TemplateFieldDef[] => {
  return formData.fields.map(f => {
    const result: TemplateFieldDef = {
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
    }
    if (f.placeholder) result.placeholder = f.placeholder
    if (f.maxLength) result.maxLength = f.maxLength
    if (f.pattern) result.pattern = f.pattern
    if (f.patternMessage) result.patternMessage = f.patternMessage
    if (f.type === 'select' && f.options?.length) result.options = f.options
    if (f.type === 'file') {
      if (f.allowedFileTypes?.length) result.allowedFileTypes = f.allowedFileTypes
      if (f.maxFileSize) result.maxFileSize = f.maxFileSize
    }
    if (f.defaultValue) result.defaultValue = f.defaultValue
    return result
  })
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (formData.fields.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }

  const fields = buildFieldsPayload()
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateMaterialTemplate(editId.value, {
        name: formData.name,
        description: formData.description,
        changeLog: formData.changeLog,
        fields: fields as any,
      })
      ElMessage.success('更新成功')
    } else {
      await createMaterialTemplate({
        name: formData.name,
        serviceItemId: formData.serviceItemId!,
        description: formData.description,
        changeLog: formData.changeLog,
        fields: fields as any,
        createdBy: userStore.user?.id,
      } as any)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

const handleEnable = async (row: MaterialTemplate) => {
  try {
    await enableTemplate(row.id)
    ElMessage.success('已启用')
    loadData()
  } catch {
    ElMessage.error('操作失败')
  }
}

const handleDisable = async (row: MaterialTemplate) => {
  try {
    await ElMessageBox.confirm('确定要停用该模板吗？停用后该版本将不可用于新申请。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await disableTemplate(row.id)
    ElMessage.success('已停用')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handleSwitch = async (row: MaterialTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 v${row.version} 切换为当前使用版本吗？切换后新申请将使用此模板。`,
      '切换版本',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await switchTemplateVersion(row.id)
    ElMessage.success('版本已切换')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handleDelete = async (row: MaterialTemplate) => {
  try {
    await ElMessageBox.confirm('确定要删除该模板吗？此操作不可恢复。', '警告', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'error',
    })
    await deleteMaterialTemplate(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handleViewVersions = async (row: MaterialTemplate) => {
  versionDialogVisible.value = true
  versionLoading.value = true
  try {
    versionList.value = await getTemplatesByServiceItem(row.serviceItemId)
  } finally {
    versionLoading.value = false
  }
}

const handleSwitchFromVersion = async (row: MaterialTemplate) => {
  try {
    await switchTemplateVersion(row.id)
    ElMessage.success('版本已切换')
    versionDialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('操作失败')
  }
}

const handleDisableFromVersion = async (row: MaterialTemplate) => {
  try {
    await disableTemplate(row.id)
    ElMessage.success('已停用')
    versionList.value = await getTemplatesByServiceItem(row.serviceItemId)
    loadData()
  } catch {
    ElMessage.error('操作失败')
  }
}

const handleEnableFromVersion = async (row: MaterialTemplate) => {
  try {
    await enableTemplate(row.id)
    ElMessage.success('已启用')
    versionList.value = await getTemplatesByServiceItem(row.serviceItemId)
    loadData()
  } catch {
    ElMessage.error('操作失败')
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
.admin-material-templates {
  padding: 20px;
}
.field-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 16px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-weight: 600;
  color: #303133;
}
.field-item {
  margin-bottom: 12px;
}
.field-card {
  border: 1px solid #e4e7ed;
}
.field-card :deep(.el-card__body) {
  padding: 16px 20px 4px;
}
.field-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #ebeef5;
  font-weight: 500;
  color: #606266;
}
</style>
