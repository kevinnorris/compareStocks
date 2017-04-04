import WebSocket from 'ws';
import http from 'http';
import app from './http-server';

// https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?api_key=QD8yWR8zHJs_27sSZuzC&column_index=4
// https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?api_key=QD8yWR8zHJs_27sSZuzC&column_index=4&transform=rdiff

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log(`recieved: ${message}`);

    ws.send(JSON.stringify({
      answer: 42,
    }));
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`http/ws server listening on ${process.env.PORT || 8080}`);
});
