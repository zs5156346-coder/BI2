import express from 'express';
import { findAll } from '../db/init.js';

const router = express.Router();

router.get('/stats', (req, res) => {
  const allMetrics = findAll('metrics');
  const allProjects = findAll('projects');
  const allVizs = findAll('visualizations');
  const allAgents = findAll('agents');

  res.json({
    totalMetrics: allMetrics.length,
    activeMetrics: allMetrics.filter(m => m.status === 'active').length,
    totalProjects: allProjects.length,
    activeProjects: allProjects.filter(p => p.status !== 'completed').length,
    completedProjects: allProjects.filter(p => p.status === 'completed').length,
    totalVizs: allVizs.length,
    onlineAgents: allAgents.filter(a => a.status === 'online').length,
    totalAgents: allAgents.length,
  });
});

router.get('/activity', (req, res) => {
  const days = 30;
  const activity = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    activity.push({
      date: d.toISOString().split('T')[0],
      messages: Math.floor(Math.random() * 20) + 5,
      metrics: Math.floor(Math.random() * 3) + 1,
      projects: Math.floor(Math.random() * 2)
    });
  }
  res.json(activity);
});

router.get('/recent', (req, res) => {
  const allMetrics = findAll('metrics').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const allProjects = findAll('projects').sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  res.json({
    recentMetrics: allMetrics.slice(0, 5),
    recentProjects: allProjects.slice(0, 3),
  });
});

export default router;
