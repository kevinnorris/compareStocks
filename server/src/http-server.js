import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';

const app = express();

app.use(bodyParser.json());
app.use(compression({threshold: 0}));

// API routes

const apiRoutes = express.Router();

apiRoutes.get('/', (req, res) => {
  res.json({success: true, message: 'You hit the API!'});
});

app.use('/api', apiRoutes);

// set static files path
app.use(express.static(path.resolve('./client/public')));

export default app;
