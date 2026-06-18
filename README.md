# 政务办事大厅系统

一个完整的政务线上办事大厅系统，包含前端和后端，支持事项查询、材料提交、进度跟踪、消息提醒、管理员审核等功能。

## 技术栈

### 前端
- Vue 3 + TypeScript
- Pinia（状态管理）
- Vue Router（路由）
- Element Plus（UI组件库）
- Axios（HTTP请求）
- Vite（构建工具）

### 后端
- Node.js + NestJS
- TypeORM（ORM框架）
- MySQL（默认数据库）
- Multer（文件上传）

## 项目结构

```
xcf-218/
├── server/                 # 后端服务（NestJS）
│   ├── src/
│   │   ├── entities/       # 数据库实体
│   │   ├── modules/        # 业务模块
│   │   ├── main.ts         # 入口文件
│   │   └── app.module.ts   # 根模块
│   ├── uploads/            # 上传文件存储目录（自动创建）
│   │   └── materials/      # 材料文件目录
│   └── package.json
├── web/                    # 前端应用（Vue3）
│   ├── src/
│   │   ├── api/            # API接口层
│   │   ├── views/          # 页面组件
│   │   ├── stores/         # Pinia状态管理
│   │   ├── router/         # 路由配置
│   │   ├── types/          # TypeScript类型定义
│   │   └── utils/          # 工具函数
│   └── package.json
├── start.sh                # 一键启动脚本
└── README.md               # 项目文档
```

## 快速开始

### 前置条件
- Node.js >= 16.x
- MySQL >= 5.7
- npm 或 yarn 或 pnpm

### MySQL 配置

在启动后端服务前，请确保 MySQL 服务已启动，并创建数据库：

```sql
CREATE DATABASE government_service DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

默认数据库连接配置（可在 `server/src/app.module.ts` 中修改）：
- 主机：127.0.0.1
- 端口：3306
- 用户名：root
- 密码：root123456
- 数据库：government_service

### 启动后端服务

```bash
cd server
npm install
npm run start:dev
```

后端服务将在 http://localhost:3000 启动

### 启动前端应用

```bash
cd web
npm install
npm run dev
```

前端应用将在 http://localhost:5173 启动

### 一键启动

```bash
./start.sh
```

## 功能模块

### 1. 事项查询
- 浏览所有可办理的政务服务事项
- 支持按关键字搜索、按分类筛选
- 查看事项详情（办理条件、所需材料、办理时限等）

### 2. 材料提交
- 选择事项后在线填写申请表单
- 上传所需的证明材料（支持 JPG/PNG/PDF 格式）
- 材料文件真实存储到服务器 `uploads/materials` 目录
- 数据库记录文件元信息（文件名、大小、MIME类型、存储路径）
- 表单校验确保信息完整性

### 3. 进度跟踪
- 查看个人所有申请记录
- 实时追踪每个申请的办理进度
- 时间线展示各环节处理状态

### 4. 消息提醒
- 申请状态变更实时通知
- 消息已读/未读状态管理
- 点击消息可直接跳转至相关申请

### 5. 管理员审核
- 管理后台数据统计概览
- 审核待办申请（通过/驳回）
- 可预览和下载用户上传的材料文件
- 图片和 PDF 支持在线预览
- 填写审核意见
- 完整的审核流程记录

### 6. 接口层
- RESTful API 设计规范
- 统一响应格式
- CORS 跨域支持
- 参数校验
- FormData 支持文件上传

## 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | user | user123 |
| 管理员 | admin | admin123 |

## 主流程演示

### 用户端流程（提交材料）
1. 使用 user/user123 登录
2. 进入「事项查询」，选择一个事项（如「社保卡申领」）
3. 点击「立即办理」，填写申请信息
4. 上传所需的材料文件（身份证照片、参保证明等）
5. 提交申请，材料文件会自动上传到服务器
6. 提交成功后，可在「进度跟踪」中查看申请状态
7. 在「申请详情」中可预览和下载已上传的材料
8. 在「消息中心」接收状态变更通知

### 管理员端流程（审核材料）
1. 使用 admin/admin123 登录
2. 进入「管理后台」，查看待审核申请列表
3. 点击「审核」进入申请详情页
4. 查看申请信息，**在线预览或下载用户上传的材料文件**
5. 执行审核操作：
   - **开始审核** → 标记为审核中
   - **审核通过** → 申请通过
   - **驳回申请** → 申请被驳回，需填写原因
   - **办理完成** → 申请完成
6. 每次操作后，用户端会实时收到相应的消息通知

## 材料上传说明

### 后端存储
- 文件物理存储：`server/uploads/materials/` 目录
- 文件命名：`时间戳-随机字符串.扩展名`
- 数据库表：`material_files`
- 记录信息：材料名称、原文件名、存储文件名、存储路径、文件大小、MIME类型、是否必需

### 前端上传
- 使用 Element Plus Upload 组件
- 支持拖拽和点击选择
- 文件格式限制：JPG/PNG/PDF
- 文件大小限制：单文件 10MB
- 提交时使用 FormData 一次性上传所有文件

### 文件预览和下载
- 图片类型：支持在线弹窗预览
- PDF 类型：支持 iframe 嵌入预览
- 其他类型：提示下载后查看
- 所有类型均可下载

## 数据库表结构

### users（用户表）
- id, username, password, name, idCard, phone, role, createdAt, updatedAt

### service_items（办事事项表）
- id, name, code, category, description, requirements, materials, processingDays, active

### applications（申请表）
- id, applicationNo, userId, serviceItemId, formData, materials, status, reviewerId, reviewComment

### material_files（材料文件表）
- id, applicationId, materialName, originalName, fileName, filePath, fileSize, mimeType, required

### progress_records（进度记录表）
- id, applicationId, step, status, remark, operatorId

### messages（消息表）
- id, userId, title, content, read, type, applicationId

## 状态流转

申请状态流转：
```
已提交 (submitted) → 审核中 (reviewing) → 已通过 (approved) → 已完成 (completed)
                                          ↘ 已驳回 (rejected)
```

## API 接口列表

### 用户模块
- POST /api/users/login - 用户登录
- GET /api/users - 获取所有用户
- GET /api/users/:id - 获取用户详情

### 事项模块
- GET /api/service-items - 获取事项列表
- GET /api/service-items/categories - 获取事项分类
- GET /api/service-items/:id - 获取事项详情

### 申请模块
- POST /api/applications - 提交申请（FormData，含文件）
- GET /api/applications - 获取申请列表
- GET /api/applications/:id - 获取申请详情
- PUT /api/applications/:id/status - 更新申请状态

### 进度模块
- GET /api/progress/application/:id - 获取申请进度

### 消息模块
- GET /api/messages - 获取消息列表
- GET /api/messages/unread-count - 获取未读消息数
- PUT /api/messages/:id/read - 标记消息已读
- PUT /api/messages/read-all - 全部标记已读

### 上传模块
- POST /api/upload/single - 上传单个文件
- POST /api/upload/multiple - 上传多个文件
- GET /api/upload/files/:applicationId - 获取申请的文件列表
- GET /api/upload/preview/:id - 预览文件
- GET /api/upload/download/:id - 下载文件
- DELETE /api/upload/:id - 删除文件

### 管理模块
- GET /api/admin/statistics - 获取统计数据
- POST /api/admin/applications/:id/review - 审核申请
