import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MaterialPreviewRule } from '../../entities/material-preview-rule.entity';
import { MaterialTemplateService } from '../material-template/material-template.service';
import { ServiceItem } from '../../entities/service-item.entity';

export interface ValidationError {
  fieldName: string;
  fieldLabel: string;
  errorType: 'missing' | 'invalid_type' | 'size_exceeded' | 'pattern_mismatch' | 'custom_rule';
  message: string;
  severity: 'error' | 'warning';
}

export interface PreviewResult {
  passed: boolean;
  totalErrors: number;
  totalWarnings: number;
  errors: ValidationError[];
  missingMaterials: ValidationError[];
  summary: string;
}

export interface PreviewRequest {
  serviceItemId: number;
  materialTemplateId?: number;
  formData: Record<string, any>;
  uploadedFiles: Array<{
    fieldName: string;
    originalName: string;
    size: number;
    mimeType: string;
  }>;
  materialsInfo: Array<{
    name: string;
    required: boolean;
    fieldName: string;
  }>;
}

@Injectable()
export class MaterialPreviewService {
  constructor(
    @InjectRepository(MaterialPreviewRule) private readonly ruleRepository: Repository<MaterialPreviewRule>,
    @InjectRepository(ServiceItem) private readonly itemRepository: Repository<ServiceItem>,
    private readonly templateService: MaterialTemplateService,
  ) {}

  async getRulesByServiceItem(serviceItemId: number, materialTemplateId?: number) {
    const where: any = { serviceItemId, enabled: true };
    if (materialTemplateId) {
      where.materialTemplateId = materialTemplateId;
    }
    const rules = await this.ruleRepository.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rules;
  }

  async getOrCreateRules(serviceItemId: number, materialTemplateId?: number) {
    let rules = await this.getRulesByServiceItem(serviceItemId, materialTemplateId);
    
    if (rules.length === 0 && materialTemplateId) {
      const template = await this.templateService.findOne(materialTemplateId);
      if (template && template.fields) {
        rules = await this.createRulesFromTemplate(serviceItemId, materialTemplateId, template.fields);
      }
    }

    if (rules.length === 0) {
      const item = await this.itemRepository.findOne({ where: { id: serviceItemId } });
      if (item && item.materials) {
        try {
          const materialList = JSON.parse(item.materials);
          rules = await this.createRulesFromMaterialList(serviceItemId, materialList);
        } catch (e) {
          // ignore parse error
        }
      }
    }

    return rules;
  }

  private async createRulesFromTemplate(serviceItemId: number, templateId: number, fields: any[]) {
    const rules: MaterialPreviewRule[] = [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const rule = this.ruleRepository.create({
        serviceItemId,
        materialTemplateId: templateId,
        fieldName: field.key,
        fieldLabel: field.label,
        required: field.required ?? true,
        allowedFileTypes: field.allowedFileTypes || ['.jpg', '.jpeg', '.png', '.pdf'],
        maxFileSize: field.maxFileSize || 10,
        validationPattern: field.pattern || '',
        validationMessage: field.patternMessage || '',
        sortOrder: i,
        enabled: true,
      });
      rules.push(await this.ruleRepository.save(rule));
    }
    return rules;
  }

  private async createRulesFromMaterialList(serviceItemId: number, materialList: any[]) {
    const rules: MaterialPreviewRule[] = [];
    for (let i = 0; i < materialList.length; i++) {
      const mat = materialList[i];
      const rule = this.ruleRepository.create({
        serviceItemId,
        fieldName: `material_${i}`,
        fieldLabel: mat.name,
        required: mat.required ?? true,
        allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxFileSize: 10,
        sortOrder: i,
        enabled: true,
      });
      rules.push(await this.ruleRepository.save(rule));
    }
    return rules;
  }

  async createRule(data: Partial<MaterialPreviewRule>) {
    const rule = this.ruleRepository.create(data);
    return this.ruleRepository.save(rule);
  }

