//const API_URL = 'https://api.intotheblock.com';
const API_URL = 'http://localhost:9000/api';
//const api_key = new URLSearchParams(window.location.search).get('apiKey');
const api_key = "sUUhBkXPS03KoZz106Anr4T3EWz3HIEp50Ib9u5b"
const DateTime = luxon.DateTime;
let time_range;
let group_by = '1h'; 
let auto_refresh_interval;
let position;
let metrics;
let partner_config;

const TOKENS_UNDERLYING_AMOUNT_TABS = {
  percent: 'percent',
  tokens: 'tokens'
}

let tokens_underlying_amount_active_tab = TOKENS_UNDERLYING_AMOUNT_TABS.percent;

BigNumber.config({ 
  FORMAT: {
    decimalSeparator: '.',
    groupSeparator: ''
  }
});

const show_loader = () => document.querySelector('.loader').style.display = 'flex';
const hide_loader = () => document.querySelector('.loader').style.display = 'none';
const format_as_percentage = (value, decimal_places = 3) => value ? `${(parseFloat(value) * 100).toLocaleString('en-US', { maximumFractionDigits: decimal_places })}%` : '--';
const format_as_symbol = (value, decimal_places = 3) => value ? `${parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: decimal_places })} ${position.symbol}` : `--`;
const format_as_coin = (value, symbol, decimal_places = 3) => value ? `${parseFloat(value).toLocaleString('en-US', { maximumFractionDigits: decimal_places })} ${symbol}` : `--`;

const downloadStringFile = ({ name, content }) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:application/octet-stream,' + encodeURIComponent(content));
  element.setAttribute('download', name);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

