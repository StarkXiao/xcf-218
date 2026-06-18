-- 政务办事大厅 - MySQL 数据库初始化脚本
-- 执行前请确保已安装 MySQL 并启动服务

-- 创建数据库
CREATE DATABASE IF NOT EXISTS government_service
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 选择数据库
USE government_service;

-- 注意：数据表会由 TypeORM 在应用启动时自动创建
-- 本脚本仅用于创建数据库和设置权限

-- 可选：创建专用用户（根据需要修改密码）
-- CREATE USER 'gov_service'@'localhost' IDENTIFIED BY 'your_password';
-- GRANT ALL PRIVILEGES ON government_service.* TO 'gov_service'@'localhost';
-- FLUSH PRIVILEGES;

SELECT '数据库 government_service 创建成功！' AS message;
