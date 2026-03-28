import { v4 as uuidv4 } from 'uuid';
import { llmService } from './llm.js';

class AgentService {
  constructor() {
    this.histories = {};
    this.initPrompt();
  }

  initPrompt() {
    this.agentPrompts = {
      analyst: {
        name: 'Analyst Agent',
        name_cn: '需求分析 Agent',
        role: 'BI需求分析师',
        system: `你是一个专业的BI需求分析师。你的职责是：
1. 理解用户模糊的业务需求，提取核心分析目标
2. 将需求转化为结构化的指标定义
3. 推荐合适的分析维度和可视化方案
4. 与用户确认需求细节

请用专业、简洁的方式回复。回复格式可以是：
- 需求解析结果（bullet points）
- 指标定义（YAML格式）
- 分析方案建议
- 澄清问题

始终以"【需求分析】"开头回复。`
      },
      modeler: {
        name: 'Modeler Agent',
        name_cn: '数据模型 Agent',
        role: '数据架构师',
        system: `你是一个专业的数据仓库建模专家。你的职责是：
1. 根据分析需求设计星型或雪花型数据模型
2. 生成标准化的 DDL 建表语句
3. 分析模型变更对下游的影响
4. 推荐可复用的已有模型

回复格式可以是：
- 模型设计说明
- DDL 语句（高亮格式）
- 维度/事实表建议
- 血缘关系说明

始终以"【数据建模】"开头回复。`
      },
      etl: {
        name: 'ETL Agent',
        name_cn: 'ETL 开发 Agent',
        role: 'ETL开发工程师',
        system: `你是一个专业的ETL开发工程师。你的职责是：
1. 根据数据模型自动生成 ETL SQL 代码
2. 设计增量同步策略（全量/增量/CDC）
3. 生成 Airflow / dbt DAG 配置
4. 提供性能优化建议

回复格式可以是：
- SQL 代码（高亮格式）
- DAG 配置 YAML
- 优化建议
- 数据质量规则

始终以"【ETL开发】"开头回复。`
      },
      service: {
        name: 'Service Agent',
        name_cn: '指标服务 Agent',
        role: '指标服务工程师',
        system: `你是一个专业的指标服务工程师。你的职责是：
1. 将指标封装为标准 API 接口
2. 设计灵活的查询 DSL
3. 配置缓存策略和预聚合
4. 管理指标版本和变更

回复格式可以是：
- API 接口定义
- 查询 DSL 示例
- 缓存配置
- 版本说明

始终以"【指标服务】"开头回复。`
      },
      viz: {
        name: 'Viz Agent',
        name_cn: '可视化 Agent',
        role: 'BI可视化设计师',
        system: `你是一个专业的BI可视化设计师。你的职责是：
1. 根据数据类型推荐最佳图表类型
2. 设计直观的仪表盘布局
3. 配置交互功能（筛选、下钻、联动）
4. 适配不同 BI 平台（Superset/Metabase/Tableau）

回复格式可以是：
- 图表推荐方案
- 布局设计建议
- 交互设计说明
- ECharts 配置示例

始终以"【可视化设计】"开头回复。`
      },
      qa: {
        name: 'QA Agent',
        name_cn: '质量保障 Agent',
        role: '数据质量工程师',
        system: `你是一个专业的数据质量保障工程师。你的职责是：
1. 设计全面的数据质量检查规则
2. 验证指标口径的一致性
3. 执行回归测试确保变更安全
4. 生成测试报告和质量评分

回复格式可以是：
- 质量检查规则列表
- 测试用例设计
- 口径一致性验证结果
- 质量评分报告

始终以"【质量保障】"开头回复。`
      },
      ops: {
        name: 'Ops Agent',
        name_cn: '运维监控 Agent',
        role: '运维工程师',
        system: `你是一个专业的BI运维工程师。你的职责是：
1. 监控 ETL 任务执行状态和性能
2. 检测数据新鲜度和 SLA 合规性
3. 管理告警规则和通知策略
4. 进行容量规划和成本优化

回复格式可以是：
- 监控指标配置
- 告警规则设计
- 容量规划建议
- 优化建议

始终以"【运维监控】"开头回复。`
      },
      orchestrator: {
        name: 'Orchestrator Agent',
        name_cn: '编排调度 Agent',
        role: 'BI项目经理',
        system: `你是一个专业的BI项目协调者。你的职责是：
1. 将复杂需求拆解为可执行的任务计划
2. 协调多个专业 Agent 协作
3. 跟踪项目进度和状态
4. 管理风险和依赖关系

回复格式可以是：
- 任务拆解结果
- 执行计划（甘特图风格）
- 进度报告
- 风险提示

始终以"【项目协调】"开头回复。`
      }
    };
  }

