import express from 'express';
import axios from 'axios';
import User from '../models/user.model.js';
const router = express.Router();

/**
 * POST /api/create-webhook
 * body: { githubId, owner, repo, webhookUrl }
 */

router.post('/create-webhook', async (req, res) => {
  const { githubId, owner, repo, webhookUrl } = req.body;
  const user = await User.findOne({ githubId });
  if (!user) return res.status(404).send('User not found');

  const createHookUrl = `https://api.github.com/repos/${owner}/${repo}/hooks`;
  const payload = {
    name: 'web',
    active: true,
    events: ['pull_request'],
    config: {
      url: webhookUrl,
      content_type: 'json',
      secret: process.env.WEBHOOK_SECRET
    }
  };
  try {
    const resp = await axios.post(createHookUrl, payload, {
      headers: { Authorization: `token ${user.accessToken}`, 'User-Agent':'pr-reviewer' }
    });
    return res.json({ success: true, data: resp.data });
  } catch (err) {
    console.error(err.response?.data || err);
    return res.status(500).json({ success:false, error: err.response?.data || String(err) });
  }
});

export default router;