const downloadCsv = (data, attrs, fileName) => {
  let csvString = attrs.map(a => a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(',')
  csvString += "\r\n"
  csvString += data.map(d => attrs.map(a => {
      let val = (d[a] === 0 ? d[a] : (d[a] || '')).toString().replace(/\n/g, ' ')
      return val.match(/[,"]/) ? `"${ val.replace(/"/g, '""') }"` : val
  }).join(',')).join("\r\n");
  
  downloadStringFile({ name: fileName, content: csvString });
}

const buildChart = options => ({
  xAxis: {
    type: 'datetime',
    crosshair: false,
    ordinal: false,
    title: {
      text: 'Time (UTC)'
    }
  },
  credits: {
    enabled: false
  },
  legend: {
    enabled: options.series.length > 1
  },
  rangeSelector: {
    enabled: false
  },
  ...options
});

const buildSeries = ({ metrics, name, key, yAxis = 0, visible = true, tooltip, showInNavigator = true, accessor, extra = {} }) =>  {
  const accessorFn = accessor ? accessor : m => m[key];

  return {
    name,
    data: metrics.map(m => ([new Date(m.timestamp).valueOf(), parseFloat(accessorFn(m))])),
    yAxis,
    visible,
    tooltip,
    showInNavigator,
    ...extra
  }
}

const load_coins_liquidity = metrics => {
  const container = document.querySelector('#coins-liquidity-metric .chart');
  const activeTab = document.querySelector('#coins-liquidity-tabs button.active').dataset.value;

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  const series = metrics[0].coins.map((coin, i) => buildSeries({
    metrics,
    name: coin.symbol,
    accessor: m => m.coins[i].liquidity,
    yAxis: activeTab === COIN_LIQUIDITY_TABS.percent ? 0 : i + 1
  }));

  Highcharts.stockChart(container, buildChart({
    chart: {
      type: activeTab === COIN_LIQUIDITY_TABS.percent ? 'area' : 'line'
    },
    plotOptions: {
      area: {
        stacking: 'percent'
      }
    },
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function() {
            return `${this.value}%`;
          }
        }
      },
      ...metrics[0].coins.map((coin, i) => ({
        opposite: i % 2 !== 0,
        title: {
          enabled: false
        },
        visible: activeTab === COIN_LIQUIDITY_TABS.coins,
        labels: {
          formatter: function() {
            return `${format_as_coin(this.value, coin.symbol)}`
          },
          x: 0,
          y: -2,
          align: i % 2 !== 0 ? 'right': 'left'
        }
      }))
    ],
    series,
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, this.series.name)}${activeTab === COIN_LIQUIDITY_TABS.percent ? ` (${format_as_percentage(this.percentage / 100)})` : '' } </b>`
      }
    }
  }));
}

const load_rewards_apy = metrics => {
  const container = document.querySelector('#rewards-apy-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  const series = metrics[0].rewards.map((reward, i) => buildSeries({
    metrics,
    name: `${ i === 0 ? 'LPT pool' : i === 1 ? 'CAKE pool' : 'Net'} APY`,
    accessor: m => m.rewards[i].APY
  }));

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return format_as_percentage(this.value);
          }
        }
      },
      {
        labels: {
          formatter: function () {
            return `${this.value}`;
          }
        }
      }
    ],
    series,
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_percentage(this.y)}</b>`
      }
    }
  }));
}

const load_return_from_lpt = metrics => {
  const container = document.querySelector('#lpt-staking-return-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        labels: {
          formatter: function () {
            return format_as_symbol(this.value);
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Return', key: 'return_from_lpt_as_position_token' }),
    ],
    tooltip: {
      pointFormatter: function() {
        const related_metric = metrics.find(m => new Date(m.timestamp).valueOf() === this.x);

        return `
          Return: <b>${format_as_symbol(this.y)}</b><br />
          Return %: <b>${format_as_percentage(related_metric.return)}</b><br />
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Accrued LPT on pool: <b>${format_as_coin(related_metric.reward_0_net, 'LPT')} (${format_as_symbol(related_metric.reward_0_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Claimed CAKE from lpt pool: <b>${format_as_coin(related_metric.reward_0_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_0_claimed_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Accrued CAKE on pool: <b>${format_as_coin(related_metric.reward_1_net, 'CAKE')} (${format_as_symbol(related_metric.reward_1_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Claimed CAKE from cake pool: <b>${format_as_coin(related_metric.reward_1_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_1_claimed_as_base)})</b><br />` : ''}
        `
      }
    },
  }));
}

const load_return_from_cake = metrics => {
  const container = document.querySelector('#cake-staking-return-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        labels: {
          formatter: function () {
            return format_as_symbol(this.value);
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Return', key: 'return_from_cake_as_position_token' }),
    ],
    tooltip: {
      pointFormatter: function() {
        const related_metric = metrics.find(m => new Date(m.timestamp).valueOf() === this.x);

        return `
          Return: <b>${format_as_symbol(this.y)}</b><br />
          Return %: <b>${format_as_percentage(related_metric.return)}</b><br />
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Accrued LPT on pool: <b>${format_as_coin(related_metric.reward_0_net, 'LPT')} (${format_as_symbol(related_metric.reward_0_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Claimed CAKE from lpt pool: <b>${format_as_coin(related_metric.reward_0_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_0_claimed_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Accrued CAKE on pool: <b>${format_as_coin(related_metric.reward_1_net, 'CAKE')} (${format_as_symbol(related_metric.reward_1_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Claimed CAKE from cake pool: <b>${format_as_coin(related_metric.reward_1_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_1_claimed_as_base)})</b><br />` : ''}
        `
      }
    },
  }));
}

const load_total_return = metrics => {
  const container = document.querySelector('#total-return-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        labels: {
          formatter: function () {
            return format_as_symbol(this.value);
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Return', key: 'total_returns_as_position_token' }),
    ],
    tooltip: {
      pointFormatter: function() {
        const related_metric = metrics.find(m => new Date(m.timestamp).valueOf() === this.x);

        return `
          Return: <b>${format_as_symbol(this.y)}</b><br />
          Return %: <b>${format_as_percentage(related_metric.return)}</b><br />
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Accrued LPT on pool: <b>${format_as_coin(related_metric.reward_0_net, 'LPT')} (${format_as_symbol(related_metric.reward_0_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_0_symbol !== 'no-data' ? `Claimed CAKE from lpt pool: <b>${format_as_coin(related_metric.reward_0_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_0_claimed_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Accrued CAKE on pool: <b>${format_as_coin(related_metric.reward_1_net, 'CAKE')} (${format_as_symbol(related_metric.reward_1_net_as_base)})</b><br />` : ''}
          ${related_metric.rewards_1_symbol !== 'no-data' ? `Claimed CAKE from cake pool: <b>${format_as_coin(related_metric.reward_1_claimed, 'CAKE')} (${format_as_symbol(related_metric.reward_1_claimed_as_base)})</b><br />` : ''}
        `
      }
    },
  }));
}

const load_lpt_total_supply = metrics => {
  const container = document.querySelector('#lpt-total-supply-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'LPT')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'LPT Total Supply', key: 'lpt_total_supply' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'LPT')}</b>`
      }
    }
  }));
}

