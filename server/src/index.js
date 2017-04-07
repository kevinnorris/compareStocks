import WebSocket from 'ws';
import http from 'http';
import 'es6-promise/auto';
import 'isomorphic-fetch';
import 'dotenv/config';
import app from './http-server';

const server = http.createServer(app);
const wss = new WebSocket.Server({server});

// Stocks viewed by all users, array of {name, data}
let stocks = [];

const formatTime = data => (
  data.map(d => [new Date(d[0]).getTime(), d[1]])
);

const getStockData = (name, callback) => {
  const url = `https://www.quandl.com/api/v3/datasets/WIKI/${name}` +
    `/data.json?api_key=${process.env.QUANDL_API_KEY}&column_index=4&&order=asc`;

  fetch(url)
    .then(response => response.json())
    .then((json) => {
      if (json.quandl_error) {
        callback({error: json.quandl_error.message});
      } else {
        callback(formatTime(json.dataset_data.data));
      }
    }).catch((err) => {
      callback({error: err.message});
    });
};

// Broadcast
wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', (ws) => {
  // If no stock data get data for tesla and send
  // This way a user does not end up viewing an empty chart on connect
  if (stocks.length === 0) {
    getStockData('TSLA', (data) => {
      if (data.error) {
        ws.send(JSON.stringify({type: 'Error', error: data.error}));
      } else {
        console.log('data recieved');
        stocks.push({
          name: 'TSLA',
          data,
        });

        ws.send(JSON.stringify({type: 'StockData', seriesData: stocks}));
      }
    });
  } else {
    // Send current stock data
    ws.send(JSON.stringify({type: 'StockData', seriesData: stocks}));
  }

  ws.on('message', (message) => {
    console.log(message);
    const data = JSON.parse(message);
    switch (data.type) {
      case 'RequestStock': {
        const name = data.name.toUpperCase();
        // If the stock is not already in stocks
        if (stocks.findIndex(stock => stock.name === name) === -1) {
          getStockData(name, (stockData) => {
            if (stockData.error) {
              console.log(`error occured: ${stockData.error}`);
              ws.send(JSON.stringify({type: 'Error', error: stockData.error}));
            } else {
              console.log('recieved data for:', name);
              stocks.push({
                name,
                data: stockData,
              });
              // Broadcast added stock to all users
              wss.broadcast(JSON.stringify({type: 'AddStock', data: {name, data: stockData, id: name}}));
            }
          });
        }
        break;
      }
      case 'RemoveStock':
        console.log('RemoveStock recieved');
        const index = stocks.findIndex(stock => stock.name === data.name);
        stocks.splice(index, 1);
        wss.broadcast(JSON.stringify({type: 'RemoveStock', name: data.name}));
        break;
      default:
        break;
    }
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`http/ws server listening on ${process.env.PORT || 8080}`);
});