  async chat(agentId, message, context = {}) {
    const agent = this.agentPrompts[agentId];
    if (!agent) {
      return { error: `Agent ${agentId} 不存在` };
    }

    // 初始化历史
    if (!this.histories[agentId]) {
      this.histories[agentId] = [];
    }

    // 模拟 AI 响应
    const response = await this.generateResponse(agentId, message, context);

    // 保存历史
    this.histories[agentId].push({ role: 'user', content: message, timestamp: Date.now() });
    this.histories[agentId].push({ role: 'assistant', content: response, timestamp: Date.now() });

    return {
      agent_id: agentId,
      agent_name: agent.name,
      agent_name_cn: agent.name_cn,
      response,
      timestamp: new Date().toISOString()
    };
  }

  async generateResponse(agentId, message, context = {}) {
    const agent = this.agentPrompts[agentId];
    if (!agent) return `未知 Agent: ${agentId}`;

    // 构建消息历史（用于多轮对话，限制最近6轮）
    const historyMsgs = this.histories[agentId]?.slice(-6) || [];
    const systemMsg = { role: 'system', content: agent.system };

    const llmMessages = [
      systemMsg,
      ...historyMsgs.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // 重试机制：最多尝试2次
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await llmService.chat(llmMessages, {
          temperature: 0.7,
          maxTokens: 2048,
        });
        return response;
      } catch (err) {
        console.error(`[${agentId}] LLM调用失败(第${attempt}次):`, err.message);
        if (attempt === 2) {
          console.warn(`[${agentId}] LLM不可用，切换到模板响应`);
          return this.fallbackResponse(agentId, message);
        }
        await new Promise(r => setTimeout(r, 1000)); // 等待1秒后重试
      }
    }
  }

  fallbackResponse(agentId, message) {
    // LLM 不可用时的兜底响应
    if (agentId === 'analyst') return this.analystResponse(message);
    if (agentId === 'modeler') return this.modelerResponse(message);
    if (agentId === 'etl') return this.etlResponse(message);
    if (agentId === 'service') return this.serviceResponse(message);
    if (agentId === 'viz') return this.vizResponse(message);
    if (agentId === 'qa') return this.qaResponse(message);
    if (agentId === 'ops') return this.opsResponse(message);
    if (agentId === 'orchestrator') return this.orchestratorResponse(message);
    return `【${agentId}】收到消息: ${message}`;
  }

  analystResponse(msg) {
    if (msg.includes('销售') || msg.includes('收入') || msg.includes('revenue')) {
      return `【需求分析】

✅ 需求理解
根据您的描述，我识别到以下核心业务需求：

**业务目标**
- 监控销售业绩和收入变化趋势
- 按地区/产品维度分析销售构成
- 追踪销售目标的完成进度

**建议定义的核心指标**

| 指标名称 | 英文名 | 计算公式 | 粒度 |
|---------|--------|---------|------|
| 日销售额 | daily_revenue | SUM(order_amount) | 日期 |
| 月销售额 | monthly_revenue | SUM(order_amount) | 年月 |
| 客单价 | avg_order_value | SUM(amount)/COUNT(DISTINCT uid) | 日期+地区 |
| 销售目标完成率 | target_completion | actual/target*100 | 月 |

**推荐分析维度**
- 时间维度：日、周、月、年
- 地区维度：省、市、门店
- 产品维度：品类、品牌、商品

**下一步**
建议与业务方确认：
1. 销售数据的来源系统？
2. 是否需要区分线上/线下渠道？
3. 是否有历史数据对比需求？`;
    }
    
    if (msg.includes('用户') || msg.includes('活跃') || msg.includes('留存')) {
      return `【需求分析】

✅ 需求理解
用户分析相关需求已识别：

**建议的核心指标体系**

\`\`\`yaml
用户指标:
  活跃指标:
    - DAU (日活跃用户)
    - WAU (周活跃用户)
    - MAU (月活跃用户)
  
  留存指标:
    - 次日留存率 (D1)
    - 7日留存率 (D7)
    - 30日留存率 (D30)
  
  转化指标:
    - 新用户数
    - 用户转化率
    - 人均会话数
\`\`\`

**分析框架**
1. 用户获取 → 激活 → 留存 → 变现 → 推荐 (AARRR模型)
2. 支持按渠道/版本/地区细分

是否需要我进一步细化某个指标的定义？`;
    }

    return `【需求分析】

您好！我是需求分析 Agent，负责将您的业务需求转化为结构化的指标定义。

**我可以帮您：**
- 📝 理解并结构化模糊的业务需求
- 📊 定义指标口径（计算逻辑、维度、粒度）
- 🔍 校验指标与已有定义的冲突
- 📋 推荐分析方案和可视化类型

**请描述您的业务需求，例如：**
- "我想看每天的销售情况"
- "需要监控用户活跃度和留存"
- "分析各地区的收入构成"

请告诉我您想分析什么业务场景？`;
  }

  modelerResponse(msg) {
    if (msg.includes('销售') || msg.includes('订单')) {
      return `【数据建模】

基于销售分析需求，我为您设计以下星型模型：

**事实表：dwd_sale_fact**

\`\`\`sql
CREATE TABLE dwd_sale_fact (
  -- 主键
  sale_id        BIGINT PRIMARY KEY,
  
  -- 时间维度
  dt             DATE NOT NULL,          -- 日期
  dt_wid         INT NOT NULL,           -- 日期维度外键
  
  -- 地区维度
  province_id    INT,                     -- 省
  city_id        INT,                     -- 市
  store_id       INT,                     -- 门店
  
  -- 产品维度
  category_id    INT,                     -- 品类
  brand_id       INT,                     -- 品牌
  
  -- 用户维度
  user_id        BIGINT,                   -- 用户
  
  -- 交易事实
  order_id       BIGINT,                   -- 订单号
  sale_amount    DECIMAL(15,2),            -- 销售金额
  quantity       INT,                     -- 销售数量
  discount_amount DECIMAL(15,2),          -- 优惠金额
  
  -- 审计字段
  create_time    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分区
PARTITIONED BY (dt);
\`\`\`

**维度表建议**

| 维度表 | 说明 | 主键 |
|--------|------|------|
| dim_date | 日期维度 | dt_wid |
| dim_store | 门店维度 | store_id |
| dim_product | 产品维度 | product_id |
| dim_user | 用户维度 | user_id |

**模型特点**
- ✅ 星型模型，减少关联复杂度
- ✅ 分区设计，支持增量抽取
- ✅ 适度退化维度（DDD），平衡性能与灵活性

需要我生成具体的维度表 DDL 吗？`;
    }

    return `【数据建模】

您好！我是数据模型 Agent，负责设计数据仓库模型。

**我可以帮您：**
- 🏗️ 设计星型/雪花型数据模型
- 📄 生成 DDL 建表语句
- 🔄 分析模型变更影响
- 🔍 推荐可复用的已有模型

**标准建模流程：**
1. 确认业务过程和度量
2. 声明粒度
3. 确认维度
4. 生成事实表和维度表

请描述您的分析需求，我将为您设计合适的数据模型。`;
  }

  etlResponse(msg) {
    if (msg.includes('日销售') || msg.includes('dwd_sale')) {
      return `【ETL开发】

基于销售事实表，我为您生成以下 ETL 逻辑：

**增量抽取 SQL (MySQL → 数据仓库)**

\`\`\`sql
-- Step 1: 增量抽取订单数据
INSERT OVERWRITE TABLE dwd_sale_fact PARTITION(dt='${new Date().toISOString().split('T')[0]}')
SELECT
  o.order_id      AS sale_id,
  o.order_id,
  FROM_UNIXTIME(o.create_time, 'yyyy-MM-dd') AS dt,
  -- 时间维度键
  o.create_time,
  -- 地区维度
  s.province_id,
  s.city_id,
  s.store_id,
  -- 产品维度
  p.category_id,
  p.brand_id,
  -- 用户维度
  o.user_id,
  -- 交易事实
  o.order_amount,
  o.quantity,
  o.discount_amount,
  -- 审计字段
  CURRENT_TIMESTAMP
FROM ods_orders o
LEFT JOIN dim_store s ON o.store_id = s.store_id
LEFT JOIN dim_product p ON o.product_id = p.product_id
WHERE o.dt = '${new Date().toISOString().split('T')[0]}'
  AND o.status = 'completed';
\`\`\`

**调度配置 (Airflow)**

\`\`\`yaml
# dag: sale_etl_daily
schedule: "0 2 * * *"  # 每天凌晨2点执行

tasks:
  - extract: 从 ODS 抽取数据
  - transform: 数据清洗和转换
  - load: 写入 DWD 层
  - aggregate: 生成 ADS 聚合层
  
config:
  retry: 3
  timeout: 3600
  alert_on_failure: true
\`\`\`

**数据质量规则**
| 规则 | 阈值 |
|------|------|
| 空值率检查 | order_id < 0.01% |
| 金额非负 | sale_amount >= 0 |
| 订单状态 | status IN ('completed', 'pending') |

需要我继续生成其他 ETL 逻辑吗？`;
    }

    return `【ETL开发】

您好！我是 ETL 开发 Agent，负责生成数据管道代码。

**我可以帮您：**
- ⚡ 生成 ETL SQL 代码
- 🔄 设计增量/全量同步策略
- 📋 生成 DAG 调度配置
- ⚡ 性能优化建议

**支持的调度引擎**
- Apache Airflow
- dbt
- DataX
- Flink CDC

请告诉我需要生成哪类 ETL 逻辑，我将为您生成完整代码。`;
  }

  serviceResponse(msg) {
    if (msg.includes('日销售') || msg.includes('指标')) {
      return `【指标服务】

我为您的指标生成以下 API 服务：

**接口定义**

\`\`\`yaml
# 查询日销售额
GET /api/v1/metrics/daily_revenue
  Query:
    - start_date: string (YYYY-MM-DD)
    - end_date: string (YYYY-MM-DD)
    - group_by: province_id | city_id | category_id
    - limit: int (default 100)
  
  Response:
    {
      "code": 0,
      "data": [
        { "dt": "2026-03-28", "value": 1256800.00 },
        { "dt": "2026-03-27", "value": 1183200.00 }
      ],
      "meta": { "total": 30, "cached": true }
    }
\`\`\`

**查询 DSL 示例**

\`\`\`json
{
  "metrics": ["daily_revenue", "daily_orders"],
  "dimensions": ["dt", "city_id"],
  "filters": [
    { "field": "dt", "op": ">=", "value": "2026-03-01" },
    { "field": "city_id", "op": "in", "value": [1, 2, 3] }
  ],
  "order_by": [{ "field": "dt", "desc": true }],
  "limit": 100
}
\`\`\`

**缓存策略**
- 实时指标: Redis缓存 5分钟
- 历史指标: 预计算 + CDN 加速
- 复杂查询: 结果集缓存 1小时

SDK 调用示例：
\`\`\`javascript
const client = new MetricsClient({ apiKey: 'your-key' });
const data = await client.query({
  metrics: ['daily_revenue'],
  dimensions: ['dt'],
  dateRange: { start: '2026-03-01', end: '2026-03-28' }
});
\`\`\``;
    }

    return `【指标服务】

您好！我是指标服务 Agent，负责将指标封装为可用的 API。

**我可以帮您：**
- 🔌 生成标准 REST API
- 📊 设计查询 DSL
- 💾 配置缓存策略
- 🔄 管理指标版本

请告诉我需要服务的指标，我将为您生成完整的 API 定义和 SDK。`;
  }

  vizResponse(msg) {
    if (msg.includes('销售') || msg.includes('仪表盘')) {
      return `【可视化设计】

基于销售分析场景，我为您推荐以下可视化方案：

**仪表盘布局建议**

\`\`\`
┌─────────────────────────────────────────────────────┐
│  📊 销售概览仪表盘                    [时间筛选器]   │
├─────────────┬─────────────┬─────────────┬────────────┤
│ 今日销售额   │ 本月累计     │ 同比增长率  │ 目标完成率  │
│ ¥125.6万   │ ¥3,568万    │ +15.3%    │ 78.5%     │
├─────────────┴─────────────┴─────────────┴────────────┤
│                                                     │
│  📈 日销售额趋势 (折线图)                            │
│  [0    ________________________________________]   │
│                                                     │
├─────────────────────────┬───────────────────────────┤
│  🏙️ TOP10城市 (柱状图)   │  🥧 品类占比 (饼图)       │
│  [████████████████]     │    电子 35%               │
│                         │    服装 25%               │
└─────────────────────────┴───────────────────────────┘
\`\`\`

**图表推荐**

| 分析目的 | 推荐图表 | 理由 |
|---------|---------|------|
| 趋势分析 | 折线图 | 展示时间序列变化 |
| 构成分析 | 饼图/环形图 | 展示占比关系 |
| 对比分析 | 柱状图 | 横向对比不同类别 |
| 地理分析 | 地图 | 展示地理分布 |
| 关联分析 | 散点图 | 展示两个指标关系 |

**ECharts 配置片段**

\`\`\`javascript
{
  xAxis: { type: 'time', name: '日期' },
  yAxis: { type: 'value', name: '销售额(元)' },
  series: [{
    type: 'line',
    smooth: true,
    areaStyle: { opacity: 0.3 },
    data: [['2026-03-01', 820000], ...]
  }]
}
\`\`\`

需要我生成完整的仪表盘配置吗？`;
    }

    return `【可视化设计】

您好！我是可视化 Agent，负责设计直观的图表和仪表盘。

**我可以帮您：**
- 📊 推荐最佳图表类型
- 🎨 设计仪表盘布局
- ⚙️ 生成 ECharts / AntV 配置
- 🔗 配置交互功能

**支持的 BI 平台**
- Apache ECharts
- AntV (蚂蚁可视化)
- Superset
- Metabase

请描述您的分析场景，我将为您推荐可视化方案。`;
  }

  qaResponse(msg) {
    if (msg.includes('日销售')) {
      return `【质量保障】

针对日销售额指标，我为您设计以下质量检查方案：

**数据质量规则**

| 规则类型 | 检查规则 | 阈值 | 严重性 |
|---------|---------|------|--------|
| 完整性 | order_id 非空率 | ≥ 99.99% | 🔴 P0 |
| 准确性 | sale_amount 范围 | > 0 AND < 1,000,000 | 🟡 P1 |
| 一致性 | 订单状态合法性 | IN('completed','pending','cancelled') | 🔴 P0 |
| 时效性 | 数据延迟 | < 4小时 | 🔴 P0 |
| 唯一性 | order_id 重复率 | = 0% | 🔴 P0 |

**口径一致性验证 SQL**

\`\`\`sql
-- 验证日销售额口径一致性
WITH etl_result AS (
  SELECT dt, SUM(sale_amount) AS total
  FROM dwd_sale_fact
  WHERE dt = '2026-03-28'
  GROUP BY dt
),
source_result AS (
  SELECT dt, SUM(order_amount) AS total
  FROM ods_orders
  WHERE dt = '2026-03-28' AND status = 'completed'
  GROUP BY dt
)
SELECT 
  e.dt,
  e.total AS etl_total,
  s.total AS source_total,
  ABS(e.total - s.total) AS diff,
  CASE WHEN ABS(e.total - s.total) < 0.01 THEN 'PASS' ELSE 'FAIL' END AS status
FROM etl_result e
LEFT JOIN source_result s ON e.dt = s.dt;
\`\`\`

**测试用例设计**

\`\`\`yaml
test_suite: 日销售额质量测试
cases:
  - name: 基础数据完整性
    sql: SELECT COUNT(*) FROM dwd_sale_fact WHERE dt = '2026-03-28'
    expected: "> 0"
  
  - name: 金额非负验证
    sql: SELECT COUNT(*) FROM dwd_sale_fact WHERE sale_amount < 0 AND dt = '2026-03-28'
    expected: "= 0"
  
  - name: 环比波动检测
    alert_if: abs(today - yesterday) / yesterday > 0.3
\`\`\`

**质量评分**: 预计达到 95/100 (基于规则覆盖度)`;
    }

    return `【质量保障】

您好！我是质量保障 Agent，负责确保数据质量和口径一致性。

**我可以帮您：**
- 🛡️ 设计数据质量检查规则
- ✅ 验证指标口径一致性
- 🔄 执行回归测试
- 📋 生成测试报告

**质量维度**
- 完整性（空值、缺失）
- 准确性（范围、格式）
- 一致性（跨系统、跨时间）
- 时效性（数据延迟）
- 唯一性（重复记录）

请告诉我需要检查的指标或数据，我将为您设计质量检查方案。`;
  }

  opsResponse(msg) {
    if (msg.includes('监控') || msg.includes('告警')) {
      return `【运维监控】

为您配置以下监控告警方案：

**监控指标配置**

\`\`\`yaml
# ETL 任务监控
monitoring:
  tasks:
    sale_etl_daily:
      schedule: "0 2 * * *"
      timeout: 3600  # 1小时
      alert_if:
        - status != 'success'
        - duration > 3600
        - records_processed < 1000
    
    user_behavior_etl:
      schedule: "0 3 * * *"
      timeout: 7200
      alert_if:
        - status != 'success'
        - null_rate > 0.05

# 数据新鲜度监控
freshness:
  dwd_sale_fact:
    max_delay: 4h        # 最大延迟4小时
    sla: "2:00-22:00"   # SLA时间窗口
    alert_if:
      - last_update > 4h
      - outside_sla_hours AND last_update > 1h

# 查询性能监控
performance:
  p99_latency:
    threshold: 2000ms   # P99 响应时间
    alert_if: "> 2000ms"
  
  error_rate:
    threshold: 0.01     # 1% 错误率
    alert_if: "> 0.01"
\`\`\`

**告警规则**

| 告警级别 | 触发条件 | 通知方式 | 升级策略 |
|---------|---------|---------|---------|
| P0 紧急 | ETL 失败 / 数据延迟 > 4h | 短信+电话 | 立即升级 |
| P1 重要 | 数据异常 / 性能下降 | 企微/飞书 | 4小时响应 |
| P2 一般 | 轻微延迟 / 容量预警 | 邮件 | 工作时间处理 |

**仪表盘建议**

\`\`\`
┌─────────────────────────────────────────────────────┐
│  ⚙️ 运维监控面板                                     │
├─────────────┬─────────────┬─────────────┬────────────┤
│ 运行中任务   │ 今日成功     │ 今日失败     │ 平均耗时    │
│     12      │     11      │     1       │   45分钟   │
├─────────────┴─────────────┴─────────────┴────────────┤
│  📊 任务执行状态                                      │
│  [████████████░░░░░░░░] 80% 完成                     │
├─────────────────────────────────────────────────────┤
│  ⚠️ 活跃告警 (2)                                     │
│  • P1: sale_etl 延迟 2小时                            │
│  • P2: 存储容量使用率 78%                            │
└─────────────────────────────────────────────────────┘
\`\`\``;
    }

    return `【运维监控】

您好！我是运维监控 Agent，负责保障系统稳定运行。

**我可以帮您：**
- 📊 监控 ETL 任务执行状态
- ⏰ 检测数据新鲜度和 SLA
- 🔔 管理告警规则和通知
- 📈 分析性能趋势和容量

**监控范围**
- ETL 调度任务
- 数据管道延迟
- 查询性能
- 存储容量
- API 可用性

请告诉我需要监控的场景，我将为您配置完整的监控方案。`;
  }

  orchestratorResponse(msg) {
    if (msg.includes('项目') || msg.includes('创建') || msg.includes('需求')) {
      return `【项目协调】

好的，我来帮您规划和协调 BI 项目。

**任务拆解**

\`\`\`
项目: 销售分析平台
预计工期: 10 个工作日

Phase 1: 需求分析 (Day 1-2)  ████░░░░░░  20%
├── [Analyst] 需求调研和确认
├── [Analyst] 指标定义和口径对齐
└── ✅ 交付物: 需求规格说明书

Phase 2: 数据建模 (Day 3-4)  ░░░░████░░░░  40%
├── [Modeler] 模型设计
├── [Modeler] DDL 生成和评审
└── ✅ 交付物: 数据模型文档

Phase 3: ETL 开发 (Day 5-7)  ░░░░░░░████  60%
├── [ETL] SQL 代码生成
├── [ETL] DAG 配置
└── ✅ 交付物: 可执行的数据管道

Phase 4: 可视化 (Day 8-9)  ░░░░░░░░░██  80%
├── [Viz] 仪表盘设计
├── [QA] 质量验证
└── ✅ 交付物: 上线仪表盘

Phase 5: 上线运维 (Day 10)  ░░░░░░░░░░█  100%
├── [Ops] 发布配置
└── ✅ 交付物: 监控面板
\`\`\`

**Agent 协作计划**

| 阶段 | Agent | 依赖 |
|------|-------|------|
| 需求分析 | Analyst | - |
| 数据建模 | Modeler | Analyst 完成 |
| ETL 开发 | ETL | Modeler 完成 |
| 可视化 | Viz + QA | ETL 完成 |
| 上线 | Ops | QA 通过 |

**风险提示**
⚠️ 如果涉及历史数据迁移，可能需要额外 3-5 个工作日
⚠️ 第三方数据源接口对接视情况而定

是否现在开始执行 Phase 1 需求分析？`;
    }

    return `【项目协调】

您好！我是编排调度 Agent，负责协调整个 BI 交付流程。

**我可以帮您：**
- 🎯 拆解复杂需求为可执行任务
- 🔄 协调多个专业 Agent 协作
- 📊 跟踪项目进度和状态
- ⚠️ 管理风险和依赖关系

**支持的流程阶段**
1. 需求分析 (Analyst)
2. 数据建模 (Modeler)
3. ETL 开发 (ETL)
4. 可视化设计 (Viz)
5. 质量验证 (QA)
6. 上线运维 (Ops)

请告诉我您的需求，我将为您制定完整的项目计划和 Agent 协作方案。`;
  }

  getHistory(agentId) {
    return this.histories[agentId] || [];
  }
}

const _svc = new AgentService(); export { _svc as AgentService };
