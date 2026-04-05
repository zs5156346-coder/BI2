# ClawBI - 多 Agent 协作智能 BI 系统

基于 OpenClaw 框架的多 Agent 协作智能 BI 系统 Web 端，通过自然语言与多个专业化 Agent 协作，完成从需求分析到可视化交付的全流程。

## 功能模块

| 模块 | 说明 |
|------|------|
| **BI 指挥中心** | 仪表盘总览，展示项目状态、指标统计、活跃趋势等 |
| **Agent 协作** | 与多个专业化 Agent 对话，完成需求分析、建模、ETL、可视化等任务 |
| **指标管理** | 管理已发布的指标定义，支持增删改查 |
| **可视化** | 配置和预览数据看板，支持多种图表类型 |
| **项目管理** | 跟踪从需求到交付的全流程阶段 |
| **需求管理** | 提交、评审和追踪业务需求 |
| **权限管理** | 配置用户角色和数据访问权限 |
| **模型配置** | 管理各 Agent 使用的 LLM 模型 |

## 核心 Agent

1. **需求分析 Agent** - 理解自然语言业务需求，提取核心指标和分析维度
2. **数据模型 Agent** - 设计星型/雪花型数据模型，生成 DDL
3. **ETL 开发 Agent** - 生成 ETL SQL 和 Airflow/dbt DAG 配置
4. **指标服务 Agent** - 封装指标为标准 API 接口
5. **可视化 Agent** - 推荐图表类型，生成 ECharts 配置
6. **质量保障 Agent** - 验证指标口径一致性，执行回归测试
7. **UAT 验证 Agent** - 引导用户验收，生成验收报告
8. **运维监控 Agent** - 监控 ETL 任务状态、数据新鲜度和 SLA

## 技术栈

**前端**
- React 18 + TypeScript
- Vite 5（构建工具）
- TailwindCSS + PostCSS
- ECharts + echarts-for-react
- React Router v6

**后端**
- Node.js（ESM）
- Express
- jsonwebtoken（JWT 鉴权）
- bcryptjs（密码加密）
- uuid

**数据存储**
- 本地 JSON 文件数据库（`backend/db/data/`）

## 本地运行

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 启动开发服务

```bash
# 终端 1：启动后端（端口 3001）
cd backend
npm run dev

# 终端 2：启动前端（端口 5173/5174）
cd frontend
npm run dev
```

### 访问

- 前端地址：http://localhost:5173（或 5174）
- 默认账号：`admin` / `admin123`

## 项目结构

```
claw1/
├── backend/
│   ├── db/
│   │   ├── data/          # JSON 数据文件
│   │   └── init.js        # 数据库初始化
│   ├── middleware/
│   │   └── auth.js        # JWT 鉴权中间件
│   ├── routes/
│   │   ├── agents.js      # Agent 路由
│   │   ├── auth.js        # 登录注册
│   │   ├── dashboard.js   # 仪表盘数据
│   │   ├── metrics.js     # 指标管理
│   │   ├── models.js      # 模型配置
│   │   ├── projects.js    # 项目管理
│   │   ├── requirements.js # 需求管理
│   │   ├── skills.js      # Agent 技能管理
│   │   └── visualization.js # 可视化配置
│   ├── services/
│   │   ├── agentService.js # Agent 核心服务
│   │   ├── llm.js         # LLM 调用封装
│   │   └── reportGenerator.js # 分析报告生成
│   └── server.js          # 后端入口
├── frontend/
│   └── src/
│       ├── components/     # 通用组件
│       │   ├── DashboardPreview.tsx
│       │   ├── Layout.tsx
│       │   └── SkillInstaller.tsx
│       └── pages/         # 页面组件
│           ├── Agent/      # Agent 协作页
│           ├── Dashboard/  # 仪表盘页
│           ├── DataMarket/ # 数据市场
│           ├── DataPortal/ # 数据门户
│           ├── Login/      # 登录页
│           ├── Metrics/    # 指标管理
│           ├── Permission/ # 权限管理
│           ├── Projects/   # 项目管理
│           ├── Requirements/ # 需求管理
│           ├── Settings/   # 模型配置
│           └── Visualization/ # 可视化
├── PRD.md                  # 产品需求文档
└── README.md
```

## License

MIT
