import React, { useState } from 'react'
import {
  Database, Car, Factory, Truck, ShoppingBag, Wrench,
  ChevronRight, Search, Code, Lightbulb, FileText,
  Copy, Check, X, ChevronDown, ChevronUp
} from 'lucide-react'

// ==================== 数据目录定义 ====================

interface DataField {
  name: string
  type: string
  description: string
  example?: string
}

interface DataService {
  id: string
  name: string
  icon: string
  color: string
  description: string
  apiPath: string
  apiMethod: string
  fields: DataField[]
  scenarios: string[]
  tags: string[]
}

const dataCatalog: DataService[] = [
  // ===== 汽车研发 =====
  {
    id: 'rd-project',
    name: '研发项目总览',
    icon: '🚗',
    color: 'from-blue-600/20 to-cyan-600/10 border-blue-500/30',
    description: '覆盖整车研发全生命周期项目数据，包括车型规划、里程碑进度、资源投入、成本预算等核心信息。支持从项目级到车型级、阶段级的多维度下钻分析，帮助管理层实时掌握研发全局态势。',
    apiPath: '/api/market/rd/projects',
    apiMethod: 'GET',
    tags: ['项目管理', '进度监控', '资源分析'],
    fields: [
      { name: 'project_id', type: 'string', description: '项目唯一标识', example: 'PRJ-2026-001' },
      { name: 'project_name', type: 'string', description: '项目名称', example: 'A级SUV改款' },
      { name: 'vehicle_model', type: 'string', description: '车型代号', example: 'CA-SUV-A3' },
      { name: 'phase', type: 'enum', description: '当前阶段：concept/premium/validation/sop', example: 'validation' },
      { name: 'milestone_name', type: 'string', description: '当前里程碑名称', example: '设计冻结' },
      { name: 'milestone_plan_date', type: 'date', description: '里程碑计划日期', example: '2026-06-30' },
      { name: 'milestone_actual_date', type: 'date', description: '里程碑实际完成日期', example: '2026-07-05' },
      { name: 'progress_percent', type: 'float', description: '整体进度百分比(%)', example: '72.5' },
      { name: 'budget_plan', type: 'decimal', description: '预算总额(万元)', example: '8500.00' },
      { name: 'budget_actual', type: 'decimal', description: '实际支出(万元)', example: '6120.00' },
      { name: 'risk_level', type: 'enum', description: '风险等级：green/yellow/red', example: 'yellow' },
      { name: 'pm_name', type: 'string', description: '项目经理', example: '张明' },
    ],
    scenarios: [
      '研发项目全景看板 — 监控全部在研车型的进度、预算、风险状态',
      '里程碑延期预警 — 自动识别计划偏差超阈值项目，推送预警通知',
      '资源负载分析 — 按专业组/工程师维度分析人力投入与产能匹配',
      '车型对比分析 — 横向对比不同车型研发效率、成本偏差等关键指标',
    ],
  },
  {
    id: 'rd-test',
    name: '试验验证数据',
    icon: '🧪',
    color: 'from-violet-600/20 to-purple-600/10 border-violet-500/30',
    description: '涵盖整车级、系统级、零部件级的试验验证数据，包括动力性、NVH、耐久、安全碰撞、环境等试验结果。支持试验计划跟踪、结果分析、问题归零管理。',
    apiPath: '/api/market/rd/tests',
    apiMethod: 'GET',
    tags: ['试验管理', '质量验证', '问题追踪'],
    fields: [
      { name: 'test_id', type: 'string', description: '试验编号', example: 'TST-2026-0142' },
      { name: 'test_name', type: 'string', description: '试验名称', example: '高寒耐久可靠性试验' },
      { name: 'vehicle_model', type: 'string', description: '适用车型', example: 'CA-SED-B2' },
      { name: 'test_category', type: 'enum', description: '试验类别：performance/nvh/durability/safety/environment', example: 'durability' },
      { name: 'test_phase', type: 'enum', description: '验证阶段：DV/PV', example: 'PV' },
      { name: 'status', type: 'enum', description: '试验状态：planned/ongoing/completed/failed', example: 'completed' },
      { name: 'result_pass', type: 'boolean', description: '是否通过', example: 'true' },
      { name: 'issue_count', type: 'int', description: '发现问题数', example: '3' },
      { name: 'closed_count', type: 'int', description: '已关闭问题数', example: '2' },
      { name: 'start_date', type: 'date', description: '试验开始日期', example: '2026-01-15' },
      { name: 'end_date', type: 'date', description: '试验结束日期', example: '2026-03-20' },
    ],
    scenarios: [
      '试验进度跟踪看板 — 实时监控各类试验的计划与执行进展',
      '问题归零率分析 — 按类别/车型统计试验问题发现与关闭情况',
      '试验资源利用率 — 分析试验台架/场地/设备的排期与使用效率',
      '整车合规性报告 — 自动汇总安全、排放等强制性试验结果',
    ],
  },

  // ===== 生产制造 =====
  {
    id: 'prod-assembly',
    name: '生产线装配数据',
    icon: '🏭',
    color: 'from-emerald-600/20 to-green-600/10 border-emerald-500/30',
    description: '实时采集各生产线/工位的装配生产数据，包括节拍、产出量、一次合格率(FTT)、停线时间、设备OEE等核心制造指标。覆盖焊装、涂装、总装三大工艺车间。',
    apiPath: '/api/market/prod/assembly',
    apiMethod: 'GET',
    tags: ['生产监控', 'OEE', '良率分析'],
    fields: [
      { name: 'line_id', type: 'string', description: '产线编号', example: 'ASSY-L01' },
      { name: 'line_name', type: 'string', description: '产线名称', example: '总装一线' },
      { name: 'workshop', type: 'enum', description: '车间：welding/painting/assembly', example: 'assembly' },
      { name: 'shift', type: 'enum', description: '班次：morning/afternoon/night', example: 'morning' },
      { name: 'plan_output', type: 'int', description: '计划产出(台)', example: '320' },
      { name: 'actual_output', type: 'int', description: '实际产出(台)', example: '305' },
      { name: 'ftt_rate', type: 'float', description: '一次交检合格率(%)', example: '96.8' },
      { name: 'cycle_time', type: 'float', description: '实际节拍(秒/台)', example: '58.5' },
      { name: 'downtime_minutes', type: 'int', description: '停线时长(分钟)', example: '45' },
      { name: 'downtime_reason', type: 'string', description: '主要停线原因', example: '物料短缺-前保险杠' },
      { name: 'oee', type: 'float', description: '设备综合效率(%)', example: '82.3' },
      { name: 'report_date', type: 'date', description: '数据日期', example: '2026-04-02' },
    ],
    scenarios: [
      '生产实时监控看板 — 大屏展示各产线产出、节拍、FTT、停线等实时数据',
      'OEE分析与提升 — 识别设备可用率、性能率、合格率三大损失',
      '停线根因分析 — 按原因分类统计停线频次与时长，定位改善方向',
      '班次产能对比 — 分析不同班次/产线间的效率差异',
    ],
  },
  {
    id: 'prod-quality',
    name: '过程质量数据',
    icon: '✅',
    color: 'from-teal-600/20 to-cyan-600/10 border-teal-500/30',
    description: '覆盖IQC来料检验、过程巡检、整车Audit、出厂检验等全流程质量数据。支持缺陷分类统计、帕累托分析、质量趋势跟踪及预警。',
    apiPath: '/api/market/prod/quality',
    apiMethod: 'GET',
    tags: ['质量监控', '缺陷分析', 'IQC'],
    fields: [
      { name: 'record_id', type: 'string', description: '检验记录编号', example: 'QC-2026-04-02-018' },
      { name: 'inspection_type', type: 'enum', description: '检验类型：iqc/ipqc/audit/fqc', example: 'ipqc' },
      { name: 'station', type: 'string', description: '工位/检验点', example: '总装-底盘合装' },
      { name: 'vehicle_model', type: 'string', description: '车型', example: 'CA-SUV-A3' },
      { name: 'sample_size', type: 'int', description: '抽样数量', example: '50' },
      { name: 'defect_count', type: 'int', description: '缺陷数量', example: '2' },
      { name: 'defect_rate', type: 'float', description: '不良率(‰)', example: '0.4' },
      { name: 'defect_code', type: 'string', description: '缺陷代码', example: 'D-ASM-012' },
      { name: 'defect_desc', type: 'string', description: '缺陷描述', example: '螺栓扭矩不足' },
      { name: 'severity', type: 'enum', description: '严重等级：A/B/C', example: 'B' },
      { name: 'inspector', type: 'string', description: '检验员', example: '李工' },
      { name: 'inspection_time', type: 'datetime', description: '检验时间', example: '2026-04-02 09:30:00' },
    ],
    scenarios: [
      '质量日报自动生成 — 汇总当日各检验点数据，自动生成质量日报',
      '缺陷帕累托分析 — 识别Top质量缺陷，聚焦改善重点',
      '供应商来料质量监控 — IQC数据按供应商维度统计，驱动来料质量提升',
      '质量趋势预警 — FTT/不良率连续下降时自动触发预警',
    ],
  },

  // ===== 供应链 =====
  {
    id: 'scm-supplier',
    name: '供应商管理数据',
    icon: '🤝',
    color: 'from-amber-600/20 to-orange-600/10 border-amber-500/30',
    description: '供应商全生命周期管理数据，包括供应商基础信息、绩效评分、来料质量(PPM)、交期达成率、价格波动、份额分配等。支持供应商分级管理和风险预警。',
    apiPath: '/api/market/scm/suppliers',
    apiMethod: 'GET',
    tags: ['供应商管理', 'SRM', '绩效评分'],
    fields: [
      { name: 'supplier_id', type: 'string', description: '供应商编码', example: 'SUP-00356' },
      { name: 'supplier_name', type: 'string', description: '供应商名称', example: '华达汽车零部件有限公司' },
      { name: 'category', type: 'string', description: '零部件类别', example: '底盘件' },
      { name: 'tier', type: 'enum', description: '供应层级：tier1/tier2/tier3', example: 'tier1' },
      { name: 'rating', type: 'float', description: '综合绩效评分(0-100)', example: '87.5' },
      { name: 'quality_ppm', type: 'int', description: '来料不良率(PPM)', example: '120' },
      { name: 'delivery_rate', type: 'float', description: '交期达成率(%)', example: '95.2' },
      { name: 'price_trend', type: 'float', description: '价格同比变化(%)', example: '3.5' },
      { name: 'share_percent', type: 'float', description: '份额占比(%)', example: '35.0' },
      { name: 'risk_level', type: 'enum', description: '风险等级：low/medium/high', example: 'low' },
      { name: 'contract_end', type: 'date', description: '合同到期日', example: '2027-12-31' },
    ],
    scenarios: [
      '供应商全景看板 — 供应商数量、分级分布、绩效排名一览',
      '供应商风险评估 — 综合质量/交期/财务维度识别高风险供应商',
      '份额优化分析 — 根据绩效评估结果优化供应商份额分配',
      '成本波动监控 — 跟踪原材料/零部件价格变化趋势',
    ],
  },
  {
    id: 'scm-inventory',
    name: '库存与物流数据',
    icon: '📦',
    color: 'from-orange-600/20 to-red-600/10 border-orange-500/30',
    description: '实时库存状态与物流跟踪数据，包括原材料/在制品/成品库存、安全库存预警、库龄分析、物流在途跟踪、仓储利用率等。覆盖全国各仓储节点。',
    apiPath: '/api/market/scm/inventory',
    apiMethod: 'GET',
    tags: ['库存管理', '物流跟踪', '库龄分析'],
    fields: [
      { name: 'material_id', type: 'string', description: '物料编码', example: 'MAT-78003' },
      { name: 'material_name', type: 'string', description: '物料名称', example: '前保险杠总成' },
      { name: 'warehouse', type: 'string', description: '仓库', example: '华东中心仓' },
      { name: 'stock_qty', type: 'int', description: '当前库存(件)', example: '1250' },
      { name: 'safety_stock', type: 'int', description: '安全库存(件)', example: '800' },
      { name: 'stock_days', type: 'int', description: '可供应天数', example: '12' },
      { name: 'in_transit', type: 'int', description: '在途数量(件)', example: '500' },
      { name: 'avg_daily_consumption', type: 'float', description: '日均消耗量', example: '105.0' },
      { name: 'aging_90d_percent', type: 'float', description: '90天以上库龄占比(%)', example: '8.2' },
      { name: 'storage_utilization', type: 'float', description: '仓储利用率(%)', example: '78.5' },
      { name: 'last_inbound', type: 'datetime', description: '最近入库时间', example: '2026-04-01 14:20:00' },
    ],
    scenarios: [
      '库存健康度看板 — 安全库存预警、库龄分布、仓储利用率全局概览',
      '缺料风险预测 — 根据消耗趋势与在途情况预判未来缺料风险',
      '呆滞物料分析 — 识别长期未动物料，驱动呆滞物料处置',
      '物流时效分析 — 供应商→工厂→仓库全链路物流时效跟踪',
    ],
  },

  // ===== 销售 =====
  {
    id: 'sales-performance',
    name: '销售业绩数据',
    icon: '💰',
    color: 'from-rose-600/20 to-pink-600/10 border-rose-500/30',
    description: '覆盖全国各区域的销售业绩数据，包括销量、销售额、毛利、目标达成率等核心指标。支持按品牌/车型/区域/渠道/时间等多维度交叉分析。',
    apiPath: '/api/market/sales/performance',
    apiMethod: 'GET',
    tags: ['业绩监控', '目标管理', '区域分析'],
    fields: [
      { name: 'region', type: 'string', description: '销售区域', example: '华东大区' },
      { name: 'brand', type: 'string', description: '品牌', example: ' ClawAuto' },
      { name: 'vehicle_model', type: 'string', description: '车型', example: 'CA-SUV-A3' },
      { name: 'channel', type: 'enum', description: '销售渠道：online/dealer/fleet', example: 'dealer' },
      { name: 'sales_volume', type: 'int', description: '销量(台)', example: '1850' },
      { name: 'sales_amount', type: 'decimal', description: '销售额(万元)', example: '55500.00' },
      { name: 'gross_profit', type: 'decimal', description: '毛利(万元)', example: '8325.00' },
      { name: 'gross_margin', type: 'float', description: '毛利率(%)', example: '15.0' },
      { name: 'target_volume', type: 'int', description: '目标销量(台)', example: '2000' },
      { name: 'achievement_rate', type: 'float', description: '目标达成率(%)', example: '92.5' },
      { name: 'yoy_growth', type: 'float', description: '同比增速(%)', example: '12.3' },
      { name: 'period', type: 'string', description: '统计周期(年月)', example: '2026-03' },
    ],
    scenarios: [
      '销售月报看板 — 自动汇总当月业绩，对比目标与去年同期',
      '区域热力图 — 地理维度展示各省市销量分布与增速',
      '车型销售排行 — 品牌内各车型销量/收入/毛利排名',
      '经销商效能分析 — 按经销商维度分析销量、库存周转、客户满意度',
    ],
  },
  {
    id: 'sales-customer',
    name: '客户与线索数据',
    icon: '👥',
    color: 'from-pink-600/20 to-fuchsia-600/10 border-pink-500/30',
    description: '客户画像、潜客线索、试驾预约、订单转化等全链路客户数据。支持客户生命周期管理、转化漏斗分析、流失预警及精准营销。',
    apiPath: '/api/market/sales/customers',
    apiMethod: 'GET',
    tags: ['客户管理', '线索转化', '精准营销'],
    fields: [
      { name: 'customer_id', type: 'string', description: '客户ID', example: 'CUS-202603-4521' },
      { name: 'customer_name', type: 'string', description: '客户姓名', example: '王先生' },
      { name: 'stage', type: 'enum', description: '客户阶段：lead/testdrive/negotiation/order/delivered/repurchase', example: 'negotiation' },
      { name: 'interest_model', type: 'string', description: '意向车型', example: 'CA-SUV-A3' },
      { name: 'channel_source', type: 'string', description: '线索来源', example: '线上广告-抖音' },
      { name: 'dealer_id', type: 'string', description: '归属经销商', example: 'DLR-SH-018' },
      { name: 'lead_date', type: 'date', description: '线索获取日期', example: '2026-03-10' },
      { name: 'testdrive_done', type: 'boolean', description: '是否已试驾', example: 'true' },
      { name: 'order_amount', type: 'decimal', description: '订单金额(万元)', example: '28.50' },
      { name: 'conversion_days', type: 'int', description: '从线索到下单天数', example: '18' },
      { name: 'follow_count', type: 'int', description: '跟进次数', example: '6' },
    ],
    scenarios: [
      '销售漏斗分析 — 可视化线索→试驾→谈判→下单各环节转化率',
      '客户画像分析 — 客户年龄/职业/偏好等多维度画像标签',
      '线索来源ROI — 按渠道分析获客成本与转化效果',
      '流失客户预警 — 长期未跟进/意向下降客户自动预警',
    ],
  },

  // ===== 服务 =====
  {
    id: 'svc-aftersales',
    name: '售后维保数据',
    icon: '🔧',
    color: 'from-indigo-600/20 to-blue-600/10 border-indigo-500/30',
    description: '覆盖售后服务全业务数据，包括维修工单、备件消耗、客户满意度(NPS)、索赔信息等。支持售后网点效能分析、备件需求预测、保修成本管控。',
    apiPath: '/api/market/svc/aftersales',
    apiMethod: 'GET',
    tags: ['售后服务', '维保分析', 'NPS'],
    fields: [
      { name: 'workorder_id', type: 'string', description: '工单编号', example: 'WO-2026-SH-00891' },
      { name: 'service_type', type: 'enum', description: '服务类型：warranty/maintenance/repair/accident', example: 'warranty' },
      { name: 'dealer', type: 'string', description: '服务网点', example: '上海XX4S店' },
      { name: 'vin', type: 'string', description: '车架号', example: 'LSVAU...8842' },
      { name: 'vehicle_model', type: 'string', description: '车型', example: 'CA-SED-B2' },
      { name: 'mileage', type: 'int', description: '行驶里程(km)', example: '35000' },
      { name: 'labor_cost', type: 'decimal', description: '工时费(元)', example: '480.00' },
      { name: 'parts_cost', type: 'decimal', description: '材料费(元)', example: '1200.00' },
      { name: 'total_cost', type: 'decimal', description: '总费用(元)', example: '1680.00' },
      { name: 'nps_score', type: 'int', description: '客户满意度评分(0-10)', example: '8' },
      { name: 'repair_time_hours', type: 'float', description: '维修时长(小时)', example: '3.5' },
      { name: 'complaint_flag', type: 'boolean', description: '是否引发投诉', example: 'false' },
    ],
    scenarios: [
      '售后运营看板 — 工单量、营收、NPS、备件消耗等核心指标全景',
      '保修成本分析 — 按车型/零部件/故障类型统计保修费用，识别成本大户',
      '网点效能排名 — 各服务网点工单处理效率、NPS、营收对比',
      '备件需求预测 — 基于历史消耗预测未来备件需求，优化库存',
    ],
  },
  {
    id: 'svc-fleet',
    name: '车联网数据',
    icon: '📡',
    color: 'from-sky-600/20 to-blue-600/10 border-sky-500/30',
    description: '基于车联网远程采集的车辆运行数据，包括行驶轨迹、油耗/电耗、故障码、驾驶行为评分、远程诊断等。支持车队管理和用户出行服务。',
    apiPath: '/api/market/svc/fleet',
    apiMethod: 'GET',
    tags: ['车联网', '远程诊断', '驾驶行为'],
    fields: [
      { name: 'vin', type: 'string', description: '车架号', example: 'LSVAU...8842' },
      { name: 'vehicle_model', type: 'string', description: '车型', example: 'CA-SUV-A3' },
      { name: 'trip_date', type: 'date', description: '出行日期', example: '2026-04-02' },
      { name: 'total_mileage', type: 'float', description: '当日里程(km)', example: '45.6' },
      { name: 'fuel_consumption', type: 'float', description: '百公里油耗(L)', example: '7.8' },
      { name: 'driving_score', type: 'int', description: '驾驶行为评分(0-100)', example: '82' },
      { name: 'speeding_count', type: 'int', description: '超速次数', example: '3' },
      { name: 'hard_brake_count', type: 'int', description: '急刹车次数', example: '1' },
      { name: 'dtc_codes', type: 'array', description: '当前故障码列表', example: '["P0420"]' },
      { name: 'soc', type: 'float', description: '电池SOC(%)', example: '68.5' },
      { name: 'last_online', type: 'datetime', description: '最近上线时间', example: '2026-04-02 18:30:00' },
    ],
    scenarios: [
      '车队管理看板 — 车辆在线率、出行频次、能耗趋势、故障分布',
      '用户出行报告 — 为车主生成个性化出行/能耗/驾驶行为报告',
      '远程故障诊断 — 实时故障码监控与预测性维护',
      '能耗分析 — 不同车型/季节/路况下的能耗对比分析',
    ],
  },
]

