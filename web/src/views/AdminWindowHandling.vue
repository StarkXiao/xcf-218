<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">线下窗口协同办理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAcceptDialog = true">
          <el-icon><Plus /></el-icon> 窗口受理录入
        </el-button>
        <el-button type="success" @click="goDisplay">
          <el-icon><Monitor /></el-icon> 叫号大屏
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <div class="filter-bar">
            <el-date-picker
              v-model="filterDate"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 200px"
              @change="loadData"
            />
            <el-select
              v-model="filterWindowNumber"
              placeholder="全部窗口"
              clearable
              style="width: 160px"
              @change="loadData"
            >
              <el-option v-for="w in windowList" :key="w" :label="`${w}号窗口`" :value="w" />
            </el-select>
            <el-select
              v-model="filterServiceItemId"
              placeholder="全部事项"
              clearable
              style="width: 200px"
              @change="loadData"
            >
              <el-option
                v-for="item in serviceItems"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
            <el-select
              v-model="filterStatus"
              placeholder="全部状态"
              clearable
              style="width: 160px"
              @change="loadHandlings"
            >
              <el-option label="已受理" value="accepted" />
              <el-option label="办理中" value="processing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="loadData">
              <el-icon><Refresh /></el-icon> 刷新
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="6" v-for="stat in statsList" :key="stat.key">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>等待队列</span>
              <el-button
                v-if="queueList.length > 0"
                type="warning"
                size="small"
                @click="handleCallNext"
                :disabled="calling"
              >
                <el-icon><Microphone /></el-icon> 叫下一号
              </el-button>
            </div>
          </template>
          <div class="queue-list">
            <div
              v-for="(item, idx) in queueList"
              :key="item.id"
              class="queue-item"
              :class="{ active: idx === 0 }"
            >
              <div class="queue-no">{{ item.queueNumber }}</div>
              <div class="queue-info">
                <div class="queue-name">{{ item.applicantName || item.user?.name }}</div>
                <div class="queue-service">{{ item.serviceItem?.name }}</div>
              </div>
              <div class="queue-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click="handleCall(item)"
                  :disabled="calling"
                >
                  叫号
                </el-button>
              </div>
            </div>
            <el-empty v-if="queueList.length === 0" description="暂无等待" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>窗口受理列表</span>
            </div>
          </template>
          <el-table :data="handlings" style="width: 100%">
            <el-table-column label="排队号" width="120">
              <template #default="{ row }">
                <span class="queue-no">{{ row.queueNumber }}</span>
              </template>
            </el-table-column>
            <el-table-column label="受理编号" width="160" prop="handlingNo" />
            <el-table-column label="窗口" width="80">
              <template #default="{ row }">{{ row.windowNumber }}号</template>
            </el-table-column>
            <el-table-column label="办事事项" min-width="160">
              <template #default="{ row }">{{ row.serviceItem?.name }}</template>
            </el-table-column>
            <el-table-column label="申请人" width="100">
              <template #default="{ row }">{{ row.applicantName || row.user?.name }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="同步状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.syncStatus === 'synced'" type="success">已同步</el-tag>
                <el-tag v-else type="warning">待同步</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="受理时间" width="160">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'accepted'"
                  type="primary"
                  size="small"
                  @click="handleStartProcess(row)"
                >
                  开始办理
                </el-button>
                <el-button
                  v-if="row.status === 'processing'"
                  type="success"
                  size="small"
                  @click="handleComplete(row)"
                >
                  完成办理
                </el-button>
                <el-button
                  v-if="row.status !== 'completed' && row.status !== 'cancelled'"
                  type="danger"
                  size="small"
                  @click="handleCancel(row)"
                >
                  取消
                </el-button>
                <el-button
                  v-if="row.syncStatus !== 'synced'"
                  type="warning"
                  size="small"
                  @click="handleSync(row)"
                >
                  同步线上
                </el-button>
                <el-button
                  v-if="row.applicationId"
                  type="primary"
                  link
                  size="small"
                  @click="$router.push(`/admin/review/${row.applicationId}`)"
                >
                  申请详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && handlings.length === 0" description="暂无受理记录" style="padding: 60px 0" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showAcceptDialog" title="窗口受理录入" width="700px" :close-on-click-modal="false">
      <el-form :model="acceptForm" label-width="100px" ref="acceptFormRef" :rules="acceptRules">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="窗口号" prop="windowNumber">
              <el-select v-model="acceptForm.windowNumber" placeholder="请选择窗口" style="width: 100%">
                <el-option v-for="w in windowList" :key="w" :label="`${w}号窗口`" :value="w" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="办事事项" prop="serviceItemId">
              <el-select v-model="acceptForm.serviceItemId" placeholder="请选择事项" style="width: 100%" filterable>
                <el-option
                  v-for="item in serviceItems"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户ID" prop="userId">
              <el-input-number v-model="acceptForm.userId" :min="1" style="width: 100%" @change="loadUserInfo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否读取用户信息">
              <el-button type="primary" size="small" @click="loadUserInfo" :disabled="!acceptForm.userId">
                读取用户
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="申请人姓名" prop="applicantName">
              <el-input v-model="acceptForm.applicantName" placeholder="请输入申请人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="applicantPhone">
              <el-input v-model="acceptForm.applicantPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="身份证号">
          <el-input v-model="acceptForm.applicantIdCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="办理材料">
          <el-input
            v-model="acceptForm.materialsText"
            type="textarea"
            :rows="3"
            placeholder="请输入提交的材料清单，多个材料用逗号分隔"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="acceptForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAcceptDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAccept" :loading="submitting">确认受理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="completeDialogVisible" title="完成办理" width="500px">
      <el-form :model="completeForm" label-width="100px">
        <el-form-item label="办理结果">
          <el-radio-group v-model="completeForm.result">
            <el-radio value="success">办理成功</el-radio>
            <el-radio value="failed">材料不足</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否同步线上">
          <el-switch v-model="completeForm.autoSync" />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="completeForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入办理备注"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmComplete">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Microphone, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { getServiceItems } from '@/api/service-item'