const load_cake_total_supply = metrics => {
  const container = document.querySelector('#cake-total-supply-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'LPT')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Cake Total Supply', key: 'cake_total_supply' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'LPT')}</b>`
      }
    }
  }));
}

const load_cake_accrued_from_lpt = metrics => {
  const container = document.querySelector('#cake-accrued-lpt-pool-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'CAKE')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Cake Accrued from lpt pool', key: 'cake_accrued_from_lpt' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'CAKE')}</b>`
      }
    }
  }));
}

const load_cake_accrued_from_cake = metrics => {
  const container = document.querySelector('#cake-accrued-cake-pool-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'CAKE')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Cake Accrued from cake pool', key: 'cake_accrued_from_cake' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'CAKE')}</b>`
      }
    }
  }));
}

const load_cake_accrued_from_lpt_as_base = metrics => {
  const container = document.querySelector('#cake-accrued-lpt-pool-as-base-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'LPT')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Cake Accrued from LPT pool as base', key: 'cake_accrued_from_lpt_as_base' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'LPT')}</b>`
      }
    }
  }));
}

const load_cake_accrued_from_cake_as_base = metrics => {
  const container = document.querySelector('#cake-accrued-cake-pool-as-base-metric .chart');

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  Highcharts.stockChart(container, buildChart({
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function () {
            return `${format_as_coin(this.value, 'LPT')}`;
          }
        }
      }
    ],
    series: [
      buildSeries({ metrics, name: 'Cake Accrued from CAKE pool as base', key: 'cake_accrued_from_cake_as_base' }),
    ],
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, 'LPT')}</b>`
      }
    }
  }));
}

const load_tokens_underlying_amount = metrics => {
  const container = document.querySelector('#tokens-underlying-amount-metric .chart');
  const activeTab = document.querySelector('#tokens-underlying-amount-tabs button.active').dataset.value;

  if (!metrics.length) {
    container.innerHTML = ``;
    return;
  }

  const series = metrics[0].tokens.map((token, i) => buildSeries({
    metrics,
    name: token.symbol,
    accessor: m => m.tokens[i].amount,
    yAxis: activeTab === TOKENS_UNDERLYING_AMOUNT_TABS.percent ? 0 : i + 1
  }));

  Highcharts.stockChart(container, buildChart({
    chart: {
      type: activeTab === TOKENS_UNDERLYING_AMOUNT_TABS.percent ? 'area' : 'line'
    },
    plotOptions: {
      area: {
        stacking: 'percent'
      }
    },
    yAxis: [
      {
        opposite: false,
        labels: {
          align: 'left',
          x: 0,
          y: -3,
          formatter: function() {
            return `${this.value}%`;
          }
        }
      },
      ...metrics[0].tokens.map((token, i) => ({
        opposite: i % 2 !== 0,
        title: {
          enabled: false
        },
        visible: activeTab === TOKENS_UNDERLYING_AMOUNT_TABS.tokens,
        labels: {
          formatter: function() {
            return `${format_as_coin(this.value, token.symbol)}`
          },
          x: 0,
          y: -2,
          align: i % 2 !== 0 ? 'right': 'left'
        }
      }))
    ],
    series,
    tooltip: {
      pointFormatter: function() {
        return `${this.series.name}: <b>${format_as_coin(this.y, this.series.name)}${activeTab === TOKENS_UNDERLYING_AMOUNT_TABS.percent ? ` (${format_as_percentage(this.percentage / 100)})` : '' } </b>`
      }
    }
  }));
}

const load_highlight = ({ id, title, value, formatter }) => {
  const titleContainer = document.querySelector(`${id} .title`);
  const valueContainer = document.querySelector(`${id} .value`);
  const v = parseFloat(value);
  valueContainer.innerHTML = formatter ? formatter(v) : v;

  if (title)
    titleContainer.innerHTML = title

}

const load_address = address => {
  const anchor = document.getElementById('address');
  anchor.href = `https://bscscan.com/address/${address}`;
}

