<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card>
      <div class="page-header">
        <h2 class="page-title">代办人申请</h2>
        <el-tag type="info">委托他人代办业务</el-tag>
      </div>

      <el-alert
        title="请确保代办人信息真实有效，授权范围需明确具体"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      />

      <el-steps :active="currentStep" finish-status="success" style="margin-bottom: 40px">
        <el-step title="填写信息" />
        <el-step title="上传材料" />
        <el-step title="提交申请" />
      </el-steps>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="140px"
        style="max-width: 900px; margin: 0 auto"
      >
        <div class="form-section-title">委托人信息</div>

        <el-form-item label="委托人姓名">
          <el-input :value="userStore.user?.name" disabled />
        </el-form-item>

        <el-form-item label="委托人身份证">
          <el-input :value="userStore.user?.idCard" disabled />
        </el-form-item>

        <div class="form-section-title">代办人信息</div>

        <el-form-item label="代办人姓名" prop="proxyName">
          <el-input v-model="formData.proxyName" placeholder="请输入代办人真实姓名" />
        </el-form-item>

        <el-form-item label="代办人身份证" prop="proxyIdCard">
          <el-input v-model="formData.proxyIdCard" placeholder="请输入18位身份证号" maxlength="18" />
        </el-form-item>

        <el-form-item label="代办人手机号" prop="proxyPhone">
          <el-input v-model="formData.proxyPhone" placeholder="请输入手机号码" maxlength="11" />
        </el-form-item>

        <el-form-item label="与委托人关系" prop="proxyRelation">
          <el-select v-model="formData.proxyRelation" placeholder="请选择关系" style="width: 100%">
            <el-option label="配偶" value="配偶" />
            <el-option label="父母" value="父母" />
            <el-option label="子女" value="子女" />
            <el-option label="兄弟姐妹" value="兄弟姐妹" />
            <el-option label="朋友" value="朋友" />
            <el-option label="同事" value="同事" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item label="授权范围" prop="authorizationScope">
          <el-input
            v-model="formData.authorizationScope"
            type="textarea"
            :rows="4"
            placeholder="请详细说明授权代办的具体事项和范围，例如：代为办理社保缴纳、代为领取证件等"
          />
          <div class="form-tip">
            <el-icon color="#e6a23c"><Warning /></el-icon>
            建议明确具体授权事项，避免"全部"、"所有"等宽泛表述
          </div>
        </el-form-item>

        <div class="form-section-title">身份证明材料上传</div>
        <p class="form-tip" style="margin-top: -16px; margin-bottom: 20px">
          <el-icon color="#e6a23c"><Warning /></el-icon>
          请确保上传的材料清晰、完整，标有 <span style="color: #f56c6c">*</span> 为必需材料，支持 JPG/PNG/PDF 格式
        </p>

        <el-form-item label="代办人身份证正面" prop="idCardFront">
          <el-upload
            v-model:file-list="idCardFrontFile"
            :auto-upload="false"
            :limit="1"
            accept=".jpg,.jpeg,.png,.pdf"
            :on-change="handleIdCardFrontChange"
            :on-remove="handleIdCardFrontRemove"
          >
            <el-button type="primary" :icon="Upload">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">上传代办人身份证正面照片</div>
            </template>
          </el-upload>
          <span style="color: #f56c6c; margin-left: 8px">*</span>
        </el-form-item>

        <el-form-item label="代办人身份证背面" prop="idCardBack">
          <el-upload
            v-model:file-list="idCardBackFile"
            :auto-upload="false"
            :limit="1"
            accept=".jpg,.jpeg,.png,.pdf"
            :on-change="handleIdCardBackChange"
            :on-remove="handleIdCardBackRemove"
          >
            <el-button type="primary" :icon="Upload">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">上传代办人身份证背面照片</div>
            </template>
          </el-upload>
          <span style="color: #f56c6c; margin-left: 8px">*</span>
        </el-form-item>

        <el-form-item label="授权委托书">
          <el-upload
            v-model:file-list="authorizationLetterFile"
            :auto-upload="false"
            :limit="1"
            accept=".jpg,.jpeg,.png,.pdf"
            :on-change="handleLetterChange"
            :on-remove="handleLetterRemove"
          >
            <el-button type="primary" :icon="Upload">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">上传双方签字的授权委托书（建议上传）</div>
            </template>
          </el-upload>
        </el-form-item>

        <div v-if="riskAssessment.level > 0" class="risk-warning">
          <el-alert
            :title="`风险提示（风险等级：${riskAssessment.level}级）`"
            type="warning"
            :closable="false"
            show-icon
          >
            <ul class="risk-tip-list">
              <li v-for="(tip, index) in riskAssessment.tips" :key="index">
                <el-icon color="#e6a23c"><WarningFilled /></el-icon>
                {{ tip }}
              </li>
            </ul>
          </el-alert>
        </div>

        <el-form-item>
          <el-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
            提交申请
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadFile } from 'element-plus'
import { ArrowLeft, Upload, Warning, WarningFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { createProxyApplication } from '@/api/proxy'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const currentStep = ref(1)
const formRef = ref<FormInstance>()

const formData = reactive({
  proxyName: '',
  proxyIdCard: '',
  proxyPhone: '',
  proxyRelation: '',
  authorizationScope: '',
})

const idCardFrontFile = ref<UploadFile[]>([])
const idCardBackFile = ref<UploadFile[]>([])
const authorizationLetterFile = ref<UploadFile[]>([])

const formRules: FormRules = {
  proxyName: [{ required: true, message: '请输入代办人姓名', trigger: 'blur' }],
  proxyIdCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '身份证号格式不正确', trigger: 'blur' },
  ],
  proxyPhone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号码格式不正确', trigger: 'blur' },
  ],
  proxyRelation: [{ required: true, message: '请选择与委托人关系', trigger: 'change' }],
  authorizationScope: [{ required: true, message: '请填写授权范围', trigger: 'blur' }],
}

