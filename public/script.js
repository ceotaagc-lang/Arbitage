// Bitget-only public ticker monitor + client-side simulate trade button.
// WARNING: This only reads public data. It does NOT place trades or use API keys.

const EXCHANGE = {
  name: 'Bitget',
  // Bitget spot public ticker (spot v1)
  // Example: https://api.bitget.com/api/spot/v1/market/ticker?symbol=BTCUSDT
  tickerUrl: (symbol) => `https://api.bitget.com/api/spot/v1/market/ticker?symbol=${symbol}`
};

const SYMBOL_MAP = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT'
};

let monitorInterval = null;
let lastPrice = null;

const statusEl = document.getElementById('status');
const listEl = document.getElementById('opportunities-list');
const startBtn = document.getElementById('startLiveBtn');
const stopBtn = document.getElementById('stopLiveBtn');
const symbolSelect = document.getElementById('symbolSelect');
const pollMsInput = document.getElementById('pollMs');
const simulateTradeBtn = document.getElementById('simulateTradeBtn');
const tradeStatusEl = document.getElementById('trade-status');

function setStatus(s) {
  statusEl.textContent = s;
}

async function fetchBitgetPrice(symbol) {
  const url = EXCHANGE.tickerUrl(symbol);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // Bitget responses can differ depending on endpoint/version.
    // Try a few common shapes defensively:
    // 1) { code: "00000", data: { last: "xxxx", ... } }
    // 2) { data: { last: "xxxx", ... } }
    // 3) { last: "xxxx", ... }
    // 4) array or other shapes -> try to find any numeric string field.

    // Case 1 & 2
    if (json && (json.data || json.result)) {
      const obj = json.data || json.result;
      if (obj && typeof obj === 'object') {
        // Common field names: last, lastPrice, price
        if (obj.last) return parseFloat(obj.last);
        if (obj.lastPrice) return parseFloat(obj.lastPrice);
        if (obj.price) return parseFloat(obj.price);
        // Some endpoints give a list under 'tick' or similar
        if (obj.tick && obj.tick.close) return parseFloat(obj.tick.close);
      }
    }

    // Case 3
    if (json && json.last) return parseFloat(json.last);
    if (json && json.price) return parseFloat(json.price);
    if (json && json.p) return parseFloat(json.p);

    // Fallback: search object for a plausible numeric field
    const findNumeric = (o) => {
      if (!o || typeof o !== 'object') return null;
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string' && !isNaN(parseFloat(v))) return parseFloat(v);
        if (typeof v === 'number' && isFinite(v)) return v;
      }
      return null;
    };

    const numeric = findNumeric(json);
    if (numeric != null) return numeric;

    // No usable price found
    return null;
  } catch (err) {
    console.warn('Bitget fetch error', err);
    return null;
  }
}

async function tick() {
  const symbolKey = symbolSelect.value;
  const mapping = SYMBOL_MAP[symbolKey];
  if (!mapping) {
    setStatus('Symbol mapping not found: ' + symbolKey);
    return;
  }

  setStatus(`Fetching ${mapping} from Bitget...`);
  try {
    const price = await fetchBitgetPrice(mapping);
    const ts = Date.now();
    lastPrice = price != null ? { price, ts } : null;
    renderPrice(lastPrice, symbolKey);
    setStatus(price != null ? `Last update: ${new Date(ts).toLocaleTimeString()}` : 'Price unavailable');
  } catch (err) {
    console.error(err);
    setStatus('Error fetching price: ' + err.message);
  }
}

function renderPrice(p, symbolKey) {
  listEl.innerHTML = '';
  const header = document.createElement('div');
  header.innerHTML = `<strong>Exchange:</strong> ${EXCHANGE.name} &nbsp; <strong>Symbol:</strong> ${symbolKey}`;
  listEl.appendChild(header);

  const priceEl = document.createElement('div');
  if (!p) {
    priceEl.innerHTML = `<div><strong>Price:</strong> N/A</div><div style="color:#a00">Could not parse price from Bitget response.</div>`;
  } else {
    priceEl.innerHTML = `<div><strong>Price:</strong> ${p.price.toLocaleString(undefined, {maximumFractionDigits: 8})} USD</div>
                         <div style="font-size: 12px; color:#666">fetched at ${new Date(p.ts).toLocaleTimeString()}</div>`;
  }
  listEl.appendChild(priceEl);
}

startBtn.addEventListener('click', () => {
  const ms = parseInt(pollMsInput.value, 10) || 10000;
  if (monitorInterval) return;
  tick();
  monitorInterval = setInterval(tick, ms);
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
  if (!lastPrice || lastPrice.price == null) {
    tradeStatusEl.textContent = 'No price available to simulate a trade.';
    return;
  }

  // Simulation params
  const baseAmount = 0.001; // e.g., 0.001 BTC
  const feePctPerSide = 0.1; // 0.1% per side as example
  const buyPrice = lastPrice.price;
  const sellPrice = lastPrice.price; // this is a local simulation — same price used
  const grossUSD = (sellPrice - buyPrice) * baseAmount;
  const feesUSD = (buyPrice * baseAmount) * (feePctPerSide / 100) + (sellPrice * baseAmount) * (feePctPerSide / 100);
  const netUSD = grossUSD - feesUSD;

  tradeStatusEl.innerHTML = `
    Simulated trade on Bitget: buy ${baseAmount} ${symbolSelect.value} at ${buyPrice.toFixed(2)} USD, sell at ${sellPrice.toFixed(2)} USD.<br>
    Gross P/L: ${grossUSD.toFixed(8)} USD. Estimated fees: ${feesUSD.toFixed(8)} USD. Net: ${netUSD.toFixed(8)} USD.<br>
    Note: This simulation uses the same ticker price for buy and sell (client-only). Real trading requires orderbook checks, slippage, transfer times and a backend with API keys.
  `;
});

// Initialize UI
setStatus('Idle. Select symbol and click Start.');
renderPrice(null, symbolSelect.value);
