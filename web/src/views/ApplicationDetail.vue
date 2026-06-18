<template>
  <div class="page-container" v-loading="loading">
    <el-button type="primary" link style="margin-bottom: 16px" @click="$router.back()">
      <el-icon><ArrowLeft /></el-icon> 返回
    </el-button>

    <el-card v-if="application">
      <div class="detail-header">
        <div>
          <h2 class="detail-title">{{ application.serviceItem?.name }}</h2>
          <p class="detail-subtitle">
            申请编号：{{ application.applicationNo }}
            <el-tag :type="getStatusType(application.status)" style="margin-left: 12px">
              {{ getStatusText(application.status) }}
            </el-tag>
            <el-tag v-if="application.isResubmit" type="info" style="margin-left: 8px">
              重新提交 · 第{{ application.resubmitCount }}次
            </el-tag>
          </p>
          <p v-if="application.originalApplicationId" class="resubmit-tip">
            <el-icon><Refresh /></el-icon>
            本申请基于原申请重新提交：
            <router-link :to="`/applications/${application.originalApplicationId}`" class="link-text">
              查看原申请
            </router-link>
          </p>
        </div>
        <div class="header-right">
          <p class="apply-time">提交时间：{{ formatDate(application.createdAt) }}</p>
          <div class="action-buttons" v-if="!userStore.isAdmin">
            <el-button
              v-if="canWithdrawFlag"
              type="warning"
              :disabled="withdrawLoading"
              @click="openWithdrawDialog"
            >
              <el-icon><Warning /></el-icon> 申请撤回
            </el-button>
            <el-button
              v-if="canResubmitFlag"
              type="success"
              :disabled="resubmitLoading"
              @click="openResubmitDialog"
            >
              <el-icon><RefreshRight /></el-icon> 重新提交
            </el-button>
          </div>
        </div>
      </div>

      <el-divider />

      <el-row :gutter="20">
        <el-col :span="14">
          <div v-if="application.status === 'withdraw_pending'" class="content-section">
            <el-alert
              title="撤回申请待审批"
              type="warning"
              show-icon
              :description="`您提交的撤回申请正在等待管理员审批，请耐心等待结果。撤回原因：${currentWithdrawal?.reason || ''}`"
            />
          </div>

          <div class="content-section">
            <h3 class="section-title">申请信息</h3>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="申请人">{{ application.formData.name }}</el-descriptions-item>
              <el-descriptions-item label="身份证号">{{ application.formData.idCard }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ application.formData.phone }}</el-descriptions-item>
              <el-descriptions-item label="联系地址">{{ application.formData.address }}</el-descriptions-item>
              <el-descriptions-item label="申请事由" :span="2">{{ application.formData.reason }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div v-if="application.status === 'supplementing'" class="content-section">
            <h3 class="section-title">需补充材料</h3>
            <el-alert
              :title="currentSupplement?.rejectReason || '管理员要求补充以下材料'"
              type="error"
              show-icon
              style="margin-bottom: 16px"
            />
            <el-table :data="rejectedMaterials" style="width: 100%">
              <el-table-column prop="materialName" label="材料名称" width="200" />
              <el-table-column prop="reason" label="退回原因" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag v-if="isMaterialUploaded(row.fieldName)" type="success">已补充</el-tag>
                  <el-tag v-else type="danger">待补充</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="280">
                <template #default="{ row }">
                  <el-button type="primary" link @click="viewVersionHistory(row.fieldName, row.materialName)">
                    历史版本
                  </el-button>
                  <el-button
                    v-if="!isMaterialUploaded(row.fieldName)"
                    type="success"
                    link
                    @click="openUpload(row.fieldName, row.materialName)"
                  >
                    补充上传
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="content-section">
            <div class="section-header">
              <h3 class="section-title">提交材料</h3>
              <div class="section-actions">
                <el-tag v-if="fileStats" size="small" type="info">
                  共 {{ fileStats.currentCount }} 份材料
                  <span v-if="fileStats.hasMultipleVersions">
                    ，{{ Object.keys(fileStats.versionsByField).filter(k => fileStats.versionsByField[k] > 1).length }} 份有多版本
                  </span>
                </el-tag>
              </div>
            </div>
            <el-table :data="currentMaterialFiles" style="width: 100%" v-if="currentMaterialFiles.length > 0">
              <el-table-column type="index" label="序号" width="80" />
              <el-table-column prop="materialName" label="材料名称" />
              <el-table-column prop="originalName" label="文件名" show-overflow-tooltip />
              <el-table-column label="版本" width="100">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.version > 1 ? 'warning' : 'info'">v{{ row.version }}</el-tag>
                  <el-button
                    v-if="getVersionCount(row.fieldName) > 1"
                    type="primary"
                    link
                    size="small"
                    style="margin-left: 4px"
                    @click="viewVersionHistory(row.fieldName, row.materialName)"
                  >
                    ({{ getVersionCount(row.fieldName) }})
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column label="来源" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 'reused'" type="success" size="small">复用</el-tag>
                  <el-tag v-else-if="row.status === 'new'" type="primary" size="small">新增</el-tag>
                  <el-tag v-else type="info" size="small">原始</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
                  <el-tag v-else-if="row.isCurrent" type="success">当前</el-tag>
                  <el-tag v-else type="info">历史</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="文件大小" width="120">
                <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
              </el-table-column>
              <el-table-column label="是否必需" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                    {{ row.required ? '必需' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="280" fixed="right">
                <template #default="{ row }">
                  <el-dropdown trigger="click" @command="(cmd: string) => handleMaterialAction(cmd, row)">
                    <el-button type="primary" link>
                      操作 <el-icon><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="preview">
                          <el-icon><View /></el-icon> 预览
                        </el-dropdown-item>
                        <el-dropdown-item command="download">
                          <el-icon><Download /></el-icon> 下载
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="reupload"
                          :disabled="!canEditMaterial(row)"
                        >
                          <el-icon><Upload /></el-icon> 重新上传
                        </el-dropdown-item>
                        <el-dropdown-item command="history">
                          <el-icon><Clock /></el-icon> 历史版本
                        </el-dropdown-item>
                        <el-dropdown-item
                          command="delete"
                          :disabled="!canEditMaterial(row) || row.required"
                          divided
                        >
                          <el-icon><Delete /></el-icon> 删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无上传的材料文件" />
          </div>

          <div v-if="withdrawalRecords.length > 0" class="content-section">
            <h3 class="section-title">撤回记录</h3>
            <el-table :data="withdrawalRecords" style="width: 100%">
              <el-table-column prop="createdAt" label="申请时间" width="180">
                <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
              </el-table-column>
              <el-table-column prop="reason" label="撤回原因" show-overflow-tooltip />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag v-if="row.status === 'pending'" type="warning">待审批</el-tag>
                  <el-tag v-else-if="row.status === 'approved'" type="success">已批准</el-tag>
                  <el-tag v-else-if="row.status === 'rejected'" type="danger">已驳回</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="reviewComment" label="审批意见" show-overflow-tooltip />
              <el-table-column prop="reviewedAt" label="审批时间" width="180">
                <template #default="{ row }">{{ row.reviewedAt ? formatDate(row.reviewedAt) : '-' }}</template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="application.reviewComment" class="content-section">
            <h3 class="section-title">审核意见</h3>
            <el-alert
              :title="application.reviewComment"
              :type="application.status === 'rejected' || application.status === 'supplementing' ? 'error' : 'success'"
              show-icon
            />
          </div>

          <div v-if="certificate" class="content-section">
            <h3 class="section-title">电子证明</h3>
            <el-card class="cert-card">
              <div class="cert-info">
                <div>
                  <p class="cert-no">证明编号：{{ certificate.certificateNo }}</p>
                  <p class="cert-type">证明类型：{{ certificate.certificateType }}</p>
                  <p class="cert-date">发证日期：{{ formatDate(certificate.issuedAt || certificate.createdAt) }}</p>
                </div>
                <div class="cert-actions">
                  <el-button type="primary" @click="viewCertificate">查看详情</el-button>
                  <el-button type="success" @click="previewCert">预览</el-button>
                  <el-button type="primary" plain @click="downloadCert">下载</el-button>
                </div>
              </div>
            </el-card>
          </div>
        </el-col>

        <el-col :span="10">
          <div class="content-section">
            <h3 class="section-title">办理进度</h3>
            <el-timeline>
              <el-timeline-item
                v-for="(record, index) in sortedRecords"
                :key="record.id"
                :timestamp="formatDate(record.createdAt)"
                placement="top"
                :type="getTimelineType(record, index)"
                :hollow="index === 0"
              >
                <div class="timeline-content">
                  <h4>{{ record.step }}</h4>
                  <p v-if="record.remark">{{ record.remark }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="withdrawVisible" title="申请撤回" width="500px" destroy-on-close>
      <el-form :model="withdrawForm" label-width="100px">
        <el-alert
          title="撤回说明"
          type="warning"
          show-icon
          style="margin-bottom: 16px"
          :description="`撤回后申请将暂停办理流程，需管理员审批。撤回批准后，您可选择重新提交申请。已使用撤回次数：${application?.withdrawalCount || 0}/3`"
        />
        <el-form-item label="撤回原因" required>
          <el-input
            v-model="withdrawForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明撤回原因（如：信息有误、材料不全等）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="withdrawVisible = false">取消</el-button>
        <el-button type="warning" :loading="withdrawLoading" @click="submitWithdraw">
          确认撤回
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resubmitVisible" title="重新提交申请" width="900px" destroy-on-close>
      <div v-if="application">
        <el-alert
          title="重新提交说明"
          type="success"
          show-icon
          style="margin-bottom: 16px"
          :description="`您正在基于原申请（编号：${application.applicationNo}）重新提交。系统将保留历史办理进度，您可选择复用已上传的材料以节省时间。`"
        />

        <el-tabs v-model="resubmitTab" style="margin-top: 16px">
          <el-tab-pane label="复用材料" name="materials">
            <div class="material-reuse-section">
              <h4 style="margin-bottom: 12px">
                请选择需要复用的材料
                <span style="color: #909399; font-weight: normal; font-size: 13px">
                  （未选择的材料需重新上传）
                </span>
              </h4>
              <el-table :data="reusableFiles" style="width: 100%" @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="55" />
                <el-table-column prop="materialName" label="材料名称" />
                <el-table-column prop="originalName" label="文件名" />
                <el-table-column label="版本" width="80">
                  <template #default="{ row }">v{{ row.version }}</template>
                </el-table-column>
                <el-table-column label="文件大小" width="120">
                  <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
                </el-table-column>
                <el-table-column label="是否必需" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                      {{ row.required ? '必需' : '选填' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="预览" width="100">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click.stop="openPreview(row)">
                      预览
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              <p style="margin-top: 12px; color: #606266; font-size: 13px">
                已选择复用 <strong>{{ selectedFileIds.length }}</strong> 份材料
              </p>
            </div>
          </el-tab-pane>
          <el-tab-pane label="确认信息" name="confirm">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="事项名称">{{ application.serviceItem?.name }}</el-descriptions-item>
              <el-descriptions-item label="原申请编号">{{ application.applicationNo }}</el-descriptions-item>
              <el-descriptions-item label="复用材料数">{{ selectedFileIds.length }} 份</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag type="success">将生成新申请编号，重新进入审核流程</el-tag>
              </el-descriptions-item>
            </el-descriptions>
            <el-alert
              title="进度补记说明"
              type="info"
              show-icon
              style="margin-top: 16px"
              description="系统将自动补记原申请的关键办理进度，方便您追溯历史记录。原申请数据将保留。"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="resubmitVisible = false">取消</el-button>
        <el-button type="success" :loading="resubmitLoading" @click="goToResubmit">
          前往提交页面
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="材料预览" width="80%" :close-on-click-modal="false">
      <div v-if="previewFileData" class="preview-container">
        <div class="preview-header">
          <div class="preview-info">
            <span class="preview-name">{{ previewFileData.materialName }}</span>
            <el-tag size="small" style="margin-left: 8px">v{{ previewFileData.version }}</el-tag>
            <span class="preview-subtitle" style="margin-left: 12px">
              {{ previewFileData.originalName }} · {{ formatFileSize(previewFileData.fileSize) }}
            </span>
          </div>
          <div class="preview-actions">
            <el-button type="primary" link @click="downloadFile(previewFileData)">
              <el-icon><Download /></el-icon> 下载
            </el-button>
          </div>
        </div>
        <div class="preview-content">
          <img v-if="previewFileData.mimeType.startsWith('image/')" :src="previewUrl" alt="预览" class="preview-image" />
          <iframe
            v-else-if="previewFileData.mimeType === 'application/pdf'"
            :src="previewUrl"
            class="preview-pdf"
          ></iframe>
          <div v-else class="no-preview">
            <el-icon :size="48"><Document /></el-icon>
            <p>该文件类型不支持在线预览，请下载后查看</p>
            <el-button type="primary" style="margin-top: 12px" @click="downloadFile(previewFileData)">
              下载文件
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="versionVisible" title="版本历史记录" width="1000px" destroy-on-close>
      <div>
        <div class="version-header">
          <h4 style="margin-bottom: 0">{{ currentMaterialName }} - 历史版本</h4>
          <div v-if="versionList.length >= 2" class="version-compare">
            <span style="margin-right: 8px; color: #909399; font-size: 13px">
              选择两个版本进行比对：
            </span>
            <el-select
              v-model="compareVersion1"
              placeholder="版本1"
              size="small"
              style="width: 120px; margin-right: 8px"
            >
              <el-option
                v-for="v in versionList"
                :key="v.id"
                :label="`v${v.version}`"
                :value="v.id"
              />
            </el-select>
            <span style="margin: 0 8px">VS</span>
            <el-select
              v-model="compareVersion2"
              placeholder="版本2"
              size="small"
              style="width: 120px; margin-left: 8px"
            >
              <el-option
                v-for="v in versionList"
                :key="v.id"
                :label="`v${v.version}`"
                :value="v.id"
              />
            </el-select>
            <el-button
              type="primary"
              size="small"
              style="margin-left: 12px"
              :disabled="!compareVersion1 || !compareVersion2 || compareVersion1 === compareVersion2"
              @click="handleCompareVersions"
            >
              <el-icon><Refresh /></el-icon> 版本比对
            </el-button>
          </div>
        </div>
        <el-table :data="versionList" style="width: 100%; margin-top: 16px">
          <el-table-column label="版本" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isCurrent ? 'success' : 'info'" size="small">v{{ row.version }}</el-tag>
              <el-tag v-if="row.isCurrent" type="success" size="small" style="margin-left: 4px">当前</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="originalName" label="文件名" show-overflow-tooltip />
          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.mimeType.startsWith('image/')" type="success" size="small">图片</el-tag>
              <el-tag v-else-if="row.mimeType === 'application/pdf'" type="primary" size="small">PDF</el-tag>
              <el-tag v-else type="info" size="small">其他</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.status === 'rejected'" type="danger">已退回</el-tag>
              <el-tag v-else-if="row.status === 'reused'" type="success">复用</el-tag>
              <el-tag v-else-if="row.status === 'new'" type="primary">新增</el-tag>
              <el-tag v-else type="info">正常</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" width="180">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openPreview(row)">预览</el-button>
              <el-button type="primary" link @click="downloadFile(row)">下载</el-button>
              <el-button
                v-if="!row.isCurrent && canRevertVersion(row)"
                type="warning"
                link
                @click="handleRevertVersion(row)"
              >
                恢复此版本
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="compareVisible" title="版本比对结果" width="900px" destroy-on-close>
      <div v-if="versionDiff">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="材料名称" :span="2">{{ versionDiff.materialName }}</el-descriptions-item>
          <el-descriptions-item label="比对版本">
            <el-tag>v{{ versionDiff.version1.version }}</el-tag>
            <span style="margin: 0 8px">→</span>
            <el-tag type="warning">v{{ versionDiff.version2.version }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="时间间隔">
            {{ formatTimeDiff(versionDiff.differences.uploadTimeDiff) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-table :data="compareItems" style="width: 100%; margin-top: 16px">
          <el-table-column prop="label" label="对比项" width="150" />
          <el-table-column label="版本 1">
            <template #default="{ row }">
              <span :class="{ 'changed': row.changed }">{{ row.v1 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="版本 2">
            <template #default="{ row }">
              <span :class="{ 'changed': row.changed }">{{ row.v2 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="差异" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.changed" type="warning">有变化</el-tag>
              <el-tag v-else type="success">无变化</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="canPreviewBoth" class="compare-preview">
          <h4 style="margin: 20px 0 12px">并排预览</h4>
          <div class="compare-preview-grid">
            <div class="compare-preview-item">
              <div class="compare-preview-title">
                版本 v{{ versionDiff.version1.version }}
                <el-tag size="small" style="margin-left: 8px">{{ versionDiff.version1.originalName }}</el-tag>
              </div>
              <div class="compare-preview-content">
                <img
                  v-if="versionDiff.version1.mimeType.startsWith('image/')"
                  :src="getPreviewUrl(versionDiff.version1.id)"
                  class="compare-preview-img"
                />
                <iframe
                  v-else-if="versionDiff.version1.mimeType === 'application/pdf'"
                  :src="getPreviewUrl(versionDiff.version1.id)"
                  class="compare-preview-pdf"
                ></iframe>
                <div v-else class="no-preview-small">
                  <el-icon><Document /></el-icon>
                  <span>不支持预览</span>
                </div>
              </div>
            </div>
            <div class="compare-preview-item">
              <div class="compare-preview-title">
                版本 v{{ versionDiff.version2.version }}
                <el-tag size="small" type="warning" style="margin-left: 8px">
                  {{ versionDiff.version2.originalName }}
                </el-tag>
              </div>
              <div class="compare-preview-content">
                <img
                  v-if="versionDiff.version2.mimeType.startsWith('image/')"
                  :src="getPreviewUrl(versionDiff.version2.id)"
                  class="compare-preview-img"
                />
                <iframe
                  v-else-if="versionDiff.version2.mimeType === 'application/pdf'"
                  :src="getPreviewUrl(versionDiff.version2.id)"
                  class="compare-preview-pdf"
                ></iframe>
                <div v-else class="no-preview-small">
                  <el-icon><Document /></el-icon>
                  <span>不支持预览</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="reuploadVisible" title="重新上传材料" width="600px" destroy-on-close>
      <div>
        <p><strong>材料名称：</strong>{{ reuploadMaterial?.materialName }}</p>
        <p v-if="reuploadMaterial" style="margin: 8px 0">
          <strong>当前版本：</strong>v{{ reuploadMaterial.version }} · {{ reuploadMaterial.originalName }}
        </p>
        <el-alert
          title="上传说明"
          type="info"
          :closable="false"
          style="margin: 16px 0"
          description="重新上传后将生成新版本（v{{ (reuploadMaterial?.version || 0) + 1 }}），旧版本仍保留在历史记录中。"
        />
        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          :on-change="handleReuploadFileChange"
          :on-exceed="handleExceed"
          accept=".jpg,.jpeg,.png,.pdf"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">支持 JPG/PNG/PDF 格式，单个文件不超过 10MB</div>
          </template>
        </el-upload>
        <div v-if="reuploadFileObj" class="file-selected-info">
          <el-icon color="#67c23a"><Check /></el-icon>
          <span>{{ reuploadFileObj.name }} ({{ formatFileSize(reuploadFileObj.size) }})</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="reuploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="reuploadLoading" @click="submitReupload">
          确认上传
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="uploadVisible" title="补充上传材料" width="600px" destroy-on-close>
      <div>
        <p><strong>材料名称：</strong>{{ uploadMaterialName }}</p>
        <p style="margin: 12px 0">请选择要上传的文件（支持 JPG/PNG/PDF，不超过 10MB）：</p>
        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          accept=".jpg,.jpeg,.png,.pdf"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitUpload">提交上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Refresh,
  Document,
  Upload,
  Warning,
  RefreshRight,
  Download,
  View,
  Delete,
  Clock,
  ArrowDown,
  Check,
  Close,
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import {
  getApplicationById,
  downloadMaterial,
  requestWithdraw,
  canWithdraw,
  canResubmit,
  getWithdrawalRecords,
} from '@/api/application'
import {
  getSupplementByApplicationId,
  getMaterialVersions,
  uploadSupplementMaterial,
} from '@/api/supplement-center'
import {
  getPreviewUrl,
  reuploadMaterialFile,
  deleteMaterialFile,
  getMaterialVersions as getUploadVersions,
  compareMaterialVersions,
  getUploadFileStats,
} from '@/api/upload'
import { getCertificates, previewCertificate, downloadCertificate } from '@/api/certificate'
import type {
  Application,
  MaterialFile,
  SupplementRecord,
  Certificate,
  WithdrawalRecord,
} from '@/types'
import type { VersionDiff, FileStats } from '@/api/upload'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const application = ref<Application | null>(null)
const previewVisible = ref(false)
const previewFileData = ref<MaterialFile | null>(null)
const previewUrl = ref('')

const supplementRecords = ref<SupplementRecord[]>([])
const currentSupplement = ref<SupplementRecord | null>(null)
const rejectedMaterials = ref<any[]>([])

const versionVisible = ref(false)
const versionList = ref<MaterialFile[]>([])
const currentMaterialName = ref('')
const currentFieldName = ref('')
const compareVersion1 = ref<number | null>(null)
const compareVersion2 = ref<number | null>(null)

const compareVisible = ref(false)
const versionDiff = ref<VersionDiff | null>(null)

const reuploadVisible = ref(false)
const reuploadMaterial = ref<MaterialFile | null>(null)
const reuploadFileObj = ref<File | null>(null)
const reuploadLoading = ref(false)

const uploadVisible = ref(false)
const uploadFieldName = ref('')
const uploadMaterialName = ref('')
const uploadFileObj = ref<File | null>(null)
const submitting = ref(false)

const certificate = ref<Certificate | null>(null)

const withdrawVisible = ref(false)
const withdrawLoading = ref(false)
const withdrawForm = reactive({
  reason: '',
})

const resubmitVisible = ref(false)
const resubmitLoading = ref(false)
const resubmitTab = ref('materials')
const selectedFileIds = ref<number[]>([])

const withdrawalRecords = ref<WithdrawalRecord[]>([])
const currentWithdrawal = computed(() => {
  return withdrawalRecords.value.find(w => w.status === 'pending')
})

const canWithdrawFlag = ref(false)
const canResubmitFlag = ref(false)

const fileStats = ref<FileStats | null>(null)

const currentMaterialFiles = computed(() => {
  if (!application.value?.materialFiles) return []
  return application.value.materialFiles.filter(f => f.isCurrent)
})

const reusableFiles = computed(() => {
  if (!application.value?.materialFiles) return []
  return application.value.materialFiles.filter(
    f => f.isCurrent && f.status !== 'rejected'
  )
})

const sortedRecords = computed(() => {
  if (!application.value?.progressRecords) return []
  return [...application.value.progressRecords].reverse()
})

const canPreviewBoth = computed(() => {
  if (!versionDiff.value) return false
  const m1 = versionDiff.value.version1.mimeType
  const m2 = versionDiff.value.version2.mimeType
  return (
    (m1.startsWith('image/') || m1 === 'application/pdf') &&
    (m2.startsWith('image/') || m2 === 'application/pdf')
  )
})

const compareItems = computed(() => {
  if (!versionDiff.value) return []
  const d = versionDiff.value.differences
  return [
    {
      label: '文件名',
      v1: versionDiff.value.version1.originalName,
      v2: versionDiff.value.version2.originalName,
      changed: d.fileNameChanged,
    },
    {
      label: '文件大小',
      v1: formatFileSize(versionDiff.value.version1.fileSize),
      v2: formatFileSize(versionDiff.value.version2.fileSize) + (d.sizeDiff !== 0 ? ` (${d.sizeDiff > 0 ? '+' : ''}${formatFileSize(Math.abs(d.sizeDiff))})` : ''),
      changed: d.fileSizeChanged,
    },
    {
      label: '文件类型',
      v1: versionDiff.value.version1.mimeType,
      v2: versionDiff.value.version2.mimeType,
      changed: d.mimeTypeChanged,
    },
    {
      label: '上传时间',
      v1: formatDate(versionDiff.value.version1.createdAt),
      v2: formatDate(versionDiff.value.version2.createdAt),
      changed: true,
    },
  ]
})

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'warning',
    accepted: 'info',
    reviewing: 'primary',
    approved: 'success',
    rejected: 'danger',
    completed: 'success',
    supplementing: 'warning',
    withdraw_pending: 'warning',
    withdrawn: 'info',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '已提交',
    accepted: '已受理',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    completed: '已完成',
    supplementing: '待补件',
    withdraw_pending: '撤回待审批',
    withdrawn: '已撤回',
  }
  return map[status] || status
}

const getTimelineType = (record: any, index: number) => {
  if (index === 0) return 'primary'
  if (record.status === 'failed') return 'danger'
  if (record.step.includes('历史进度')) return 'info'
  return 'success'
}

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatTimeDiff = (ms: number) => {
  if (ms < 0) ms = -ms
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} 天 ${hours % 24} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes % 60} 分钟`
  return `${minutes} 分钟`
}

const loadData = async () => {
  loading.value = true
  try {
    const appId = Number(route.params.id)
    application.value = await getApplicationById(appId)

    try {
      fileStats.value = await getUploadFileStats(appId)
    } catch (e) {
      // ignore stats error
    }

    if (userStore.user?.id && !userStore.isAdmin) {
      const [withdrawCheck, resubmitCheck] = await Promise.all([
        canWithdraw(appId, userStore.user.id),
        canResubmit(appId, userStore.user.id),
      ])
      canWithdrawFlag.value = withdrawCheck.canWithdraw
      canResubmitFlag.value = resubmitCheck.canResubmit
    }

    withdrawalRecords.value = await getWithdrawalRecords(appId)

    if (application.value.status === 'supplementing') {
      supplementRecords.value = await getSupplementByApplicationId(appId)
      currentSupplement.value = supplementRecords.value.find((r) => r.status === 'pending') || null
      if (currentSupplement.value) {
        rejectedMaterials.value = currentSupplement.value.rejectedMaterials || []
      }
    }

    if (application.value.status === 'approved' || application.value.status === 'completed') {
      if (userStore.user?.id) {
        const certs = await getCertificates(userStore.user.id)
        certificate.value = certs.find(c => c.applicationId === appId) || null
      }
    }
  } finally {
    loading.value = false
  }
}

const isMaterialUploaded = (fieldName: string) => {
  if (!application.value?.materialFiles) return false
  const file = application.value.materialFiles.find(
    (f) => f.fieldName === fieldName && f.isCurrent
  )
  return file && file.status !== 'rejected'
}

const getVersionCount = (fieldName: string) => {
  if (!application.value?.materialFiles) return 0
  return application.value.materialFiles.filter(f => f.fieldName === fieldName).length
}

const canEditMaterial = (row: MaterialFile) => {
  if (!application.value) return false
  if (userStore.isAdmin) return true
  const isOwner = application.value.userId === userStore.user?.id
  const editableStatuses = ['submitted', 'accepted', 'reviewing', 'supplementing']
  return isOwner && editableStatuses.includes(application.value.status)
}

const canRevertVersion = (row: MaterialFile) => {
  if (!application.value) return false
  const editableStatuses = ['submitted', 'accepted', 'reviewing', 'supplementing']
  if (!editableStatuses.includes(application.value.status)) return false
  if (userStore.isAdmin) return true
  return application.value.userId === userStore.user?.id
}

const openPreview = (file: MaterialFile) => {
  previewFileData.value = file
  previewUrl.value = getPreviewUrl(file.id)
  previewVisible.value = true
}

const downloadFile = (file: MaterialFile) => {
  window.open(downloadMaterial(file.id), '_blank')
}

const viewVersionHistory = async (fieldName: string, materialName: string) => {
  if (!application.value) return
  currentMaterialName.value = materialName
  currentFieldName.value = fieldName
  try {
    versionList.value = await getUploadVersions(application.value.id, fieldName)
  } catch {
    versionList.value = await getMaterialVersions(application.value.id, fieldName)
  }
  compareVersion1.value = null
  compareVersion2.value = null
  versionVisible.value = true
}

const handleCompareVersions = async () => {
  if (!application.value || !compareVersion1.value || !compareVersion2.value) return
  try {
    versionDiff.value = await compareMaterialVersions(
      application.value.id,
      currentFieldName.value,
      compareVersion1.value,
      compareVersion2.value,
    )
    compareVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '版本比对失败')
  }
}

const handleRevertVersion = async (row: MaterialFile) => {
  if (!reuploadMaterial || !application.value) return
  try {
    await ElMessageBox.confirm(
      `确定要将「${currentMaterialName.value}」恢复到 v${row.version} 版本吗？这将创建一个新版本。`,
      '确认恢复版本',
      { type: 'warning' },
    )
    ElMessage.info('请通过重新上传功能上传该版本文件')
  } catch {
    // user cancelled
  }
}

const handleMaterialAction = (command: string, row: MaterialFile) => {
  switch (command) {
    case 'preview':
      openPreview(row)
      break
    case 'download':
      downloadFile(row)
      break
    case 'reupload':
      openReupload(row)
      break
    case 'history':
      viewVersionHistory(row.fieldName, row.materialName)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const openReupload = (row: MaterialFile) => {
  reuploadMaterial.value = row
  reuploadFileObj.value = null
  reuploadVisible.value = true
}

const handleReuploadFileChange = (f: any) => {
  reuploadFileObj.value = f.raw
}

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

const submitReupload = async () => {
  if (!userStore.user?.id || !reuploadMaterial.value) return
  if (!reuploadFileObj.value) {
    ElMessage.warning('请选择上传文件')
    return
  }

  reuploadLoading.value = true
  try {
    await reuploadMaterialFile(
      reuploadMaterial.value.id,
      reuploadFileObj.value,
      userStore.user.id,
    )
    ElMessage.success('材料重新上传成功')
    reuploadVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    reuploadLoading.value = false
  }
}

const handleDelete = async (row: MaterialFile) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除材料「${row.materialName}」吗？删除后无法恢复。`,
      '确认删除',
      { type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteMaterialFile(row.id, userStore.user?.id)
    ElMessage.success('材料删除成功')
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败')
  }
}

const openUpload = (fieldName: string, materialName: string) => {
  uploadFieldName.value = fieldName
  uploadMaterialName.value = materialName
  uploadFileObj.value = null
  uploadVisible.value = true
}

const handleFileChange = (f: any) => {
  uploadFileObj.value = f.raw
}

const submitUpload = async () => {
  if (!userStore.user?.id || !currentSupplement.value || !application.value) return
  if (!uploadFileObj.value) {
    ElMessage.warning('请选择上传文件')
    return
  }

  submitting.value = true
  try {
    const material = rejectedMaterials.value.find(
      (m) => m.fieldName === uploadFieldName.value
    )
    await uploadSupplementMaterial(
      currentSupplement.value.id,
      uploadFieldName.value,
      uploadMaterialName.value,
      uploadFileObj.value,
      userStore.user.id,
      material?.required ?? false
    )
    ElMessage.success('材料上传成功')
    uploadVisible.value = false
    await loadData()
  } finally {
    submitting.value = false
  }
}

const openWithdrawDialog = () => {
  withdrawForm.reason = ''
  withdrawVisible.value = true
}

const submitWithdraw = async () => {
  if (!application.value || !userStore.user?.id) return
  if (!withdrawForm.reason.trim()) {
    ElMessage.warning('请输入撤回原因')
    return
  }

  await ElMessageBox.confirm(
    '确定要提交撤回申请吗？撤回后申请将暂停办理，需管理员审批。',
    '确认撤回',
    { type: 'warning' }
  )

  withdrawLoading.value = true
  try {
    await requestWithdraw({
      applicationId: application.value.id,
      userId: userStore.user.id,
      reason: withdrawForm.reason,
    })
    ElMessage.success('撤回申请已提交，等待管理员审批')
    withdrawVisible.value = false
    await loadData()
  } finally {
    withdrawLoading.value = false
  }
}

const openResubmitDialog = () => {
  selectedFileIds.value = reusableFiles.value.filter(f => f.required).map(f => f.id)
  resubmitTab.value = 'materials'
  resubmitVisible.value = true
}

const handleSelectionChange = (selection: MaterialFile[]) => {
  selectedFileIds.value = selection.map(f => f.id)
}

const goToResubmit = () => {
  if (!application.value) return

  const requiredFiles = reusableFiles.value.filter(f => f.required)
  const missingRequired = requiredFiles.filter(f => !selectedFileIds.value.includes(f.id))
  if (missingRequired.length > 0) {
    ElMessage.warning(`必需材料「${missingRequired[0].materialName}」必须选择复用或重新上传`)
    resubmitTab.value = 'materials'
    return
  }

  const params = new URLSearchParams({
    originalId: String(application.value.id),
    retainedFiles: JSON.stringify(selectedFileIds.value),
  })
  router.push(`/apply/${application.value.serviceItemId}?${params.toString()}`)
}

const viewCertificate = () => {
  if (certificate.value) {
    router.push(`/certificates/${certificate.value.id}`)
  }
}

const previewCert = () => {
  if (certificate.value && userStore.user?.id) {
    window.open(previewCertificate(certificate.value.id, certificate.value.userId, userStore.user.id), '_blank')
  }
}

const downloadCert = () => {
  if (certificate.value && userStore.user?.id) {
    ElMessage.success('开始下载证明文件')
    window.location.href = downloadCertificate(certificate.value.id, certificate.value.userId, userStore.user.id)
  }
}

onMounted(loadData)
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detail-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.detail-subtitle {
  font-size: 14px;
  color: #606266;
}
.resubmit-tip {
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.link-text {
  color: #409eff;
  text-decoration: none;
}
.link-text:hover {
  text-decoration: underline;
}
.apply-time {
  font-size: 13px;
  color: #909399;
  text-align: right;
}
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}
.action-buttons {
  display: flex;
  gap: 8px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}
.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.content-section {
  margin-bottom: 24px;
}
.timeline-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.timeline-content p {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}
.preview-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.preview-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}
.preview-subtitle {
  font-size: 13px;
  color: #909399;
}
.preview-container {
  display: flex;
  flex-direction: column;
}
.preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  background: #f5f7fa;
  border-radius: 4px;
}
.preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
}
.preview-pdf {
  width: 100%;
  height: 600px;
  border: none;
}
.no-preview {
  text-align: center;
  color: #909399;
}
.no-preview p {
  margin-top: 12px;
}
.cert-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7dd3fc;
}
.cert-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cert-no {
  font-size: 16px;
  font-weight: 600;
  color: #0369a1;
  margin-bottom: 8px;
}
.cert-type,
.cert-date {
  font-size: 14px;
  color: #0284c7;
  margin-bottom: 4px;
}
.cert-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.material-reuse-section {
  max-height: 500px;
  overflow-y: auto;
}
.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.version-compare {
  display: flex;
  align-items: center;
}
.file-selected-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9eb;
  border-radius: 4px;
  font-size: 13px;
  color: #67c23a;
}
.compare-preview {
  margin-top: 20px;
}
.compare-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.compare-preview-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}
.compare-preview-title {
  padding: 8px 12px;
  background: #f5f7fa;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 1px solid #ebeef5;
}
.compare-preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: #fff;
  padding: 12px;
}
.compare-preview-img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}
.compare-preview-pdf {
  width: 100%;
  height: 400px;
  border: none;
}
.no-preview-small {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
  gap: 8px;
}
:deep(.changed) {
  color: #e6a23c;
  font-weight: 500;
}
</style>