import { getUserById } from '@/api/user'
import {
  createWindowHandling,
  getWindowHandlings,
  getWindowHandlingStats,
  getQueueList,
  updateWindowHandlingStatus,
  syncWindowHandlingToOnline,
  callNextQueue,
  createQueueCall,
} from '@/api/window-coordination'
import type { WindowHandling, ServiceItem, User } from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const calling = ref(false)
const submitting = ref(false)
const serviceItems = ref<ServiceItem[]>([])
const handlings = ref<WindowHandling[]>([])
const queueList = ref<WindowHandling[]>([])
const filterDate = ref(dayjs().format('YYYY-MM-DD'))
const filterWindowNumber = ref('')
const filterServiceItemId = ref<number | null>(null)
const filterStatus = ref('')

const windowList = ['1', '2', '3', '4', '5', '6', '7', '8']

const showAcceptDialog = ref(false)
const acceptFormRef = ref<FormInstance>()
const acceptForm = ref({
  windowNumber: '',
  userId: 0,
  serviceItemId: 0,
  applicantName: '',
  applicantIdCard: '',
  applicantPhone: '',
  materialsText: '',
  remark: '',
})

const acceptRules: FormRules = {
  windowNumber: [{ required: true, message: '请选择窗口', trigger: 'change' }],
  serviceItemId: [{ required: true, message: '请选择办事事项', trigger: 'change' }],
  userId: [{ required: true, message: '请输入用户ID', trigger: 'blur' }],
  applicantName: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
}

const completeDialogVisible = ref(false)
const currentHandling = ref<WindowHandling | null>(null)
const completeForm = ref({
  result: 'success',
  remark: '',
  autoSync: true,
})

const statsList = computed(() => {
  const all = handlings.value
  return [
    { key: 'total', label: '今日受理总数', value: all.length, color: '#409eff' },
    { key: 'accepted', label: '等待办理', value: all.filter(a => a.status === 'accepted').length, color: '#e6a23c' },
    { key: 'processing', label: '办理中', value: all.filter(a => a.status === 'processing').length, color: '#409eff' },
    { key: 'completed', label: '已完成', value: all.filter(a => a.status === 'completed').length, color: '#67c23a' },
  ]
})

