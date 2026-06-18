<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card>
      <div class="page-header">
        <h2 class="page-title">异地办理协同申请</h2>
        <el-tag type="warning">跨区域协同</el-tag>
      </div>

      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 40px">
        <el-step title="选择事项与属地" />
        <el-step title="属地校验" />
        <el-step title="填写申请" />
        <el-step title="完成提交" />
      </el-steps>

      <div v-if="currentStep === 0" style="max-width: 700px; margin: 0 auto">
        <el-form ref="step0FormRef" :model="step0Data" :rules="step0Rules" label-width="120px">
          <div class="form-section-title">选择办理事项</div>
          <el-form-item label="办事事项" prop="serviceItemId">
            <el-select
              v-model="step0Data.serviceItemId"
              placeholder="请选择办事事项"
              filterable
              style="width: 100%"
              @change="onServiceItemChange"
            >
              <el-option
                v-for="item in serviceItems"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <div class="form-section-title">填写属地信息</div>
          <el-form-item label="申请人所在地" prop="applicantLocation">
            <el-select v-model="step0Data.applicantLocation" placeholder="请选择您所在地区" style="width: 100%">
              <el-option v-for="dept in uniqueRegions" :key="dept" :label="dept" :value="dept" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="checkJurisdiction" :loading="checking">
              进行属地校验
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="currentStep === 1" style="max-width: 700px; margin: 0 auto">
        <el-result v-if="jurisdictionResult" :icon="jurisdictionResult.needsCrossRegion ? 'warning' : 'success'" :title="jurisdictionResult.needsCrossRegion ? '该事项需异地办理' : '该事项可在本地办理'">
          <template #sub-title>
            <div v-if="jurisdictionResult.needsCrossRegion">
              <p>您所在地区（{{ jurisdictionResult.applicantLocation }}）暂无此事项的本地办理渠道。</p>
              <p>以下异地部门可受理该事项：</p>
              <el-tag
                v-for="dept in jurisdictionResult.remoteDepartments"
                :key="dept.id"
                style="margin: 4px"
                type="warning"
              >
                {{ dept.name }}（{{ dept.region }}）
              </el-tag>
            </div>
            <div v-else>
              <p>您所在地区（{{ jurisdictionResult.applicantLocation }}）可直接办理此事项。</p>
              <p>如仍需异地办理，可选择以下异地部门：</p>
              <el-tag
                v-for="dept in jurisdictionResult.remoteDepartments"
                :key="dept.id"
                style="margin: 4px"
              >
                {{ dept.name }}（{{ dept.region }}）
              </el-tag>
            </div>
          </template>
          <template #extra>
            <el-button @click="currentStep = 0">返回修改</el-button>
            <el-button type="primary" @click="currentStep = 2">继续异地办理</el-button>
          </template>
        </el-result>
      </div>

      <div v-if="currentStep === 2" style="max-width: 700px; margin: 0 auto">
        <el-form ref="step2FormRef" :model="step2Data" :rules="step2Rules" label-width="140px">
          <div class="form-section-title">选择协同部门</div>
          <el-form-item label="属地（收件）部门" prop="localDepartmentId">
            <el-select v-model="step2Data.localDepartmentId" placeholder="请选择属地部门" style="width: 100%">
              <el-option
                v-for="dept in localDepartments"
                :key="dept.id"
                :label="`${dept.name}（${dept.region}）`"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="异地受理部门" prop="remoteDepartmentId">
            <el-select v-model="step2Data.remoteDepartmentId" placeholder="请选择异地受理部门" style="width: 100%">
              <el-option
                v-for="dept in remoteDepartments"
                :key="dept.id"
                :label="`${dept.name}（${dept.region}）`"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>

          <div class="form-section-title">申请信息</div>
          <el-form-item label="申请说明" prop="applyReason">
            <el-input
              v-model="step2Data.applyReason"
              type="textarea"
              :rows="3"
              placeholder="请简述异地办理原因"
            />
          </el-form-item>

          <div class="form-section-title">上传材料</div>
          <el-alert
            title="请上传异地办理所需材料，支持 JPG/PNG/PDF 格式，单文件最大10MB"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          />
          <el-form-item label="材料文件">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :file-list="fileList"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
            >
              <el-button type="primary">选择文件</el-button>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button @click="currentStep = 1">上一步</el-button>
            <el-button type="primary" @click="submitApplication" :loading="submitting">
              提交异地办理申请
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="currentStep === 3" style="max-width: 700px; margin: 0 auto">
        <el-result icon="success" title="异地办理申请已提交" :sub-title="`申请编号：${submittedNo}，请等待属地校验结果。`">
          <template #extra>
            <el-button type="primary" @click="$router.push('/my-cross-region')">查看我的异地办理</el-button>
            <el-button @click="$router.push('/home')">返回首页</el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { crossRegionApi } from '@/api/cross-region'
