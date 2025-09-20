import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import reviewPrWithGemini from '../services/reviewPrWithGemini.js';
import User from '../models/user.model.js';

const router = express.Router();

function verifySignature(req) {
  const sig = req.headers['x-hub-signature-256'];
  if (!sig) return false;

  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const computed =
    'sha256=' + hmac.update(req.body).digest('hex'); // ✅ use raw buffer directly

  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed));
  } catch {
    return false;
  }
}

router.post('/github', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  // ✅ parse JSON after verification
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).send('Invalid JSON');
  }

  const event = req.headers['x-github-event'];
  if (event !== 'pull_request') return res.status(200).send('ignored');

  const action = payload.action;
  const pr = payload.pull_request;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = pr.number;

  if (['opened', 'reopened', 'synchronize'].includes(action)) {
    try {
      const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;

      const user = await User.findOne({});
      if (!user) throw new Error('No token found to call GitHub API');

      const filesResp = await axios.get(filesUrl, {
        headers: { Authorization: `token ${user.accessToken}` },
      });
      const files = filesResp.data;

      const patches = files.slice(0, 10).map(f => ({
        filename: f.filename,
        patch: f.patch || '',
      }));

      const reviewText = await reviewPrWithGemini({
        owner,
        repo,
        prNumber,
        prTitle: pr.title,
        prBody: pr.body,
        patches,
      });

      const commentUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
      await axios.post(
        commentUrl,
        { body: reviewText },
        { headers: { Authorization: `token ${user.accessToken}` } }
      );

      return res.status(200).send('review posted');
    } catch (err) {
      console.error('PR handling error', err.response?.data || err);
      return res.status(500).send('error');
    }
  } else {
    return res.status(200).send('no-op');
  }
});

export default router;
