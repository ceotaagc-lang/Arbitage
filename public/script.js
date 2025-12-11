// Live market monitor for simple arbitrage across Binance and Coinbase public tickers.
// WARNING: This script only fetches public prices and simulates trades locally.
// To place real trades, implement a secure backend to hold API keys and sign requests.

const EXCHANGES = {
  binance: {
    name: 'Binance',
    // Binance uses symbols like BTCUSDT, ETHUSDT
    tickerUrl: (sym) => `https://api.binance.com/api/v3/ticker/price?symbol=${sym}`
  },
  coinbase: {
    name: 'Coinbase Pro',
    // Coinbase Pro product ids like BTC-USD, ETH-USD
    tickerUrl: (prod) => `https://api.pro.coinbase.com/products/${prod}/ticker`
  }
};

const SYMBOL_MAP = {
  BTC: {
    binance: 'BTCUSDT',
    coinbase: 'BTC-USD'
  },
  ETH: {
    binance: 'ETHUSDT',
    coinbase: 'ETH-USD'
  },
  // Add more mappings if needed
  USDT: {
    binance: 'USDTUSDT', // placeholder (not useful) — add proper mapping or remove
    coinbase: 'USDT-USD'
  }
};

let monitorInterval = null;
let pollingMs = 10000; // 10s
let lastPrices = {}; // { exchange: {price, ts} }

const statusEl = document.getElementById('status');
const listEl = document.getElementById('opportunities-list');
const startBtn = document.getElementById('startLiveBtn');
const stopBtn = document.getElementById('stopLiveBtn');
const symbolSelect = document.getElementById('symbolSelect');
const thresholdInput = document.getElementById('thresholdInput');
const simulateTradeBtn = document.getElementById('simulateTradeBtn');
const tradeStatusEl = document.getElementById('trade-status');

function setStatus(s) {
  statusEl.textContent = s;
}

async function fetchBinancePrice(symbol) {
  try {
    const res = await fetch(EXCHANGES.binance.tickerUrl(symbol));
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = await res.json();
    // { symbol: 'BTCUSDT', price: '...' }
    return parseFloat(data.price);
  } catch (err) {
    console.warn('Binance fetch error', err);
    return null;
  }
}

async function fetchCoinbasePrice(productId) {
  try {
    const res = await fetch(EXCHANGES.coinbase.tickerUrl(productId));
    if (!res.ok) throw new Error(`Coinbase HTTP ${res.status}`);
    const data = await res.json();
    // { trade_id:..., price: '...', size: '...', time: '...' }
    return parseFloat(data.price);
  } catch (err) {
    console.warn('Coinbase fetch error', err);
    return null;
  }
}

async function fetchPrices(symbolKey) {
  const mapping = SYMBOL_MAP[symbolKey];
  if (!mapping) throw new Error('Symbol mapping not found: ' + symbolKey);

  const [binPrice, coinPrice] = await Promise.all([
    fetchBinancePrice(mapping.binance),
    fetchCoinbasePrice(mapping.coinbase)
  ]);

  const now = Date.now();
  lastPrices = {
    binance: { price: binPrice, ts: now },
    coinbase: { price: coinPrice, ts: now }
  };

  return lastPrices;
}

function computeSpread(a, b) {
  if (a == null || b == null) return null;
  // compute (higher - lower) / lower * 100
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  const pct = ((high - low) / low) * 100;
  const direction = a > b ? 'binance>coinbase' : 'coinbase>binance';
  const winner = a > b ? 'binance' : 'coinbase';
  const loser = a > b ? 'coinbase' : 'binance';
  return { pct, high, low, winner, loser, direction };
}

function renderPrices(prices, spread, symbolKey) {
  listEl.innerHTML = '';

  const header = document.createElement('div');
  header.innerHTML = `<strong>Symbol:</strong> ${symbolKey} — fetched at ${new Date().toLocaleTimeString()}`;
  listEl.appendChild(header);

  const table = document.createElement('div');
  table.className = 'prices';
  const b = prices.binance.price;
  const c = prices.coinbase.price;
  table.innerHTML = `
    <div><strong>${EXCHANGES.binance.name}:</strong> ${b != null ? b.toLocaleString() : 'N/A'}</div>
    <div><strong>${EXCHANGES.coinbase.name}:</strong> ${c != null ? c.toLocaleString() : 'N/A'}</div>
  `;
  listEl.appendChild(table);

  const spreadEl = document.createElement('div');
  if (spread == null) {
    spreadEl.textContent = 'Spread: N/A (one or more prices missing)';
  } else {
    const threshold = parseFloat(thresholdInput.value) || 0;
    spreadEl.innerHTML = `<strong>Spread:</strong> ${spread.pct.toFixed(4)}% — ${spread.direction}`;
    if (spread.pct >= threshold) {
      spreadEl.style.background = '#efe';
      spreadEl.style.padding = '8px';
      spreadEl.style.marginTop = '8px';
    } else {
      spreadEl.style.marginTop = '8px';
    }
  }
  listEl.appendChild(spreadEl);
}

async function tick() {
  const symbol = symbolSelect.value;
  setStatus('Fetching prices...');
  try {
    const prices = await fetchPrices(symbol);
    const spread = computeSpread(prices.binance.price, prices.coinbase.price);
    renderPrices(prices, spread, symbol);
    setStatus('Last update: ' + new Date().toLocaleTimeString());
  } catch (err) {
    console.error(err);
    setStatus('Error fetching prices: ' + err.message);
  }
}

startBtn.addEventListener('click', () => {
  if (monitorInterval) return;
  tick(); // immediate
  monitorInterval = setInterval(tick, pollingMs);
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus('Live monitoring started.');
});

stopBtn.addEventListener('click', () => {
  if (!monitorInterval) return;
  clearInterval(monitorInterval);
  monitorInterval = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('Stopped.');
});

simulateTradeBtn.addEventListener('click', () => {
  const prices = lastPrices;
  if (!prices || !prices.binance || !prices.coinbase) {
    tradeStatusEl.textContent = 'No prices available to simulate trade.';
    return;
  }
  const s = computeSpread(prices.binance.price, prices.coinbase.price);
  if (!s) {
    tradeStatusEl.textContent = 'Cannot compute spread.';
    return;
  }

  // Simulation parameters (client-side only)
  const amountBase = 0.001; // e.g., 0.001 BTC
  const feePct = 0.1; // fee percent per side (0.1%)
  const feeFactor = (p) => p * (feePct / 100);

  // Simulate buy on loser (low price) and sell on winner (high price)
  const buyPrice = s.low;
  const sellPrice = s.high;
  const gross = (sellPrice - buyPrice) * amountBase;
  const fees = feeFactor(buyPrice * amountBase) + feeFactor(sellPrice * amountBase);
  const net = gross - fees;

  tradeStatusEl.innerHTML = `
    Simulated trade: buy ${amountBase} ${symbolSelect.value} at ${buyPrice.toFixed(2)}, sell at ${sellPrice.toFixed(2)}.<br>
    Gross P/L: ${gross.toFixed(8)} USD (approx). Fees: ${fees.toFixed(8)} USD. Net: ${net.toFixed(8)} USD.<br>
    Note: This is only a simulation. Real execution requires checking order book depth, slippage, transfer times, and fees on each exchange.
  `;
});

// Initialize small UI state
setStatus('Idle. Select a symbol and click "Start Live Monitoring".');