const riskAssessment = computed(() => {
  const tips: string[] = []
  let level = 0

  if (idCardFrontFile.value.length === 0 || idCardBackFile.value.length === 0) {
    level += 2
    tips.push('未上传完整身份证明材料')
  }

  if (authorizationLetterFile.value.length === 0) {
    level += 2
    tips.push('未上传授权委托书')
  }

  if (!formData.proxyRelation) {
    level += 1
    tips.push('未说明与委托人的关系')
  }

  const scope = formData.authorizationScope || ''
  if (scope.includes('全部') || scope.includes('所有') || scope.length > 200) {
    level += 2
    tips.push('授权范围过大，建议明确具体授权事项')
  }

  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  if (formData.proxyIdCard && !idCardRegex.test(formData.proxyIdCard)) {
    level += 3
    tips.push('身份证号格式不正确')
  }

  if (formData.proxyPhone && formData.proxyPhone.length !== 11) {
    level += 1
    tips.push('手机号格式需核验')
  }

  return {
    level: Math.min(level, 5),
    tips,
  }
})

watch([() => formData.proxyIdCard, () => formData.proxyPhone, () => formData.authorizationScope,
       () => formData.proxyRelation, () => idCardFrontFile.value.length,
       () => idCardBackFile.value.length, () => authorizationLetterFile.value.length], () => {
  const allFilled = formData.proxyName && formData.proxyIdCard && formData.proxyPhone &&
                    formData.proxyRelation && formData.authorizationScope
  if (allFilled) {
    currentStep.value = 2
  }
  if (allFilled && idCardFrontFile.value.length > 0 && idCardBackFile.value.length > 0) {
    currentStep.value = 3
  }
})

const handleIdCardFrontChange = (file: UploadFile) => {
  idCardFrontFile.value = [file]
}
const handleIdCardFrontRemove = () => {
  idCardFrontFile.value = []
}

const handleIdCardBackChange = (file: UploadFile) => {
  idCardBackFile.value = [file]
}
const handleIdCardBackRemove = () => {
  idCardBackFile.value = []
}

const handleLetterChange = (file: UploadFile) => {
  authorizationLetterFile.value = [file]
}
const handleLetterRemove = () => {
  authorizationLetterFile.value = []
}

const handleSubmit = async () => {
  if (!formRef.value || !userStore.user) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (idCardFrontFile.value.length === 0 || idCardBackFile.value.length === 0) {
    ElMessage.warning('请上传代办人身份证正反面照片')
    return
  }

  if (riskAssessment.value.level >= 3) {
    try {
      await ElMessage.confirm(
        `当前申请风险等级为 ${riskAssessment.value.level} 级，确认提交吗？\n风险提示：${riskAssessment.value.tips.join('；')}`,
        '风险提示',
        { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }

  const formDataObj = new FormData()

  formDataObj.append('principalId', String(userStore.user.id))
  formDataObj.append('proxyName', formData.proxyName)
  formDataObj.append('proxyIdCard', formData.proxyIdCard)
  formDataObj.append('proxyPhone', formData.proxyPhone)
  formDataObj.append('proxyRelation', formData.proxyRelation)
  formDataObj.append('authorizationScope', formData.authorizationScope)

  if (idCardFrontFile.value[0]?.raw) {
    formDataObj.append('idCardFront', idCardFrontFile.value[0].raw, idCardFrontFile.value[0].name)
  }
  if (idCardBackFile.value[0]?.raw) {
    formDataObj.append('idCardBack', idCardBackFile.value[0].raw, idCardBackFile.value[0].name)
  }
  if (authorizationLetterFile.value[0]?.raw) {
    formDataObj.append('authorizationLetter', authorizationLetterFile.value[0].raw, authorizationLetterFile.value[0].name)
  }

  submitting.value = true
  try {
    const result = await createProxyApplication(formDataObj)
    ElMessage.success('代办人申请提交成功')
    router.push(`/proxy-applications/${result.id}`)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 24px 0 16px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}
.form-tip {
  font-size: 13px;
  color: #606266;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.risk-warning {
  margin: 20px 0;
}
.risk-tip-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}
.risk-tip-list li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e6a23c;
  margin-bottom: 4px;
}
</style>
