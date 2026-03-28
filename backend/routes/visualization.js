import express from 'express';
import { findAll, findOne, insert, update, remove } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(findAll('visualizations'));
});

router.get('/:id', (req, res) => {
  const viz = findOne('visualizations', v => v.id === req.params.id);
  if (!viz) return res.status(404).json({ error: '可视化不存在' });
  res.json(viz);
});

router.post('/', (req, res) => {
  const { title, type, config, metrics } = req.body;
  const viz = { id: uuidv4(), title, type, config: config || {}, metrics: metrics || [], created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  insert('visualizations', viz);
  res.json(viz);
});

router.put('/:id', (req, res) => {
  const { title, type, config, metrics } = req.body;
  const updated = update('visualizations', req.params.id, { title, type, config, metrics, updated_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: '可视化不存在' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  remove('visualizations', req.params.id);
  res.json({ message: '删除成功' });
});

router.get('/:id/data', (req, res) => {
  const viz = findOne('visualizations', v => v.id === req.params.id);
  if (!viz) return res.status(404).json({ error: '可视化不存在' });
  const charts = viz.config?.charts || [];
  const chartData = charts.map(chart => {
    if (chart.type === 'line') {
      const dates = []; const data = [];
      for (let i = 30; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split('T')[0]); data.push(Math.floor(Math.random() * 10000) + 5000); }
      return { id: chart.id, title: chart.title, type: chart.type, xData: dates, seriesData: [{ name: chart.title, data }] };
    } else if (chart.type === 'bar') {
      const xData = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
      return { id: chart.id, title: chart.title, type: chart.type, xData, seriesData: [{ name: chart.title, data: xData.map(() => Math.floor(Math.random() * 10000) + 1000) }] };
    } else if (chart.type === 'pie') {
      return { id: chart.id, title: chart.title, type: chart.type, seriesData: [{ name: '电子', value: 5000 }, { name: '服装', value: 3000 }, { name: '食品', value: 2000 }, { name: '家居', value: 1500 }, { name: '其他', value: 1000 }] };
    }
    return chart;
  });
  res.json(chartData);
});

export default router;
