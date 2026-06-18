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
      width="700px"
      @close="resetForm"
    >
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
import { Plus, View, Star, Bell } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import type { ServiceItem } from '@/types'

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
  })
  materialsText.value = row.materials || ''
  publishNow.value = false
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
  materialsText.value = ''
  formRef.value?.resetFields()
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

        const data = { ...formData, materials }
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
</style>
