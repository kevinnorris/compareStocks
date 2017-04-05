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
  let seriesData = [];
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

  // Websocket code
  const socket = new WebSocket('ws://localhost:8080/');

  socket.onopen = function() {
    console.log('Socket open.');
  };

  socket.onmessage = function(message) {
    console.log(message.data);
    switch (message.data.type) {
      case 'StockData':
        console.log('StockData message recieved');
        seriesData = message.data.seriesData; // Save the data
        createChart(seriesData);
        break;
      case 'AddStock':
        console.log('AddStock message recieved');
        addStockData(message.data.name, message.data.seriesData);
        break;
      case 'RemoveStock':
        console.log('RemoveStock message recieved');
        // remove stock with given name from chart
        break;
      default:
        console.log('unknown message recieved');
        break;
    }
  };

  document.getElementById('addStockBtn').addEventListener('click', () => {
    console.log(`symbol: ${document.getElementById('sockSymbolInput').value}`);
  });
};
