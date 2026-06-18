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

        <div class="risk-assessment-section">
          <div class="risk-header">
            <span class="risk-title">
              <el-icon><Shield /></el-icon>
              风险评估
            </span>
            <el-tag :type="riskLevelTagType" size="large" effect="dark">
              {{ riskLevelText }}
            </el-tag>
          </div>

          <div class="risk-progress">
            <div class="risk-progress-bar">
              <div
                class="risk-progress-fill"
                :style="{ width: `${riskAssessment.level * 20}%`, background: riskLevelColor }"
              ></div>
            </div>
            <div class="risk-level-labels">
              <span>低</span>
              <span>中</span>
              <span>高</span>
              <span>较高</span>
              <span>极高</span>
            </div>
          </div>

          <div v-if="riskAssessment.tips.length > 0" class="risk-details">
            <div class="risk-details-title">风险提示项（{{ riskAssessment.tips.length }}项）</div>
            <ul class="risk-tip-list">
              <li v-for="(tip, index) in riskDetails" :key="index" :class="`risk-level-${tip.level}`">
                <div class="risk-tip-icon">
                  <el-icon :size="16"><WarningFilled /></el-icon>
                </div>
                <div class="risk-tip-content">
                  <div class="risk-tip-text">{{ tip.text }}</div>
                  <div v-if="tip.suggestion" class="risk-tip-suggestion">
                    <span>💡 建议：</span>{{ tip.suggestion }}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div v-else class="risk-safe">
            <el-icon color="#67c23a" :size="24"><CircleCheck /></el-icon>
            <span>当前申请风险较低，请继续保持</span>
          </div>

          <div class="risk-acceptance">
            <div class="acceptance-title">
              <el-icon><CheckList /></el-icon>
              可用性验收标准
            </div>
            <el-row :gutter="12">
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.idCardComplete }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.idCardComplete" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>身份证材料完整</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.hasAuthorizationLetter }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.hasAuthorizationLetter" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>上传授权委托书</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.idCardValid }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.idCardValid" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>身份证号格式正确</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.phoneValid }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.phoneValid" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>手机号格式正确</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.hasRelation }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.hasRelation" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>说明与委托人关系</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div :class="['acceptance-item', { passed: acceptanceChecks.scopeReasonable }]">
                  <el-icon>
                    <CircleCheck v-if="acceptanceChecks.scopeReasonable" />
                    <CircleClose v-else />
                  </el-icon>
                  <span>授权范围合理</span>
                </div>
              </el-col>
            </el-row>
          </div>
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
import { ArrowLeft, Upload, Warning, WarningFilled, Shield, CircleCheck, CircleClose, CheckList } from '@element-plus/icons-vue'
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

const acceptanceChecks = computed(() => {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  const phoneRegex = /^1[3-9]\d{9}$/
  const scope = formData.authorizationScope || ''
  const scopeReasonable = scope.length > 0 && !scope.includes('全部') && !scope.includes('所有') && scope.length <= 200

  return {
    idCardComplete: idCardFrontFile.value.length > 0 && idCardBackFile.value.length > 0,
    hasAuthorizationLetter: authorizationLetterFile.value.length > 0,
    idCardValid: formData.proxyIdCard && idCardRegex.test(formData.proxyIdCard),
    phoneValid: formData.proxyPhone && phoneRegex.test(formData.proxyPhone),
    hasRelation: !!formData.proxyRelation,
    scopeReasonable: scopeReasonable,
  }
})

const riskDetails = computed(() => {
  const details: Array<{ text: string; suggestion: string; level: number }> = []

  if (idCardFrontFile.value.length === 0 || idCardBackFile.value.length === 0) {
    details.push({
      text: '未上传完整身份证明材料',
      suggestion: '请上传代办人身份证正反面照片，确保身份信息可核验',
      level: 2,
    })
  }

  if (authorizationLetterFile.value.length === 0) {
    details.push({
      text: '未上传授权委托书',
      suggestion: '建议上传双方签字的授权委托书，明确授权范围和期限',
      level: 2,
    })
  }

  if (!formData.proxyRelation) {
    details.push({
      text: '未说明与委托人的关系',
      suggestion: '请选择与委托人的关系，便于审核人员判断代理合理性',
      level: 1,
    })
  }

  const scope = formData.authorizationScope || ''
  if (scope && (scope.includes('全部') || scope.includes('所有') || scope.length > 200)) {
    details.push({
      text: '授权范围过大',
      suggestion: '建议明确具体授权事项，避免使用"全部"、"所有"等宽泛表述',
      level: 2,
    })
  }

  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  if (formData.proxyIdCard && !idCardRegex.test(formData.proxyIdCard)) {
    details.push({
      text: '身份证号格式不正确',
      suggestion: '请输入有效的18位身份证号码，最后一位可为X',
      level: 3,
    })
  }

  if (formData.proxyPhone && !/^1[3-9]\d{9}$/.test(formData.proxyPhone)) {
    details.push({
      text: '手机号格式需核验',
      suggestion: '请输入11位有效手机号码，便于联系代办人',
      level: 1,
    })
  }

  return details.sort((a, b) => b.level - a.level)
})

