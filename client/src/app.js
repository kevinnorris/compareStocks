import 'es6-promise/auto';
import 'isomorphic-fetch';

// stylse
import './main.scss';

const Highstocks = require('highcharts/highstock');

const colors = [
  '#7cb5ec',
  '#434348',
  '#90ed7d',
  '#f7a35c',
  '#8085e9',
  '#f15c80',
  '#e4d354',
  '#8085e8',
  '#8d4653',
  '#91e8e1',
];
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

  /*
    Chart manipulation functions
    ----------------------------
  */
  const createChart = (data) => {
    chart = new Highstocks.stockChart('chartContainer', chartOptions(data));
  };

  // addSeries to chart
  const addStockData = (data) => {
    if (chart) {
      chart.addSeries(data);
    }
  };

  const removeStock = (name) => {
    // remove stock from seriesData
    const index = seriesData.findIndex(stock => stock.name === name);
    seriesData.splice(index, 1);
    // update chart
    chart.update({
      series: seriesData,
    });
  };

  /*
    DOM manipulation functions
    ----------------------------
  */

  const keyContainer = document.getElementById('chartKeyContainer');
  /**
   * Add a chart key with the name of the stock and a remove stock button
   * to the chartKeyContainer element
   * @param {String} name
   */
  const addstockKey = (name, color) => {
    const fragment = document.createDocumentFragment();
    // Create the chartKey container
    const div = document.createElement('div');
    div.className = 'chartKey';
    div.id = `${name}Key`;
    div.style.borderColor = color;
    // Create the button to remove the stock
    const btn = document.createElement('button');
    btn.innerText = 'X';
    btn.className = 'removeBtn';
    btn.addEventListener('click', () => {
      console.log(`${name} remove button clicked`);
    });
    // Create the title
    const title = document.createElement('p');
    title.innerText = name;
    title.className = 'chartTitle';
    // Append the children to the container
    div.appendChild(btn);
    div.appendChild(title);
    // Append the container to the fragment
    fragment.appendChild(div);
    // Add the fragment to the DOM
    keyContainer.appendChild(fragment);
  };

  const removeStockKey = (name) => {
    const id = `${name}Key`;
    const elem = document.getElementById(id);
    elem.parentNode.removeChild(elem);
  };

  const errorDisplay = document.getElementById('errorDisplay');
  const displayError = (error) => {
    errorDisplay.innerHTML = error;
  };
  const clearError = () => {
    if (errorDisplay.innerHTML.length) {
      errorDisplay.innerHTML = '';
    }
  };

  /*
    Websocket code
    ----------------------------
  */
  const socket = new WebSocket('ws://localhost:8080/');

  socket.onopen = function() {
    console.log('Socket open.');
  };

  socket.onmessage = function(message) {
    const data = JSON.parse(message.data);
    console.log(data);
    switch (data.type) {
      case 'StockData':
        console.log('StockData message recieved');
        if (data.seriesData.length > 0) {
          seriesData = data.seriesData;
          createChart(seriesData);
          addstockKey(seriesData[0].name, colors[0]);
        }
        break;
      case 'AddStock':
        console.log('AddStock message recieved');
        if (chart) {
          seriesData.push(data.data);
          addStockData(data.data);
          addstockKey(data.data.name, colors[seriesData.length - 1]);
        } else {
          seriesData = [data.data];
          createChart(seriesData);
          addstockKey(data.data.name, colors[0]);
        }
        break;
      case 'RemoveStock':
        console.log('RemoveStock message recieved');
        removeStock(data.name);
        removeStockKey(data.name);
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

  const removeAndMessage = name => (
    () => {
      removeStock(name);
      socket.send(JSON.stringify({type: 'RemoveStock', name}));
    }
  );

  // Add event to add stock button
  const input = document.getElementById('sockSymbolInput');
  document.getElementById('addStockBtn').addEventListener('click', () => {
    console.log(`symbol: ${input.value}`);

    const value = input.value.toUpperCase();
    if (value) {
      if (value.length > 8) {
        displayError('The symbol entered is invalid.');
      } else {
        clearError();
        requestStock(value);
      }
    } else {
      displayError('You must enter a stock symbol.');
    }
  });
};
