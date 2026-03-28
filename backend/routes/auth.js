import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findOne, insert } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import { JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = findOne('users', u => u.username === username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, avatar: user.avatar } });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (findOne('users', u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  const user = { id: uuidv4(), username, password: hashedPassword, role: 'user', avatar: null, created_at: new Date().toISOString() };
  insert('users', user);
  res.json({ message: '注册成功' });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未授权' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = findOne('users', u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(401).json({ error: 'Token无效' });
  }
});

export default router;