const load_positions = async () => {
  const url = new URL(`${API_URL}/strategies/${window.strategy}/positions`);
  partner_config = await fetch(url, { headers: { 'X-Api-Key': api_key } }).then(r => r.json());
  const positions = partner_config.positions;
  const positions_switch = document.getElementById('position');
  position = positions[0];
  
  document.querySelector('.export-monthly-returns').style.display = partner_config.pnl_config === undefined ? 'none' : 'block';

  if (positions.length > 1) {
    for (const pos of positions) {
      const button = document.createElement("button");
      button.dataset.value = pos.address;
      button.dataset.pool = pos.pool;
      button.innerText = pos.name;

      if (pos === position)
        button.classList.add('active');

      positions_switch.append(button)
    }
    
    positions_switch.onclick = e => {
      position = positions.find(p => p.address === e.target.dataset.value && p.pool === e.target.dataset.pool);
      document.querySelectorAll('#position button').forEach(b => b.classList.remove('active'));
      document.querySelector('.export-monthly-returns').style.display = partner_config.pnl_config === undefined ? 'none' : 'block';
      e.target.classList.add('active');
      
      load();
    }
  } else {
    document.querySelector('.position-switch-container').style.display = 'none';
  }
}

const load_rewards_highlights = net_return => {
  if (!net_return.length)
    return;

  const last_metric = net_return[net_return.length - 1];
  let total = 0;

  for (let i = 0; i < 4; i++) {
    const container = document.getElementById(`reward-${i}`);
    const symbol = last_metric[`rewards_${i}_symbol`];

    if (symbol === 'no-data')
      container.style.display = 'none';
    else {
      const amount = last_metric[`reward_${i}_net`];
      const amount_as_base = last_metric[`reward_${i}_net_as_base`];
      const title = container.querySelector('.title');
      const value = container.querySelector('.value');

      title.innerText = symbol;
      value.innerText = `${format_as_coin(amount, symbol)} (${format_as_symbol(amount_as_base)})`;

      total += amount_as_base;

      container.style.display = 'inline-block';
    }
  }

  const container = document.querySelector('#rewards-total .value');
  container.innerText = format_as_symbol(total);
}

const update_data_by_cake_boost = cake_boost => {
  const both_returns = document.getElementById('both-returns-container'),
        total_return = document.getElementById('total-return-metric-container'),
        apy_tokens_underlying = document.getElementById('apy-tokens-underlying-container'),
        cake_accrued = document.getElementById('cake-accrued-metrics-container'),
        cake_exit_fee = document.getElementById('cake-exit-fee-highlight'),
        apy_lpt_return = document.getElementById('apy-lpt-return-container')

  if (cake_boost){
    apy_lpt_return.style.display = 'none'
  } else {
    

    both_returns.style.display = 'none'
    total_return.style.display = 'none'
    apy_tokens_underlying.style.display = 'none'
    cake_accrued.style.display = 'none'
    cake_exit_fee.style.display = 'none'
  }
  



  const cake_ids = ['cake-total-supply-metric', 'cake-accrued-cake-pool-metric', 'cake-accrued-cake-pool-as-base-metric', 'cake-staking-return-metric', 'cake-exit-fee-highlight']

}