// 按业务域分组
const domains = [
  { key: 'rd', label: '汽车研发', icon: Car, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30', ids: ['rd-project', 'rd-test'] },
  { key: 'prod', label: '生产制造', icon: Factory, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30', ids: ['prod-assembly', 'prod-quality'] },
  { key: 'scm', label: '供应链', icon: Truck, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30', ids: ['scm-supplier', 'scm-inventory'] },
  { key: 'sales', label: '销售', icon: ShoppingBag, color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/30', ids: ['sales-performance', 'sales-customer'] },
  { key: 'svc', label: '服务', icon: Wrench, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 border-indigo-500/30', ids: ['svc-aftersales', 'svc-fleet'] },
]

// ==================== 组件 ====================

export default function DataMarket() {
  const [search, setSearch] = useState('')
  const [selectedService, setSelectedService] = useState<DataService | null>(null)
  const [activeTab, setActiveTab] = useState<'fields' | 'scenarios' | 'api'>('fields')
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(domains.map(d => d.key)))
  const [copied, setCopied] = useState(false)
  const [filterDomain, setFilterDomain] = useState<string | null>(null)

  const toggleDomain = (key: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filteredCatalog = dataCatalog.filter(s => {
    if (filterDomain && !domains.find(d => d.key === filterDomain)?.ids.includes(s.id)) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q)
        || s.description.toLowerCase().includes(q)
        || s.tags.some(t => t.includes(q))
    }
    return true
  })

  const getDomain = (serviceId: string) => domains.find(d => d.ids.includes(serviceId))

  const copyApiCode = () => {
    if (!selectedService) return
    const code = `# ${selectedService.name} API 接入示例
import requests

url = "http://clawbi.example.com${selectedService.apiPath}"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}

# GET 请求
response = requests.get(url, headers=headers)
data = response.json()
print(data)`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 详情面板
  if (selectedService) {
    const domain = getDomain(selectedService.id)
    return (
      <div className="p-6 max-w-5xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => { setSelectedService(null); setActiveTab('fields') }}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" /> 返回数据目录
        </button>

        {/* 服务标题 */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedService.color} border flex items-center justify-center text-3xl flex-shrink-0`}>
            {selectedService.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {domain && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${domain.bgColor} ${domain.color}`}>
                  {domain.label}
                </span>
              )}
              <span className="text-xs text-slate-500">{selectedService.fields.length} 个字段</span>
              <span className="text-xs text-slate-500">{selectedService.scenarios.length} 个场景</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{selectedService.name}</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{selectedService.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedService.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{tag}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-6 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
          {[
            { key: 'fields' as const, label: '字段介绍', icon: Database },
            { key: 'scenarios' as const, label: '应用场景', icon: Lightbulb },
            { key: 'api' as const, label: 'API接入', icon: Code },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 字段介绍 */}
        {activeTab === 'fields' && (
          <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-0 px-5 py-3 bg-slate-800/50 text-xs font-medium text-slate-400 border-b border-dark-border">
              <div className="col-span-2">字段名</div>
              <div className="col-span-2">类型</div>
              <div className="col-span-5">说明</div>
              <div className="col-span-3">示例值</div>
            </div>
            {selectedService.fields.map((field, idx) => (
              <div key={field.name} className={`grid grid-cols-12 gap-0 px-5 py-3 text-sm hover:bg-slate-800/30 transition-colors ${idx < selectedService.fields.length - 1 ? 'border-b border-dark-border/50' : ''}`}>
                <div className="col-span-2">
                  <code className="text-primary-400 font-mono text-xs">{field.name}</code>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${field.type === 'string' ? 'bg-green-900/30 text-green-400' : field.type === 'int' || field.type === 'float' ? 'bg-blue-900/30 text-blue-400' : field.type === 'date' || field.type === 'datetime' ? 'bg-purple-900/30 text-purple-400' : field.type === 'enum' ? 'bg-amber-900/30 text-amber-400' : field.type === 'boolean' ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-700 text-slate-300'}`}>
                    {field.type}
                  </span>
                </div>
                <div className="col-span-5 text-slate-300">{field.description}</div>
                <div className="col-span-3 text-slate-500 font-mono text-xs">{field.example || '-'}</div>
              </div>
            ))}
          </div>
        )}

        {/* 应用场景 */}
        {activeTab === 'scenarios' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedService.scenarios.map((scenario, idx) => (
              <div key={idx} className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-slate-500 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedService.color} border flex items-center justify-center flex-shrink-0`}>
                    <span className="text-sm font-bold text-white">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{scenario}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API 接入 */}
        {activeTab === 'api' && (
          <div className="space-y-4">
            {/* 接口信息 */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-900/30 text-emerald-400 text-sm font-mono font-bold">{selectedService.apiMethod}</span>
                  <code className="text-sm text-slate-300 font-mono">{selectedService.apiPath}</code>
                </div>
                <button
                  onClick={copyApiCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                >
                  {copied ? <><Check size={12} className="text-green-400" /> 已复制</> : <><Copy size={12} /> 复制代码</>}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">认证方式：Bearer Token，在 Header 中携带 Authorization 字段</p>

              {/* 代码示例 */}
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">
                  <code>
                    <span className="text-slate-500">{'# '}{selectedService.name} API 接入示例</span>{'\n'}
                    <span className="text-purple-400">import</span> <span className="text-emerald-400">requests</span>{'\n\n'}
                    <span className="text-slate-300">url</span> <span className="text-amber-400">=</span> <span className="text-emerald-400">{"\""}http://clawbi.example.com{selectedService.apiPath}{"\""}</span>{'\n'}
                    <span className="text-slate-300">headers</span> <span className="text-amber-400">=</span> {'{'}{'\n'}
                    {'    '}<span className="text-emerald-400">{"\"Authorization\""}</span><span className="text-amber-400">:</span> <span className="text-emerald-400">{"\"Bearer YOUR_TOKEN\""}</span><span className="text-slate-400">,</span>{'\n'}
                    {'    '}<span className="text-emerald-400">{"\"Content-Type\""}</span><span className="text-amber-400">:</span> <span className="text-emerald-400">{"\"application/json\""}</span>{'\n'}
                    {'}'}{'\n\n'}
                    <span className="text-slate-500">{'# GET 请求'}</span>{'\n'}
                    <span className="text-slate-300">response</span> <span className="text-amber-400">=</span> <span className="text-blue-400">requests</span><span className="text-slate-400">.</span><span className="text-blue-400">get</span><span className="text-slate-400">(</span><span className="text-slate-300">url</span><span className="text-slate-400">,</span> <span className="text-slate-300">headers</span><span className="text-amber-400">=</span><span className="text-slate-300">headers</span><span className="text-slate-400">)</span>{'\n'}
                    <span className="text-slate-300">data</span> <span className="text-amber-400">=</span> <span className="text-slate-300">response</span><span className="text-slate-400">.</span><span className="text-blue-400">json</span><span className="text-slate-400">()</span>{'\n'}
                    <span className="text-purple-400">print</span><span className="text-slate-400">(</span><span className="text-slate-300">data</span><span className="text-slate-400">)</span>
                  </code>
                </pre>
              </div>
            </div>

            {/* 响应示例 */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-slate-400" />
                <span className="text-sm text-slate-300 font-medium">响应示例</span>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed text-slate-300">
                  <code>{'{\n  "code": 200,\n  "message": "success",\n  "data": ['}
                    <span className="text-slate-500">{'{'}</span>{'\n'}
                    {selectedService.fields.slice(0, 4).map((f, i) => {
                      const val = f.example ? (f.type === 'string' ? `"${f.example}"` : f.example) : (f.type === 'string' ? '""' : 'null')
                      return `      ${i > 0 ? ' ' : ''}<span className="text-emerald-400">"${f.name}"</span><span className="text-amber-400">:</span> <span className="text-slate-300">${val}</span>${i < Math.min(4, selectedService.fields.length) - 1 ? ',' : ''}\n`
                    })}
                    <span className="text-slate-500">{`      "...": "更多字段"\n`}</span>
                    <span className="text-slate-500">{`    }\n`}</span>
                    <span className="text-slate-500">{`  ]\n}`}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 目录列表页
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Database size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">数据市场</h1>
            <p className="text-slate-400 text-sm mt-0.5">汽车全链路数据服务目录</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database size={14} />
          <span>{dataCatalog.length} 个数据服务</span>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索数据服务..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-card border border-dark-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterDomain(null)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${!filterDomain ? 'bg-primary-600 text-white' : 'bg-dark-card border border-dark-border text-slate-400 hover:text-white'}`}
          >
            全部
          </button>
          {domains.map(d => (
            <button
              key={d.key}
              onClick={() => setFilterDomain(filterDomain === d.key ? null : d.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${filterDomain === d.key ? 'bg-primary-600 text-white' : 'bg-dark-card border border-dark-border text-slate-400 hover:text-white'}`}
            >
              <d.icon size={12} /> {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {domains.map(d => {
          const services = dataCatalog.filter(s => d.ids.includes(s.id))
          return (
            <div
              key={d.key}
              onClick={() => setFilterDomain(filterDomain === d.key ? null : d.key)}
              className={`cursor-pointer bg-dark-card border rounded-xl p-3 transition-all ${filterDomain === d.key ? 'border-primary-500 bg-primary-600/5' : 'border-dark-border hover:border-slate-500'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <d.icon size={14} className={d.color} />
                <span className="text-xs font-medium text-slate-300">{d.label}</span>
              </div>
              <span className="text-lg font-bold text-white">{services.length}</span>
              <span className="text-xs text-slate-500 ml-1">个服务</span>
            </div>
          )
        })}
      </div>

      {/* 数据服务列表（按域分组） */}
      {domains.filter(d => !filterDomain || d.key === filterDomain).map(domain => {
        const domainServices = filteredCatalog.filter(s => domain.ids.includes(s.id))
        if (domainServices.length === 0) return null
        const isExpanded = expandedDomains.has(domain.key)

        return (
          <div key={domain.key} className="mb-4">
            {/* 域标题 */}
            <button
              onClick={() => toggleDomain(domain.key)}
              className="w-full flex items-center gap-3 py-3 px-1 hover:bg-slate-800/30 rounded-lg transition-colors"
            >
              <domain.icon size={18} className={domain.color} />
              <span className="text-sm font-semibold text-white">{domain.label}</span>
              <span className="text-xs text-slate-500">{domainServices.length} 个服务</span>
              <div className="flex-1" />
              {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            {/* 服务卡片 */}
            {isExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {domainServices.map(service => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className="group cursor-pointer bg-dark-card border border-dark-border rounded-xl p-5 hover:border-slate-500 transition-all duration-200 hover:shadow-lg hover:shadow-black/10"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${service.color} border flex items-center justify-center text-xl flex-shrink-0`}>
                        {service.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors mb-0.5">{service.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{service.fields.length} 字段</span>
                          <span>·</span>
                          <span>{service.scenarios.length} 场景</span>
                          <span>·</span>
                          <span className="font-mono">{service.apiMethod}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{service.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {service.tags.map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* 空状态 */}
      {filteredCatalog.length === 0 && (
        <div className="text-center py-20">
          <Database size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">{search ? '没有找到匹配的数据服务' : '该分类暂无数据服务'}</p>
        </div>
      )}
    </div>
  )
}
