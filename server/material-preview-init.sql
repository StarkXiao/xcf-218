-- =============================================
-- 材料预审功能 - 数据库初始化脚本
-- =============================================

USE government_service;

-- =============================================
-- 1. 创建材料预审规则表
-- =============================================
CREATE TABLE IF NOT EXISTS material_preview_rules (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
  serviceItemId INT NOT NULL COMMENT '所属事项ID',
  materialTemplateId INT NULL COMMENT '关联材料模板ID',
  fieldName VARCHAR(100) NOT NULL COMMENT '字段标识',
  fieldLabel VARCHAR(200) NOT NULL COMMENT '字段显示名称',
  required TINYINT(1) DEFAULT 1 COMMENT '是否必填',
  allowedFileTypes VARCHAR(500) NULL COMMENT '允许的文件类型，多个用逗号分隔',
  maxFileSize INT DEFAULT 10 COMMENT '最大文件大小(MB)',
  validationPattern TEXT NULL COMMENT '文件名校验正则表达式',
  validationMessage TEXT NULL COMMENT '校验失败提示信息',
  customRule TEXT NULL COMMENT '自定义校验规则',
  enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  sortOrder INT DEFAULT 0 COMMENT '排序',
  createdBy INT NULL COMMENT '创建人ID',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_service_item (serviceItemId),
  INDEX idx_template (materialTemplateId),
  FOREIGN KEY (serviceItemId) REFERENCES service_items(id) ON DELETE CASCADE,
  FOREIGN KEY (materialTemplateId) REFERENCES material_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='材料预审规则表';

-- =============================================
-- 2. 为现有事项生成示例预审规则
-- =============================================
-- 说明：首次使用时，系统会自动从材料模板或事项材料配置中生成规则
-- 也可以通过管理后台手动配置

-- 示例：为身份证办理事项添加预审规则
-- INSERT INTO material_preview_rules 
--   (serviceItemId, materialTemplateId, fieldName, fieldLabel, required, allowedFileTypes, maxFileSize, sortOrder, enabled)
-- VALUES
--   (1, NULL, 'idcard_front', '身份证正面照片', 1, '.jpg,.jpeg,.png,.pdf', 10, 1, 1),
--   (1, NULL, 'idcard_back', '身份证反面照片', 1, '.jpg,.jpeg,.png,.pdf', 10, 2, 1),
--   (1, NULL, 'household', '户口本照片', 1, '.jpg,.jpeg,.png,.pdf', 10, 3, 1);

-- =============================================
-- 3. 查询验证
-- =============================================
SELECT '材料预审规则表创建成功' AS message;

-- 查询所有预审规则
SELECT 
  r.id,
  r.fieldName,
  r.fieldLabel,
  r.required,
  r.allowedFileTypes,
  r.maxFileSize,
  r.enabled,
  r.sortOrder,
  s.name AS serviceItemName,
  t.name AS templateName
FROM material_preview_rules r
LEFT JOIN service_items s ON r.serviceItemId = s.id
LEFT JOIN material_templates t ON r.materialTemplateId = t.id
ORDER BY r.serviceItemId, r.sortOrder;
