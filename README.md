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
- SQLite（默认数据库，零配置可直接运行）
- MySQL（可选，生产环境推荐）

## 项目结构

```
xcf-218/
├── server/                 # 后端服务（NestJS）
│   ├── src/
│   │   ├── entities/       # 数据库实体
│   │   ├── modules/        # 业务模块
│   │   ├── main.ts         # 入口文件
│   │   └── app.module.ts   # 根模块
│   ├── data/               # SQLite数据库文件目录
│   └── package.json
└── web/                    # 前端应用（Vue3）
    ├── src/
    │   ├── api/            # API接口层
    │   ├── views/          # 页面组件
    │   ├── stores/         # Pinia状态管理
    │   ├── router/         # 路由配置
    │   ├── types/          # TypeScript类型定义
    │   └── utils/          # 工具函数
    └── package.json
```

## 快速开始

### 前置条件
- Node.js >= 16.x
- npm 或 yarn 或 pnpm

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

## 功能模块

### 1. 事项查询
- 浏览所有可办理的政务服务事项
- 支持按关键字搜索、按分类筛选
- 查看事项详情（办理条件、所需材料、办理时限等）

### 2. 材料提交
- 选择事项后在线填写申请表单
- 上传所需的证明材料
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
- 填写审核意见
- 完整的审核流程记录

### 6. 接口层
- RESTful API 设计规范
- 统一响应格式
- CORS 跨域支持
- 参数校验

## 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 普通用户 | user | user123 |
| 管理员 | admin | admin123 |

## 主流程演示

### 用户端流程
1. 使用 user/user123 登录
2. 进入「事项查询」，选择一个事项（如「社保卡申领」）
3. 点击「立即办理」，填写申请信息并上传材料
4. 提交成功后，可在「进度跟踪」中查看申请状态
5. 在「消息中心」接收状态变更通知

### 管理员端流程
1. 使用 admin/admin123 登录
2. 进入「管理后台」，查看待审核申请列表
3. 点击「审核」进入详情页
4. 可以执行：开始审核 → 审核通过/驳回 → 办理完成
5. 用户端会实时收到相应的消息通知

## 数据库说明

默认使用 SQLite 数据库，数据库文件位于 `server/data/government-service.db`，首次启动时会自动创建并初始化示例数据。

如需切换到 MySQL，请修改 `server/src/app.module.ts` 中的 TypeORM 配置：

```typescript
TypeOrmModule.forRoot({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'your_password',
  database: 'government_service',
  entities: [...],
  synchronize: true,
})
```
