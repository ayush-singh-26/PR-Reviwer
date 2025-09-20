import express from 'express';
import axios from 'axios';
import User from '../models/user.model.js';
const router = express.Router();

router.get('/github', (req, res) => {
    const redirectUri = "http://localhost:4000/auth/github/callback";
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo`;
    res.redirect(url);
});


router.get('/github/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const tokenResp = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code
        }, { headers: { Accept: 'application/json' } });

        const access_token = tokenResp.data.access_token;

        const ghUser = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${access_token}`, Accept: 'application/json' }
        });

        const { id, login } = ghUser.data;

        let user = await User.findOne({ githubId: id });

        if (!user) user = new User({ githubId: id, username: login, accessToken: access_token });
        else user.accessToken = access_token;
        await user.save();

        res.send('Connected to GitHub. You can close this tab.');
    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).send('OAuth failed');
    }
});

export default router;
