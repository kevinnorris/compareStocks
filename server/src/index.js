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
        callback(json);
      } else {
        callback(formatTime(json.dataset_data.data));
      }
    }).catch((err) => {
      callback({error: err.message});
    });
};

getStockData('FB', (data) => {
  if (data.error) {
    console.log(data.error);
  } else {
    console.log('data recieved');
    stocks.push({
      name: 'FB',
      data,
    });
  }
});

wss.on('connection', (ws) => {
  // Send current stock data
  ws.send(JSON.stringify({type: 'StockData', seriesData: stocks}));

  ws.on('getStock', (name) => {
    const nameUpper = name.toUpperCase();
    console.log(`getting stock: ${nameUpper}`);
    // If name not already in stocks
    if (stocks.indexOf(nameUpper) === -1) {
      getStockData(nameUpper, (data) => {
        if (data.error) {
          console.log(`error occured: ${data.error}`);
          // ws.send(JSON.stringify(data));
        } else {
          console.log('recieved data:', data);
          // Format and push to stocks
          // push to all users
        }
      });
    } else {
      ws.send(JSON.stringify({error: `${nameUpper} is not a valid symbol name`}));
    }
  });
});

server.listen(process.env.PORT || 8080, () => {
  console.log(`http/ws server listening on ${process.env.PORT || 8080}`);
});
