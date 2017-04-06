import 'es6-promise/auto';
import 'isomorphic-fetch';

// stylse
import './main.scss';

const Highstocks = require('highcharts/highstock');

const chartOptions = seriesData => (
  {
    rangeSelector: {
      selected: 4,
    },
    yAxis: {
      labels: {
        formatter: function() {
          return `${this.value > 0 ? ' + ' : ''}${this.value}%`;
        },
      },
      plotLines: [{
        value: 0,
        width: 2,
        color: 'silver',
      }],
    },
    plotOptions: {
      series: {
        compare: 'percent',
        showInNavigator: true,
      },
    },
    tooltip: {
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
      valueDecimals: 2,
      split: true,
    },
    series: seriesData,
  }
);

document.body.onload = () => {
  // let seriesData = [];
  let chart;

  const createChart = (data) => {
    chart = new Highstocks.stockChart('chartContainer', chartOptions(data));
  };

  // addSeries to chart
  const addStockData = (name, data) => {
    if (chart) {
      chart.addSeries({
        name,
        data,
      });
    }
  };

  const errorDisplay = document.getElementById('errorDisplay');
  const displayError = (error) => {
    errorDisplay.innerHTML = error;
  };

  // Websocket code
  const socket = new WebSocket('ws://localhost:8080/');

  socket.onopen = function() {
    console.log('Socket open.');
  };

  socket.onmessage = function(message) {
    // console.log(message.data);
    const data = JSON.parse(message.data);
    console.log(data);
    switch (data.type) {
      case 'StockData':
        console.log('StockData message recieved');
        if (data.seriesData.length > 0) {
          createChart(data.seriesData);
        }
        break;
      case 'AddStock':
        console.log('AddStock message recieved');
        if (chart) {
          addStockData(data.data.name, data.data.data);
        } else {
          createChart([data.data]);
        }
        break;
      case 'RemoveStock':
        console.log('RemoveStock message recieved');
        // remove stock with given name from chart
        break;
      case 'Error':
        displayError(data.error);
        break;
      default:
        console.log('unknown message recieved');
        break;
    }
  };

  const requestStock = (name) => {
    socket.send(JSON.stringify({type: 'RequestStock', name}));
  };

  // DOM interaction code
  const input = document.getElementById('sockSymbolInput');
  const error = document.getElementById('errorDisplay');
  document.getElementById('addStockBtn').addEventListener('click', () => {
    console.log(`symbol: ${input.value}`);

    const value = input.value.toUpperCase();
    if (value) {
      if (value.length > 8) {
        error.innerHTML = 'The symbol entered is invalid.';
      } else {
        if (error.innerHTML.length) {
          error.innerHTML = '';
        }
        requestStock(value);
      }
    } else {
      error.innerHTML = 'You must enter a stock symbol.';
    }
  });
};
