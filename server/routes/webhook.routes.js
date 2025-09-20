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
  const computed = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(computed));
}

router.post('/github', async (req, res) => {
  // verify signature
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  if (event !== 'pull_request') return res.status(200).send('ignored');

  const action = req.body.action;
  const pr = req.body.pull_request;
  const owner = req.body.repository.owner.login;
  const repo = req.body.repository.name;
  const prNumber = pr.number;

  // Handle opened, reopened, synchronize (when new commits)
  if (['opened','reopened','synchronize'].includes(action)) {
    try {
      // get files changed in PR
      const filesUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
      // NOTE: need a token with repo access: find a user admin/owner token in DB
      // For simplicity, pick an arbitrary user with repo access (production: track repo->token mapping).
      const user = await User.findOne({ /* find user who installed hook */ });
      if (!user) throw new Error('No token found to call GitHub API');

      const filesResp = await axios.get(filesUrl, { headers: { Authorization: `token ${user.accessToken}` }});
      const files = filesResp.data; // array of files with patch

      // Gather the diffs / file patches (limit to e.g. first 10 files or 100 KB)
      const patches = files.slice(0, 10).map(f => ({ filename: f.filename, patch: f.patch || '' }));

      // Ask Gemini to review
      const reviewText = await reviewPrWithGemini({
        owner, repo, prNumber, prTitle: pr.title, prBody: pr.body, patches
      });

      // Post comment
      const commentUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
      await axios.post(commentUrl, { body: reviewText }, { headers: { Authorization: `token ${user.accessToken}` }});

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