  async updateRule(id: number, data: Partial<MaterialPreviewRule>) {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('预审规则不存在');
    }
    await this.ruleRepository.update(id, data);
    return this.ruleRepository.findOne({ where: { id } });
  }

  async deleteRule(id: number) {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('预审规则不存在');
    }
    await this.ruleRepository.delete(id);
    return { success: true };
  }

  async preview(request: PreviewRequest): Promise<PreviewResult> {
    const rules = await this.getOrCreateRules(request.serviceItemId, request.materialTemplateId);
    
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const uploadedFileMap = new Map<string, any>();
    
    for (const file of request.uploadedFiles) {
      uploadedFileMap.set(file.fieldName, file);
    }

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const uploadedFile = uploadedFileMap.get(rule.fieldName);
      const hasFile = !!uploadedFile;

      if (rule.required && !hasFile) {
        const materialInfo = request.materialsInfo.find(m => m.fieldName === rule.fieldName);
        errors.push({
          fieldName: rule.fieldName,
          fieldLabel: materialInfo?.name || rule.fieldLabel,
          errorType: 'missing',
          message: `缺少必需材料：${materialInfo?.name || rule.fieldLabel}`,
          severity: 'error',
        });
        continue;
      }

      if (hasFile) {
        if (rule.allowedFileTypes && rule.allowedFileTypes.length > 0) {
          const ext = '.' + uploadedFile.originalName.split('.').pop()?.toLowerCase();
          if (!rule.allowedFileTypes.includes(ext)) {
            errors.push({
              fieldName: rule.fieldName,
              fieldLabel: rule.fieldLabel,
              errorType: 'invalid_type',
              message: `${rule.fieldLabel} 文件格式不正确，仅支持 ${rule.allowedFileTypes.map(t => t.toUpperCase()).join('/')} 格式`,
              severity: 'error',
            });
          }
        }

        const maxSize = (rule.maxFileSize || 10) * 1024 * 1024;
        if (uploadedFile.size > maxSize) {
          errors.push({
            fieldName: rule.fieldName,
            fieldLabel: rule.fieldLabel,
            errorType: 'size_exceeded',
            message: `${rule.fieldLabel} 文件大小超出限制，最大允许 ${rule.maxFileSize || 10}MB`,
            severity: 'error',
          });
        }

        if (rule.validationPattern) {
          try {
            const pattern = new RegExp(rule.validationPattern);
            if (!pattern.test(uploadedFile.originalName)) {
              errors.push({
                fieldName: rule.fieldName,
                fieldLabel: rule.fieldLabel,
                errorType: 'pattern_mismatch',
                message: rule.validationMessage || `${rule.fieldLabel} 文件命名不符合要求`,
                severity: 'error',
              });
            }
          } catch (e) {
            // ignore invalid regex
          }
        }

        if (rule.customRule) {
          const customResult = this.evaluateCustomRule(rule.customRule, uploadedFile);
          if (customResult !== true) {
            errors.push({
              fieldName: rule.fieldName,
              fieldLabel: rule.fieldLabel,
              errorType: 'custom_rule',
              message: typeof customResult === 'string' ? customResult : `${rule.fieldLabel} 不符合自定义规则`,
              severity: 'error',
            });
          }
        }
      }
    }

    const missingMaterials = errors.filter(e => e.errorType === 'missing');
    const passed = errors.length === 0;

    let summary = '';
    if (passed) {
      summary = `材料预审通过，共 ${request.uploadedFiles.length} 份材料符合要求`;
    } else {
      const errorCount = errors.length;
      const missingCount = missingMaterials.length;
      const parts: string[] = [];
      if (missingCount > 0) {
        parts.push(`缺少 ${missingCount} 份必需材料`);
      }
      if (errorCount - missingCount > 0) {
        parts.push(`${errorCount - missingCount} 份材料不符合要求`);
      }
      summary = `预审未通过：${parts.join('，')}。请补充和修正后重新提交。`;
    }

    return {
      passed,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errors: [...errors, ...warnings],
      missingMaterials,
      summary,
    };
  }

  private evaluateCustomRule(rule: string, file: any): boolean | string {
    try {
      const fn = new Function('file', 'return ' + rule);
      return fn(file);
    } catch (e) {
      return true;
    }
  }

  async batchCreateRules(serviceItemId: number, materialTemplateId: number | undefined, rulesData: Partial<MaterialPreviewRule>[]) {
    await this.ruleRepository.delete({ serviceItemId, ...(materialTemplateId ? { materialTemplateId } : {}) });
    
    const savedRules: MaterialPreviewRule[] = [];
    for (let i = 0; i < rulesData.length; i++) {
      const ruleData = {
        ...rulesData[i],
        serviceItemId,
        materialTemplateId,
        sortOrder: i,
      };
      const rule = this.ruleRepository.create(ruleData);
      savedRules.push(await this.ruleRepository.save(rule));
    }
    return savedRules;
  }
}
