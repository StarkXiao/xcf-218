<template>
  <div class="admin-page" v-loading="loading">
    <div class="page-header">
      <h2>高频事项配置管理</h2>
      <p>配置高频事项专区的分类和展示内容</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="高频分类管理" name="categories">
        <div class="tab-header">
          <el-button type="primary" :icon="Plus" @click="openCategoryDialog()">
            新增分类
          </el-button>
        </div>
        <el-table :data="categories" style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="分类名称" min-width="120" />
          <el-table-column prop="code" label="分类编码" width="140" />
          <el-table-column prop="icon" label="图标" width="100" />
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'info'">
                {{ row.active ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openCategoryDialog(row)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="handleDeleteCategory(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="categories.length === 0" description="暂无分类数据" />
      </el-tab-pane>

      <el-tab-pane label="高频事项管理" name="items">
        <div class="tab-header">
          <el-form :inline="true" :model="queryForm">
            <el-form-item label="关键词">
              <el-input
                v-model="queryForm.keyword"
                placeholder="请输入事项名称"
                clearable
                style="width: 200px"
              />
            </el-form-item>
            <el-form-item label="分类">
              <el-select
                v-model="queryForm.categoryId"
                placeholder="全部分类"
                clearable
                style="width: 160px"
              >
                <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="loadItems">
                查询
              </el-button>
              <el-button :icon="Refresh" @click="resetQuery">
                重置
              </el-button>
            </el-form-item>
          </el-form>
          <el-button type="primary" :icon="Plus" @click="openItemDialog()">
            新增高频事项
          </el-button>
        </div>
        <el-table :data="items" style="width: 100%">
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column label="事项名称" min-width="160">
            <template #default="{ row }">
              {{ row.serviceItem?.name }}
            </template>
          </el-table-column>
          <el-table-column label="所属分类" width="120">
            <template #default="{ row }">
              {{ row.category?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="70" />
          <el-table-column label="运营位" width="180">
            <template #default="{ row }">
              <el-tag v-if="row.isBanner" type="danger" size="small" style="margin-right: 4px">
                首页Banner
              </el-tag>
              <el-tag v-if="row.isQuickApply" type="warning" size="small">
                快捷申报
              </el-tag>
              <span v-if="!row.isBanner && !row.isQuickApply" class="text-muted">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="clickCount" label="点击量" width="80" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-switch
                :model-value="row.active"
                @change="(val: boolean) => handleToggleActive(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="170">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openItemDialog(row)">
                编辑
              </el-button>
              <el-button
                :type="row.active ? 'warning' : 'success'"
                link
                size="small"
                @click="handleToggleActive(row, !row.active)"
              >
                {{ row.active ? '禁用' : '启用' }}
              </el-button>
              <el-button type="danger" link size="small" @click="handleDeleteItem(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="items.length === 0" description="暂无高频事项数据" />
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="categoryDialogVisible"
      :title="editingCategory ? '编辑分类' : '新增分类'"
      width="500px"
    >
      <el-form :model="categoryForm" :rules="categoryRules" ref="categoryFormRef" label-width="100px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="code">
          <el-input v-model="categoryForm.code" placeholder="请输入分类编码，如：HUZHENG" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="categoryForm.icon" placeholder="请输入图标名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="categoryForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态" prop="active">
          <el-switch v-model="categoryForm.active" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="categoryForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="itemDialogVisible"
      :title="editingItem ? '编辑高频事项' : '新增高频事项'"
      width="600px"
    >
      <el-form :model="itemForm" :rules="itemRules" ref="itemFormRef" label-width="120px">
        <el-form-item label="关联事项" prop="serviceItemId">
          <el-select
            v-model="itemForm.serviceItemId"
            placeholder="请选择要关联的办事事项"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in availableServices"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所属分类" prop="categoryId">
          <el-select
            v-model="itemForm.categoryId"
            placeholder="请选择分类"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="itemForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="运营位配置">
          <el-checkbox v-model="itemForm.isBanner">首页Banner展示</el-checkbox>
          <el-checkbox v-model="itemForm.isQuickApply" style="margin-left: 20px">
            快捷申报入口
          </el-checkbox>
        </el-form-item>
        <el-form-item label="Banner标题" prop="bannerTitle" v-if="itemForm.isBanner">
          <el-input v-model="itemForm.bannerTitle" placeholder="请输入Banner标题" />
        </el-form-item>
        <el-form-item label="Banner副标题" prop="bannerSubtitle" v-if="itemForm.isBanner">
          <el-input v-model="itemForm.bannerSubtitle" placeholder="请输入Banner副标题" />
        </el-form-item>
        <el-form-item label="快捷申报提示" prop="quickApplyTips" v-if="itemForm.isQuickApply">
          <el-input
            v-model="itemForm.quickApplyTips"
            type="textarea"
            :rows="2"
            placeholder="请输入快捷申报的提示信息"
          />
        </el-form-item>
        <el-form-item label="启用状态" prop="active">
          <el-switch v-model="itemForm.active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import {
  getAdminHotCategories,
  getAdminHotItems,
  getAvailableServiceItems,
  createHotCategory,
  updateHotCategory,
  deleteHotCategory,
  createHotItem,
  updateHotItem,
  deleteHotItem,
  toggleHotItemActive,
} from '@/api/high-frequency'
import type { HotCategory, HotItem, ServiceItem } from '@/types'

const loading = ref(false)
const activeTab = ref('categories')
const categories = ref<HotCategory[]>([])
const items = ref<HotItem[]>([])
const availableServices = ref<ServiceItem[]>([])

const queryForm = reactive({
  keyword: '',
  categoryId: undefined as number | undefined,
})

const categoryDialogVisible = ref(false)
const editingCategory = ref<HotCategory | null>(null)
const categoryFormRef = ref<FormInstance>()
const categoryForm = reactive<Partial<HotCategory>>({
  name: '',
  code: '',
  icon: '',
  sort: 0,
  active: true,
  description: '',
})

const categoryRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
}

const itemDialogVisible = ref(false)
const editingItem = ref<HotItem | null>(null)
const itemFormRef = ref<FormInstance>()
const itemForm = reactive<Partial<HotItem>>({
  serviceItemId: undefined,
  categoryId: undefined,
  sort: 0,
  isBanner: false,
  isQuickApply: false,
  bannerTitle: '',
  bannerSubtitle: '',
  quickApplyTips: '',
  active: true,
})

const itemRules: FormRules = {
  serviceItemId: [{ required: true, message: '请选择关联事项', trigger: 'change' }],
}

const formatDate = (date?: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'
}

const loadCategories = async () => {
  try {
    categories.value = await getAdminHotCategories()
  } catch (e) {
    ElMessage.error('加载分类数据失败')
  }
}

const loadItems = async () => {
  loading.value = true
  try {
    items.value = await getAdminHotItems(queryForm.keyword, queryForm.categoryId)
  } catch (e) {
    ElMessage.error('加载高频事项数据失败')
  } finally {
    loading.value = false
  }
}

const loadAvailableServices = async () => {
  try {
    availableServices.value = await getAvailableServiceItems()
  } catch (e) {
    ElMessage.error('加载可用事项失败')
  }
}

const resetQuery = () => {
  queryForm.keyword = ''
  queryForm.categoryId = undefined
  loadItems()
}

const openCategoryDialog = (row?: HotCategory) => {
  editingCategory.value = row || null
  if (row) {
    Object.assign(categoryForm, {
      name: row.name,
      code: row.code,
      icon: row.icon,
      sort: row.sort,
      active: row.active,
      description: row.description,
    })
  } else {
    Object.assign(categoryForm, {
      name: '',
      code: '',
      icon: '',
      sort: 0,
      active: true,
      description: '',
    })
  }
  categoryDialogVisible.value = true
}

const handleSaveCategory = async () => {
  if (!categoryFormRef.value) return
  const valid = await categoryFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (editingCategory.value) {
      await updateHotCategory(editingCategory.value.id, categoryForm)
      ElMessage.success('更新成功')
    } else {
      await createHotCategory(categoryForm)
      ElMessage.success('创建成功')
    }
    categoryDialogVisible.value = false
    loadCategories()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const handleDeleteCategory = async (row: HotCategory) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分类"${row.name}"吗？该分类下的事项将取消关联。`,
      '确认删除',
      { type: 'warning' }
    )
    await deleteHotCategory(row.id)
    ElMessage.success('删除成功')
    loadCategories()
    if (activeTab.value === 'items') {
      loadItems()
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const openItemDialog = (row?: HotItem) => {
  editingItem.value = row || null
  loadAvailableServices()
  if (row) {
    Object.assign(itemForm, {
      serviceItemId: row.serviceItemId,
      categoryId: row.categoryId,
      sort: row.sort,
      isBanner: row.isBanner,
      isQuickApply: row.isQuickApply,
      bannerTitle: row.bannerTitle,
      bannerSubtitle: row.bannerSubtitle,
      quickApplyTips: row.quickApplyTips,
      active: row.active,
    })
  } else {
    Object.assign(itemForm, {
      serviceItemId: undefined,
      categoryId: undefined,
      sort: 0,
      isBanner: false,
      isQuickApply: false,
      bannerTitle: '',
      bannerSubtitle: '',
      quickApplyTips: '',
      active: true,
    })
  }
  itemDialogVisible.value = true
}

const handleSaveItem = async () => {
  if (!itemFormRef.value) return
  const valid = await itemFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    if (editingItem.value) {
      await updateHotItem(editingItem.value.id, itemForm)
      ElMessage.success('更新成功')
    } else {
      await createHotItem(itemForm)
      ElMessage.success('创建成功')
    }
    itemDialogVisible.value = false
    loadItems()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const handleToggleActive = async (row: HotItem, active: boolean) => {
  try {
    await toggleHotItemActive(row.id, active)
    row.active = active
    ElMessage.success(active ? '已启用' : '已禁用')
  } catch (e) {
    ElMessage.error('操作失败')
    row.active = !active
  }
}

const handleDeleteItem = async (row: HotItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除该高频事项吗？`,
      '确认删除',
      { type: 'warning' }
    )
    await deleteHotItem(row.id)
    ElMessage.success('删除成功')
    loadItems()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  loadCategories()
  loadItems()
})
</script>

<style scoped>
.admin-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.page-header p {
  color: #909399;
  margin: 0;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.text-muted {
  color: #909399;
}
</style>
