import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';

// const fs = require('fs');
// const express = require('express');
// const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

// set static files path
app.use(express.static(path.resolve('./client/public')));

app.post('/', (req, res) => {
  console.log('Regular POST message: ', req.body.message);
  return res.json({
    answer: 42,
  });
});

export default app;