import { getServiceItems } from '@/api/service-item'
import type { ServiceItem, JurisdictionCheckResult, CrossRegionDepartment } from '@/types'

const userStore = useUserStore()

const loading = ref(false)
const checking = ref(false)
const submitting = ref(false)
const currentStep = ref(0)
const submittedNo = ref('')

const serviceItems = ref<ServiceItem[]>([])
const departments = ref<CrossRegionDepartment[]>([])
const jurisdictionResult = ref<JurisdictionCheckResult | null>(null)
const fileList = ref<any[]>([])

const step0Data = ref({
  serviceItemId: null as number | null,
  applicantLocation: '',
})

const step0Rules = {
  serviceItemId: [{ required: true, message: '请选择办事事项', trigger: 'change' }],
  applicantLocation: [{ required: true, message: '请选择所在地区', trigger: 'change' }],
}

const step2Data = ref({
  localDepartmentId: null as number | null,
  remoteDepartmentId: null as number | null,
  applyReason: '',
})

const step2Rules = {
  localDepartmentId: [{ required: true, message: '请选择属地部门', trigger: 'change' }],
  remoteDepartmentId: [{ required: true, message: '请选择异地受理部门', trigger: 'change' }],
  applyReason: [{ required: true, message: '请填写申请说明', trigger: 'blur' }],
}

const step0FormRef = ref()
const step2FormRef = ref()
const uploadRef = ref()

const uniqueRegions = computed(() => {
  const regions = new Set(departments.value.map(d => d.region))
  return Array.from(regions).sort()
})

const localDepartments = computed(() => {
  if (!jurisdictionResult.value) return []
  const localIds = jurisdictionResult.value.localDepartments.map(d => d.id)
  if (localIds.length > 0) {
    return departments.value.filter(d => localIds.includes(d.id))
  }
  return departments.value.filter(d => d.region === step0Data.value.applicantLocation)
})

const remoteDepartments = computed(() => {
  if (!jurisdictionResult.value) return []
  const remoteIds = jurisdictionResult.value.remoteDepartments.map(d => d.id)
  return departments.value.filter(d => remoteIds.includes(d.id))
})

const onServiceItemChange = () => {
  jurisdictionResult.value = null
}

const checkJurisdiction = async () => {
  const valid = await step0FormRef.value?.validate().catch(() => false)
  if (!valid) return

  checking.value = true
  try {
    jurisdictionResult.value = await crossRegionApi.checkJurisdiction(
      step0Data.value.serviceItemId!,
      step0Data.value.applicantLocation,
    )
    currentStep.value = 1
  } catch (error) {
    console.error('属地校验失败', error)
  } finally {
    checking.value = false
  }
}

const handleFileChange = (_file: any, list: any[]) => {
  fileList.value = list
}

const handleFileRemove = (_file: any, list: any[]) => {
  fileList.value = list
}

const submitApplication = async () => {
  const valid = await step2FormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (step2Data.value.localDepartmentId === step2Data.value.remoteDepartmentId) {
    ElMessage.error('属地部门与异地受理部门不能相同')
    return
  }

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('userId', String(userStore.user!.id))
    formData.append('serviceItemId', String(step0Data.value.serviceItemId))
    formData.append('localDepartmentId', String(step2Data.value.localDepartmentId))
    formData.append('remoteDepartmentId', String(step2Data.value.remoteDepartmentId))
    formData.append('applicantLocation', step0Data.value.applicantLocation)
    formData.append('formData', JSON.stringify({ applyReason: step2Data.value.applyReason }))
    formData.append('materialsInfo', JSON.stringify(fileList.value.map((f, i) => ({
      name: f.name,
      required: true,
      fieldName: `material_${i}`,
    }))))

    fileList.value.forEach((f, i) => {
      if (f.raw) {
        formData.append(`material_${i}`, f.raw)
      }
    })

    const result = await crossRegionApi.createApplication(formData)
    submittedNo.value = result.crossRegionNo
    currentStep.value = 3
    ElMessage.success('异地办理申请提交成功')
  } catch (error) {
    console.error('提交失败', error)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const [items, depts] = await Promise.all([
      getServiceItems(),
      crossRegionApi.getDepartments(),
    ])
    serviceItems.value = items
    departments.value = depts
  } catch (error) {
    console.error('加载数据失败', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-container {
  max-width: 960px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 24px 0 16px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}
</style>
