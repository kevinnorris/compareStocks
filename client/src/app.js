import 'es6-promise/auto';
import 'isomorphic-fetch';

// stylse
import './main.scss';

const Highstocks = require('highcharts/highstock');

Highstocks.theme = {
  chart: {
    backgroundColor: '#eff3f6',
  },
  rangeSelector: {
    buttonTheme: {
      fill: '#e6d2c1',
      states: {
        hover: {
          fill: '#eba160',
        },
        select: {
          fill: '#e3791c',
          hover: {
            fill: '#e3791c',
          },
        },
      },
    },
  },
};

Highstocks.setOptions(Highstocks.theme);

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
              {none: ' USD', value: ' USD', percent: ' %' }[compare];
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

  // remove series from chart by id
  const removeStock = (name) => {
    chart.get(name).remove();
  };

  /*
    DOM manipulation functions
    ----------------------------
  */

  const keyContainer = document.getElementById('chartKeyContainer');
  const stockLoading = document.getElementById('stockLoading');
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
    div.classList.add('card');
    div.classList.add('active');
    div.id = `${name}Key`;
    // Create the button to remove the stock
    const btn = document.createElement('button');
    btn.innerText = 'X';
    btn.className = 'removeBtn';
    btn.addEventListener('click', click);
    // Create the title
    const title = document.createElement('p');
    title.innerText = name;
    title.className = 'chartTitle';
    // Create the colored div
    const keyColor = document.createElement('div');
    // Find the color for the give series
    const seriesIndex = chart.series.findIndex(s => s.name === name);
    keyColor.style.background = chart.series[seriesIndex].color;
    keyColor.style.margin = '0';
    keyColor.style.width = '100%';
    keyColor.style.height = '10px';
    // Append the children to the container
    div.appendChild(btn);
    div.appendChild(title);
    div.appendChild(keyColor);
    // Append the container to the fragment
    fragment.appendChild(div);
    // Add the fragment to the DOM
    // It is insertBefore is used instead of appendChild so that the stock loading
    // widget always show's where the new stock key will appear
    keyContainer.insertBefore(fragment, stockLoading);
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

  // Loading widget for chart
  const chartLoading = document.getElementById('chartLoading');
  const toggleChartLoading = (show) => {
    if (show) {
      chartLoading.classList.remove('hidden');
      chartLoading.classList.add('spinner');
    } else {
      chartLoading.classList.add('hidden');
      chartLoading.classList.remove('spinner');
    }
  };
  // Loading widget for stocks
  const toggleStockLoading = (show) => {
    if (show) {
      stockLoading.classList.remove('hidden');
      stockLoading.classList.add('spinner');
    } else {
      stockLoading.classList.add('hidden');
      stockLoading.classList.remove('spinner');
    }
  };

  /*
    Websocket code
    ----------------------------
  */
  const HOST = location.origin.replace(/^http/, 'ws');
  const socket = new WebSocket(HOST);

  const removeMessage = name => (
    () => {
      socket.send(JSON.stringify({type: 'RemoveStock', name}));
    }
  );

  socket.onopen = function() {
    toggleChartLoading(true);
  };

  socket.onmessage = function(message) {
    const data = JSON.parse(message.data);
    switch (data.type) {
      case 'StockData':
        toggleChartLoading(false);

        if (data.seriesData.length > 0) {
          createChart(data.seriesData);
          for (let i = 0; i < data.seriesData.length; i += 1) {
            addStockKey(data.seriesData[i].name, removeMessage(data.seriesData[i].name));
          }
        }
        break;
      case 'AddStock':
        if (chart) {
          toggleStockLoading(false);
          addStockData(data.data);
          addStockKey(data.data.name, removeMessage(data.data.name));
        } else {
          toggleChartLoading(false);
          createChart([data.data]);
          addStockKey(data.data.name, removeMessage(data.data.name));
        }
        break;
      case 'RemoveStock':
        removeStock(data.name);
        removeStockKey(data.name);
        break;
      case 'Error':
        toggleChartLoading(false);
        toggleStockLoading(false);
        displayError(data.error);
        break;
      default:
        console.log('unknown message recieved');
        break;
    }
  };

  const requestStock = (name) => {
    if (chart) {
      toggleStockLoading(true);
    } else {
      toggleChartLoading(true);
    }
    socket.send(JSON.stringify({type: 'RequestStock', name}));
  };

  const input = document.getElementById('sockSymbolInput');
  const addStockForm = document.getElementById('addStockForm');
  addStockForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const value = input.value.toUpperCase();
    if (value) {
      if (value.length > 8) {
        displayError('The symbol entered is invalid.');
      } else {
        clearError();
        input.value = '';
        requestStock(value);
      }
    } else {
      displayError('You must enter a stock symbol.');
    }
  }, false);

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