const load = async () => {
  show_loader();

  const url = new URL(`${API_URL}/strategies/${window.strategy}/metrics`);
  const params = {};

  if (time_range)
    params.time_range = time_range;
  
  if (group_by)
    params.group_by = group_by;

  params.address = position.address;
  params.pool = position.pool;

  url.search = new URLSearchParams(params).toString();

  metrics = await fetch(url, { headers: { 'X-Api-Key': api_key } }).then(r => r.json());

  

  console.log(metrics)
  console.log(position)

  // Metrics

  load_tokens_underlying_amount(metrics.tokens_underlying_amount);
  load_rewards_apy(metrics.rewards_apy);
  load_return_from_lpt(metrics.net_return); 
  load_lpt_total_supply(metrics.lpt_total_supply);
  load_cake_accrued_from_lpt(metrics.cake_accrued_from_lpt);
  load_cake_accrued_from_lpt_as_base(metrics.cake_accrued_from_lpt_as_base);
  
  if (position.cake_boost) {
    load_cake_total_supply(metrics.cake_total_supply);
    load_cake_accrued_from_cake(metrics.cake_accrued_from_cake);
    load_cake_accrued_from_cake_as_base(metrics.cake_accrued_from_cake_as_base);
    load_return_from_cake(metrics.net_return);
    load_total_return(metrics.net_return);
  }


  const last_lpt_total_supply_metric = metrics.lpt_total_supply[metrics.lpt_total_supply.length - 1] || {};
  const last_cake_total_supply_metric = metrics.cake_total_supply[metrics.cake_total_supply.length - 1] || {};
  const last_tokens_underlying_amount_metric = metrics.tokens_underlying_amount[metrics.tokens_underlying_amount.length - 1] || {};
  const tokenAsymbol = last_tokens_underlying_amount_metric.tokens['0'].symbol;
  const tokenBsymbol = last_tokens_underlying_amount_metric.tokens['1'].symbol;

  // Highlights
  load_highlight({ id: '#lpt-total-supply-highlight', value: last_lpt_total_supply_metric.lpt_total_supply, formatter: v => format_as_coin(v, 'LPT')});
  load_highlight({ id: '#cake-total-supply-highlight', value: last_cake_total_supply_metric.cake_total_supply, formatter: v => format_as_coin(v, 'CAKE')});
  load_highlight({ id: '#token-A-underlying-amount-highlight', title: `${tokenAsymbol} Underlying Amount`, value: last_tokens_underlying_amount_metric.tokens['0'].amount, formatter: v => format_as_coin(v, tokenAsymbol)});
  load_highlight({ id: '#token-B-underlying-amount-highlight', title: `${tokenBsymbol} Underlying Amount`, value: last_tokens_underlying_amount_metric.tokens['1'].amount, formatter: v => format_as_coin(v, tokenBsymbol)});

  load_highlight({ id: '#annualized-return-1d-highlight', value: metrics.general.annualized_return_1d,formatter: format_as_percentage });
  load_highlight({ id: '#annualized-return-7d-highlight', value: metrics.general.annualized_return_7d, formatter: format_as_percentage});
  load_highlight({ id: '#annualized-return-30d-highlight', value: metrics.general.annualized_return_30d, formatter: format_as_percentage });
  load_highlight({ id: '#annualized-return-all-time-highlight', value: metrics.general.annualized_return_all, formatter: format_as_percentage });
  /* load_highlight({ id: '#lpt-exit-fee-highlight', value: metrics.general.lpt_exit_fee, formatter: format_as_percentage }); 
  load_highlight({ id: '#cake-exit-fee-highlight', value: metrics.general.cake_exit_fee, formatter: format_as_percentage }); */

  // Address
  load_address(position.address);

  hide_loader();
}

