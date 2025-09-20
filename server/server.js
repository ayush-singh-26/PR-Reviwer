import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/user.routes.js';
import apiRoutes from './routes/api.routes.js';
import webhookRoutes from './routes/webhook.routes.js';

dotenv.config();
const app = express();
app.use(bodyParser.json({limit:'1mb'}));
app.use(cookieParser());

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/webhook', webhookRoutes);

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser:true, useUnifiedTopology:true})
  .then(()=> console.log('Mongo connected'))
  .catch(err=> console.error(err));

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Server listening ${PORT}`));