const statusText = (status: string) => {
  const map: Record<string, string> = {
    accepted: '已受理',
    processing: '办理中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const statusTagType = (status: string) => {
  const map: Record<string, string> = {
    accepted: 'warning',
    processing: 'primary',
    completed: 'success',
    cancelled: 'info',
  }
  return map[status] || ''
}

const formatDateTime = (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')

const loadServiceItems = async () => {
  serviceItems.value = await getServiceItems()
}

const loadUserInfo = async () => {
  if (!acceptForm.value.userId) return
  try {
    const user = await getUserById(acceptForm.value.userId) as User
    if (user) {
      acceptForm.value.applicantName = acceptForm.value.applicantName || user.name
      acceptForm.value.applicantIdCard = acceptForm.value.applicantIdCard || user.idCard
      acceptForm.value.applicantPhone = acceptForm.value.applicantPhone || user.phone
    }
  } catch {
    ElMessage.warning('未找到该用户，请手动填写信息')
  }
}

const loadHandlings = async () => {
  loading.value = true
  try {
    handlings.value = await getWindowHandlings({
      windowNumber: filterWindowNumber.value || undefined,
      serviceItemId: filterServiceItemId.value || undefined,
      date: filterDate.value,
      status: filterStatus.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

const loadQueue = async () => {
  queueList.value = await getQueueList({
    windowNumber: filterWindowNumber.value || undefined,
    serviceItemId: filterServiceItemId.value || undefined,
  })
}

const loadStats = async () => {
  await getWindowHandlingStats(filterDate.value)
}

const loadData = () => {
  loadHandlings()
  loadQueue()
  loadStats()
}

const submitAccept = async () => {
  if (!acceptFormRef.value) return
  await acceptFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const materials = acceptForm.value.materialsText
        ? acceptForm.value.materialsText.split(/[,，]/).map(m => m.trim()).filter(Boolean)
        : []
      await createWindowHandling({
        windowNumber: acceptForm.value.windowNumber,
        userId: acceptForm.value.userId,
        serviceItemId: acceptForm.value.serviceItemId,
        applicantName: acceptForm.value.applicantName,
        applicantIdCard: acceptForm.value.applicantIdCard,
        applicantPhone: acceptForm.value.applicantPhone,
        materials: JSON.stringify(materials),
        formData: JSON.stringify({ remark: acceptForm.value.remark }),
        handlerId: userStore.user?.id,
      })
      ElMessage.success('窗口受理成功')
      showAcceptDialog.value = false
      acceptForm.value = {
        windowNumber: '',
        userId: 0,
        serviceItemId: 0,
        applicantName: '',
        applicantIdCard: '',
        applicantPhone: '',
        materialsText: '',
        remark: '',
      }
      loadData()
    } finally {
      submitting.value = false
    }
  })
}

const handleStartProcess = async (row: WindowHandling) => {
  await updateWindowHandlingStatus(row.id, 'processing', undefined, userStore.user?.id)
  ElMessage.success(`已开始办理 ${row.queueNumber}`)
  loadData()
}

const handleComplete = (row: WindowHandling) => {
  currentHandling.value = row
  completeForm.value = { result: 'success', remark: '', autoSync: true }
  completeDialogVisible.value = true
}

const confirmComplete = async () => {
  if (!currentHandling.value) return
  const remark = completeForm.value.result === 'success'
    ? (completeForm.value.remark || '办理完成')
    : (completeForm.value.remark || '材料不足，请补充材料')
  await updateWindowHandlingStatus(
    currentHandling.value.id,
    'completed',
    remark,
    userStore.user?.id
  )
  if (completeForm.value.autoSync) {
    try {
      await syncWindowHandlingToOnline(currentHandling.value.id, userStore.user?.id)
      ElMessage.success('办理完成并已同步到线上')
    } catch (e: any) {
      ElMessage.warning(`办理完成，但同步失败：${e.message || '未知错误'}`)
    }
  } else {
    ElMessage.success('办理完成')
  }
  completeDialogVisible.value = false
  loadData()
}

const handleCancel = async (row: WindowHandling) => {
  await ElMessageBox.confirm('确定取消该受理记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await updateWindowHandlingStatus(row.id, 'cancelled', '窗口取消', userStore.user?.id)
  ElMessage.success('已取消')
  loadData()
}

const handleSync = async (row: WindowHandling) => {
  try {
    await syncWindowHandlingToOnline(row.id, userStore.user?.id)
    ElMessage.success('已同步到线上')
    loadData()
  } catch (e: any) {
    ElMessage.error(`同步失败：${e.message || '未知错误'}`)
  }
}

const handleCall = async (row: WindowHandling) => {
  calling.value = true
  try {
    await createQueueCall({
      windowNumber: row.windowNumber,
      windowHandlingId: row.id,
      queueNumber: row.queueNumber,
      callerId: userStore.user?.id,
    })
    ElMessage.info(`请 ${row.queueNumber} 号到 ${row.windowNumber} 号窗口办理`)
    loadData()
  } finally {
    calling.value = false
  }
}

const handleCallNext = async () => {
  calling.value = true
  try {
    const next = await callNextQueue({
      windowNumber: filterWindowNumber.value || '1',
      serviceItemId: filterServiceItemId.value || undefined,
      callerId: userStore.user?.id,
    })
    ElMessage.info(`请 ${next.queueNumber} 号到 ${next.windowNumber} 号窗口办理`)
    loadData()
  } catch (e: any) {
    ElMessage.warning(e.message || '暂无等待办理的用户')
  } finally {
    calling.value = false
  }
}

const goDisplay = () => {
  router.push('/admin/queue-display')
}

onMounted(() => {
  loadServiceItems()
  loadData()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.queue-no {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
}
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 32px;
  font-weight: 700;
}
.queue-list {
  max-height: 600px;
  overflow-y: auto;
}
.queue-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  gap: 12px;
}
.queue-item.active {
  background: #ecf5ff;
  border-radius: 4px;
}
.queue-item .queue-no {
  font-size: 20px;
  min-width: 90px;
}
.queue-info {
  flex: 1;
}
.queue-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.queue-service {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