const riskAssessment = computed(() => {
  const totalLevel = riskDetails.value.reduce((sum, item) => sum + item.level, 0)
  return {
    level: Math.min(totalLevel, 5),
    tips: riskDetails.value.map(d => d.text),
  }
})

const riskLevelTagType = computed(() => {
  const level = riskAssessment.value.level
  if (level <= 1) return 'success'
  if (level <= 2) return 'warning'
  if (level <= 3) return 'warning'
  return 'danger'
})

const riskLevelColor = computed(() => {
  const level = riskAssessment.value.level
  if (level <= 1) return '#67c23a'
  if (level <= 2) return '#e6a23c'
  if (level <= 3) return '#e6a23c'
  if (level <= 4) return '#f56c6c'
  return '#f56c6c'
})

const riskLevelText = computed(() => {
  const level = riskAssessment.value.level
  const texts = ['极低风险', '低风险', '中风险', '较高风险', '高风险', '极高风险']
  return texts[level] || '未知'
})

const updateStep = () => {
  const allFilled = formData.proxyName && formData.proxyIdCard && formData.proxyPhone &&
                    formData.proxyRelation && formData.authorizationScope
  if (!allFilled) {
    currentStep.value = 1
  } else if (idCardFrontFile.value.length === 0 || idCardBackFile.value.length === 0) {
    currentStep.value = 2
  } else {
    currentStep.value = 3
  }
}

watch(
  () => [
    formData.proxyName,
    formData.proxyIdCard,
    formData.proxyPhone,
    formData.proxyRelation,
    formData.authorizationScope,
    idCardFrontFile.value.length,
    idCardBackFile.value.length,
    authorizationLetterFile.value.length,
  ],
  () => {
    updateStep()
  },
  { deep: true, immediate: true }
)

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
      await ElMessageBox.confirm(
        `当前申请风险等级为 ${riskAssessment.value.level} 级，确认提交吗？`,
        '风险提示',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消',
          dangerouslyUseHTMLString: true,
          message: `
            <div style="margin-bottom: 12px; font-weight: 500; color: #e6a23c;">
              风险提示：
            </div>
            <ul style="margin: 0; padding-left: 20px; color: #606266;">
              ${riskAssessment.value.tips.map(tip => `<li style="margin-bottom: 4px;">${tip}</li>`).join('')}
            </ul>
            <div style="margin-top: 12px; padding: 8px 12px; background: #fdf6ec; border-radius: 4px; font-size: 13px; color: #e6a23c;">
              请仔细核对代办人信息，确保授权范围清晰明确，避免法律风险。
            </div>
          `,
        }
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
.risk-assessment-section {
  margin: 24px 0;
  padding: 20px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.risk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.risk-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.risk-progress {
  margin-bottom: 20px;
}

.risk-progress-bar {
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.risk-progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease, background 0.3s ease;
}

.risk-level-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.risk-details {
  margin-bottom: 20px;
}

.risk-details-title {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.risk-tip-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.risk-tip-list li {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 6px;
  border-left: 3px solid #e6a23c;
}

.risk-tip-list li.risk-level-1 {
  border-left-color: #67c23a;
}

.risk-tip-list li.risk-level-2 {
  border-left-color: #e6a23c;
}

.risk-tip-list li.risk-level-3 {
  border-left-color: #f56c6c;
}

.risk-tip-icon {
  color: #e6a23c;
  margin-top: 2px;
  flex-shrink: 0;
}

.risk-level-1 .risk-tip-icon {
  color: #67c23a;
}

.risk-level-3 .risk-tip-icon {
  color: #f56c6c;
}

.risk-tip-content {
  flex: 1;
}

.risk-tip-text {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  margin-bottom: 4px;
}

.risk-tip-suggestion {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.risk-tip-suggestion span {
  color: #67c23a;
  font-weight: 500;
}

.risk-safe {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: #f0f9eb;
  border-radius: 6px;
  color: #67c23a;
  margin-bottom: 20px;
}

.risk-acceptance {
  padding-top: 16px;
  border-top: 1px dashed #dcdfe6;
}

.acceptance-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.acceptance-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
  color: #c0c4cc;
  font-size: 13px;
  transition: all 0.2s ease;
}

.acceptance-item.passed {
  color: #67c23a;
  background: #f0f9eb;
}

.acceptance-item .el-icon {
  flex-shrink: 0;
}

.acceptance-item:not(.passed) .el-icon {
  color: #c0c4cc;
}
</style>
