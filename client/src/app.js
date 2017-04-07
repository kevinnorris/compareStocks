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
          const compare = this.axis.series[0].userOptions.compare || 'none';
          return (compare !== 'none' && this.value > 0 ? ' + ' : '') + this.value +
              {'none': ' USD', 'value': ' USD', 'percent': ' %' }[compare];
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
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change})<br/>',
      valueDecimals: 2,
      split: true,
    },
    series: seriesData,
  }
);

document.body.onload = () => {
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
    console.log(`Removing stock ${name}`);
    // remove series from chart by id
    chart.get(name).remove();
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
   * @param {String} color
   * @param {function} click  function on remove button clicked
   */
  const addStockKey = (name, click) => {
    const fragment = document.createDocumentFragment();
    // Create the chartKey container
    const div = document.createElement('div');
    div.className = 'chartKey';
    div.id = `${name}Key`;
    // Find the color for the give series
    const seriesIndex = chart.series.findIndex(s => s.name === name);
    div.style.borderColor = chart.series[seriesIndex].color;
    // Create the button to remove the stock
    const btn = document.createElement('button');
    btn.innerText = 'X';
    btn.className = 'removeBtn';
    btn.addEventListener('click', click);
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

  const removeMessage = name => (
    () => {
      socket.send(JSON.stringify({type: 'RemoveStock', name}));
    }
  );

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
          createChart(data.seriesData);
          addStockKey(data.seriesData[0].name, removeMessage(data.seriesData[0].name));
        }
        break;
      case 'AddStock':
        console.log('AddStock message recieved');
        if (chart) {
          addStockData(data.data);
          addStockKey(data.data.name, removeMessage(data.data.name));
        } else {
          createChart([data.data]);
          addStockKey(data.data.name, removeMessage(data.data.name));
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

  const priceBtn = document.getElementById('priceBtn');
  const priceChangeBtn = document.getElementById('priceChangeBtn');
  const percentChangeBtn = document.getElementById('percentChangeBtn');

  let compare = 'none';
  priceBtn.addEventListener('click', () => {
    if (compare !== 'none') {
      compare = 'none';
      chart.yAxis[0].setCompare('none');
      priceBtn.classList.add('active');
      priceChangeBtn.classList.remove('active');
      percentChangeBtn.classList.remove('active');
    }
  });
  priceChangeBtn.addEventListener('click', () => {
    if (compare !== 'value') {
      compare = 'value';
      chart.yAxis[0].setCompare('value');
      priceBtn.classList.remove('active');
      priceChangeBtn.classList.add('active');
      percentChangeBtn.classList.remove('active');
    }
  });
  percentChangeBtn.addEventListener('click', () => {
    if (compare !== 'percent') {
      compare = 'percent';
      chart.yAxis[0].setCompare('percent');
      priceBtn.classList.remove('active');
      priceChangeBtn.classList.remove('active');
      percentChangeBtn.classList.add('active');
    }
  });
};
