-- =============================================
-- 部门流转审批 - 数据库初始化补充脚本
-- =============================================

USE government_service;

-- =============================================
-- 1. 创建审批角色用户（如果种子服务未创建）
-- =============================================
-- 注意：这些用户会在应用启动时由 seed.service.ts 自动创建
-- 本脚本仅用于手动初始化或重置

-- 办事员
INSERT IGNORE INTO users (username, password, name, idCard, phone, role, createdAt, updatedAt)
VALUES ('clerk', 'clerk123', '李办事员', '110101199001010002', '13800000002', 'clerk', NOW(), NOW());

-- 主管
INSERT IGNORE INTO users (username, password, name, idCard, phone, role, createdAt, updatedAt)
VALUES ('supervisor', 'super123', '王主管', '110101199001010003', '13800000003', 'supervisor', NOW(), NOW());

-- 科长
INSERT IGNORE INTO users (username, password, name, idCard, phone, role, createdAt, updatedAt)
VALUES ('manager', 'manager123', '赵科长', '110101199001010004', '13800000004', 'manager', NOW(), NOW());

-- 处长
INSERT IGNORE INTO users (username, password, name, idCard, phone, role, createdAt, updatedAt)
VALUES ('director', 'director123', '钱处长', '110101199001010005', '13800000005', 'director', NOW(), NOW());

-- =============================================
-- 2. 创建审批流程定义
-- =============================================
-- 部门流转审批流程
INSERT IGNORE INTO approval_flows (code, name, description, serviceItemId, isActive, createdAt, updatedAt)
VALUES ('DEPT_APPROVAL', '部门流转审批', '多部门串行审批流程，适用于需要多层级审核的业务事项', NULL, 1, NOW(), NOW());

-- 获取刚插入的流程ID
SET @flow_id = LAST_INSERT_ID();

-- =============================================
-- 3. 创建审批节点
-- =============================================
-- 窗口受理 - 办事员
INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@flow_id, '窗口受理', 1, 'clerk', '政务服务中心', '窗口办事员对申请材料进行初步核验', 1, 1, 0, NOW(), NOW());

-- 业务科室初审 - 主管
INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@flow_id, '业务科室初审', 2, 'supervisor', '业务科室', '业务科室主管对申请内容进行初步审核', 1, 1, 0, NOW(), NOW());

-- 科室领导复核 - 科长
INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@flow_id, '科室领导复核', 3, 'manager', '业务科室', '科室负责人对初审结果进行复核', 1, 1, 0, NOW(), NOW());

-- 分管领导终审 - 处长
INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@flow_id, '分管领导终审', 4, 'director', '局领导', '分管局领导进行最终审批', 1, 0, 1, NOW(), NOW());

-- =============================================
-- 4. 简易审批流程
-- =============================================
INSERT IGNORE INTO approval_flows (code, name, description, serviceItemId, isActive, createdAt, updatedAt)
VALUES ('SIMPLE_APPROVAL', '简易审批', '两级审批流程，适用于简单业务事项', NULL, 1, NOW(), NOW());

SET @simple_flow_id = LAST_INSERT_ID();

INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@simple_flow_id, '办事员审核', 1, 'clerk', '政务服务中心', '窗口办事员审核', 1, 1, 0, NOW(), NOW());

INSERT IGNORE INTO approval_nodes (flowId, nodeName, nodeOrder, role, department, description, allowReject, allowTransfer, isFinal, createdAt, updatedAt)
VALUES (@simple_flow_id, '主管审批', 2, 'supervisor', '业务科室', '业务科室主管审批', 1, 0, 1, NOW(), NOW());

-- =============================================
-- 5. 查询验证
-- =============================================
SELECT '审批流程初始化完成' AS message;

-- 查询所有审批流程
SELECT f.id, f.code, f.name, f.description, COUNT(n.id) as node_count, f.isActive
FROM approval_flows f
LEFT JOIN approval_nodes n ON f.id = n.flowId
GROUP BY f.id;

-- 查询所有审批节点
SELECT f.code as flow_code, f.name as flow_name, n.nodeOrder, n.nodeName, n.role, n.department, n.allowReject, n.allowTransfer, n.isFinal
FROM approval_flows f
JOIN approval_nodes n ON f.id = n.flowId
ORDER BY f.id, n.nodeOrder;

-- 查询所有用户角色
SELECT id, username, name, role FROM users ORDER BY id;