window.load_dashboard = async () => {
  await fetch("../common/pancake_staking_dashboard.html")
    .then((response) => response.text())
    .then((html) => {
      document.querySelector("body").innerHTML = html;
    })
    .catch((error) => {
      console.warn(error);
    });
    
  document.title = `ITB-${window.partner_name} Pancake Staking Strategy`
  document.getElementById('partner-name').innerText = window.partner_name;

  show_loader();
  await load_positions();
  load();

  document.querySelector('#time-range').onclick = e => {
    time_range = e.target.dataset.value;
    document.querySelectorAll('#time-range button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    load();
  }

  document.querySelector('#group-by').onclick = e => {
    group_by = e.target.dataset.value;
    document.querySelectorAll('#group-by button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    load();
  }

  document.querySelector('#auto-refresh').addEventListener('change', e => {
    const on = e.target.checked;
    if (on)
      auto_refresh_interval = setInterval(load, 1000 * 60 * 5)
    else
      clearInterval(auto_refresh_interval);
  });

  document.querySelector('#refresh').addEventListener('click', load);
  
  document.querySelector('#export-management-events').onclick = async e => {
    show_loader();

    const url = new URL(`${API_URL}/strategies/${window.strategy}/management_events`);
    url.search = new URLSearchParams({ address: position.address, pool: position.pool }).toString();
    let events = await fetch(url, { headers: { 'X-Api-Key': api_key } }).then(r => r.json());

    events = events.map(e => ({
      ...e,
      token_0_underlying_change: new BigNumber(e.token_0_underlying_change || 0).toFormat(),
      token_1_underlying_change: new BigNumber(e.token_1_underlying_change || 0).toFormat(),
      lpt_staking_change: new BigNumber(e.lpt_staking_change || 0).toFormat(),
      cake_staking_change: new BigNumber(e.cake_staking_change || 0).toFormat(),
      reward_0_claimed: new BigNumber(e.reward_0_claimed || 0).toFormat(),
      reward_0_claimed_as_base: new BigNumber(e.reward_0_claimed_as_base || 0).toFormat(),
      reward_1_claimed: new BigNumber(e.reward_1_claimed || 0).toFormat(),
      reward_1_claimed_as_base: new BigNumber(e.reward_1_claimed_as_base || 0).toFormat(),
      fee: new BigNumber(e.fee).toFormat(),
      fee_amount: new BigNumber(e.fee_amount).toFormat(),
      gas_price: new BigNumber(e.gas_price).toFormat(),
    }))

    if (events.length) {
      const keys = Object.keys(events[0]);
      downloadCsv(events, keys, `ITB_${window.partner_name}_pancake-staking_${position.name.split(' ').join('-')}_management-events_${new Date().toISOString()}.csv`)
    }
    else
      alert(`There are no management events for position '${position.name}'`);

    hide_loader();
  }

  document.querySelector('#export-returns-snapshots').onclick = async e => {
    show_loader();

    const url = new URL(`${API_URL}/strategies/${window.strategy}/metrics`);
    url.search = new URLSearchParams({ group_by: '1d', address: position.address, pool: position.pool }).toString();
    const metrics = await fetch(url, { headers: { 'X-Api-Key': api_key } }).then(r => r.json());

    const out = metrics.net_return.map(m => {
      const mapped = {
        timestamp: m.timestamp,
        [`return as ${position.symbol} from lpt pool`]: new BigNumber(m.return_from_lpt_as_position_token).toFormat(),
        [`return as ${position.symbol} from cake pool`]: new BigNumber(m.return_from_cake_as_position_token).toFormat()
      }

      
      mapped[`cake_accrued`] = new BigNumber(m[`reward_0_net`]).toFormat();
      mapped[`cake_accrued_as_${position.symbol}`] = new BigNumber(m[`reward_0_net_as_base`]).toFormat();
      mapped[`cake_claimed`] = new BigNumber(m[`reward_0_claimed`]).toFormat();
      mapped[`cake_claimed_as_${position.symbol}`] = new BigNumber(m[`reward_0_claimed_as_base`]).toFormat();

      if (position.cake_boost) {
        mapped[`cake_accrued_by_boost`] = new BigNumber(m[`reward_1_net`]).toFormat();
        mapped[`cake_accrued_as_${position.symbol}_by_boost`] = new BigNumber(m[`reward_1_net_as_base`]).toFormat();
        mapped[`cake_claimed_by_boost`] = new BigNumber(m[`reward_1_claimed`]).toFormat();
        mapped[`cake_claimed_as_${position.symbol}_by_boost`] = new BigNumber(m[`reward_1_claimed_as_base`]).toFormat();
      }

      return mapped;
    });

    if (out.length) {
      const keys = Object.keys(out[0]);
      downloadCsv(out, keys, `ITB_${window.partner_name}_pancake-staking_${position.name.split(' ').join('-')}_return-snapshots_${new Date().toISOString()}.csv`)
    }
    else
      alert(`There are no return snapshots for position '${position.name}'`);

    hide_loader();
  }

  document.querySelector('#tokens-underlying-amount-tabs').onclick = e => {
    document.querySelectorAll('#tokens-underlying-amount-tabs button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    load_tokens_underlying_amount(metrics.tokens_underlying_amount);
  }
}