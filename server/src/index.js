import WebSocket from 'ws';
import http from 'http';
import 'es6-promise/auto';
import 'isomorphic-fetch';
import 'dotenv/config';
import app from './http-server';

// https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?api_key=${process.env.QUANDL_API_KEY}&column_index=4&&order=asc
// https://www.quandl.com/api/v3/datasets/WIKI/FB/data.json?api_key=${process.env.QUANDL_API_KEY}&column_index=4&transform=rdiff
// https://www.quandl.com/api/v3/datatables/WIKI/PRICES.json?ticker=MSFT,YHOO&qopts.columns=date,open&api_key=${process.env.QUANDL_API_KEY}
// Could do combined calls with 3rd api call
// but since has max of 10k rows, even 2 older companies data would not fit in one response
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

// getStockData('FB', (data) => {
//   if (data.error) {
//     console.log(data.error);
//   } else {
//     console.log('data recieved');
//     stocks.push({
//       name: 'FB',
//       data,
//     });
//   }
// });

// Broadcast
wss.broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', (ws) => {
  // Send current stock data
  ws.send(JSON.stringify({type: 'StockData', seriesData: stocks}));

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
              wss.broadcast(JSON.stringify({type: 'AddStock', data: {name, data: stockData}}));
            }
          });
        }
        break;
      }
      default:
        break;
    }
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`http/ws server listening on ${process.env.PORT || 8080}`);
});
