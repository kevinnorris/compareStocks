import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();

app.use(bodyParser.json());

// set static files path
app.use(express.static(path.resolve('./client/public')));

// API routes

const apiRoutes = express.Router();

apiRoutes.get('/', (req, res) => {
  res.json({success: true, message: 'You hit the API!'});
});

app.use(apiRoutes);

export default app;
