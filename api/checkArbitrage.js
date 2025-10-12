const fetch = require('node-fetch');
const crypto = require('crypto');
// Assume you'll need the API keys and signing for other exchanges too
// For simplicity, we'll simulate a second exchange or just check Bitget for this example.

// Bitget API configuration
const API_KEY = process.env.BITGET_API_KEY;
const API_SECRET = process.env.BITGET_API_SECRET;
const API_PASSPHRASE = process.env.BITGET_API_PASSPHRASE;
const MIN_TRADE_AMOUNT_USDT = parseFloat(process.env.MIN_TRADE_AMOUNT_USDT) || 10;
const PROFIT_THRESHOLD_PERCENT = parseFloat(process.env.PROFIT_THRESHOLD_PERCENT) || 0.05;

// Helper function for Bitget signing
function signRequest(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', API_SECRET);
    return hmac.update(message).digest('base64');
}

module.exports = async (req, res) => {
    const { tokenSymbol = 'eth' } = req.query;
    const tradingPair = `${tokenSymbol.toUpperCase()}USDT`;

    // 1. Fetch Price from Exchange 1 (Bitget)
    let bitgetPrice;
    try {
        const bitgetResponse = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${tradingPair}`);
        const bitgetData = await bitgetResponse.json();
        if (bitgetData.code === '00000' && bitgetData.data && bitgetData.data.length > 0) {
            bitgetPrice = parseFloat(bitgetData.data.lastPr);
        } else {
            console.error('Error fetching Bitget price:', bitgetData.msg);
            return res.status(500).json({ error: 'Could not fetch Bitget price.' });
        }
    } catch (error) {
        console.error('Network error fetching Bitget price:', error);
        return res.status(500).json({ error: 'Network error fetching Bitget price.' });
    }

    // 2. Fetch Price from Exchange 2 (SIMULATED or another REAL API like Binance, OKX, etc.)
    // For a real bot, you'd add similar fetch logic for another exchange.
    // This example uses a simulation for the second exchange price.
    const exchange2Name = 'SimulatedExch';
    const exchange2Price = bitgetPrice * (1 + (Math.random() * 0.002 - 0.001)); // Simulate a +/- 0.1% difference

    // 3. Determine Arbitrage Opportunity
    let opportunity = null;
    if (bitgetPrice < exchange2Price) {
        // Buy on Bitget, Sell on Exchange 2
        const rawProfit = (exchange2Price - bitgetPrice) / bitgetPrice * 100;
        // IMPORTANT: Subtract real fees here for Bitget (maker/taker) and Exchange 2
        // Bitget Spot Taker Fee: 0.1% per trade. Assume similar for Exchange 2
        const netProfit = rawProfit - (0.1 + 0.1); // Assuming 0.1% taker fee on both ends
        if (netProfit >= PROFIT_THRESHOLD_PERCENT) {
            opportunity = {
                type: 'Buy Low / Sell High',
                buyExchange: 'Bitget',
                buyPrice: bitgetPrice,
                sellExchange: exchange2Name,
                sellPrice: exchange2Price,
                netProfitPercent: netProfit,
                tokenSymbol: tokenSymbol.toUpperCase(),
            };
        }
    } else if (exchange2Price < bitgetPrice) {
        // Buy on Exchange 2, Sell on Bitget
        const rawProfit = (bitgetPrice - exchange2Price) / exchange2Price * 100;
        const netProfit = rawProfit - (0.1 + 0.1);
        if (netProfit >= PROFIT_THRESHOLD_PERCENT) {
            opportunity = {
                type: 'Buy Low / Sell High',
                buyExchange: exchange2Name,
                buyPrice: exchange2Price,
                sellExchange: 'Bitget',
                sellPrice: bitgetPrice,
                netProfitPercent: netProfit,
                tokenSymbol: tokenSymbol.toUpperCase(),
            };
        }
    }

    res.status(200).json({ opportunity, currentPrices: { Bitget: bitgetPrice, [exchange2Name]: exchange2Price } });
};
