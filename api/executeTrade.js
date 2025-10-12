const fetch = require('node-fetch');
const crypto = require('crypto');

// Bitget API configuration from environment variables
const API_KEY = process.env.BITGET_API_KEY;
const API_SECRET = process.env.BITGET_API_SECRET;
const API_PASSPHRASE = process.env.BITGET_API_PASSPHRASE;
const MIN_TRADE_AMOUNT_USDT = parseFloat(process.env.MIN_TRADE_AMOUNT_USDT) || 10;

// Helper function for signing requests (Bitget specific)
function signRequest(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', API_SECRET);
    return hmac.update(message).digest('base64');
}

module.exports = async (req, res) => {
    const { tokenSymbol, side, tradeSizeUSDT } = req.body; // Expect side ('buy'/'sell') and size in USDT
    if (!tokenSymbol || !side || !tradeSizeUSDT) {
        return res.status(400).json({ error: 'Missing tokenSymbol, side, or tradeSizeUSDT in request body.' });
    }

    const tradingPair = `${tokenSymbol.toUpperCase()}USDT`;
    const tradeAmount = Math.max(parseFloat(tradeSizeUSDT), MIN_TRADE_AMOUNT_USDT); // Ensure minimum trade size

    if (!API_KEY || !API_SECRET || !API_PASSPHRASE) {
        return res.status(500).json({ error: 'API credentials not configured.' });
    }

    const clientOrderId = `vercelbot_${Date.now()}`;
    const timestamp = Date.now().toString();
    const requestPath = '/api/v2/spot/trade/place-order';

    // Fetch current price to calculate size in base currency (e.g., ETH) for market order
    let currentPrice;
    try {
        const priceResponse = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${tradingPair}`);
        const priceData = await priceResponse.json();
        if (priceData.code === '00000' && priceData.data && priceData.data.length > 0) {
            currentPrice = parseFloat(priceData.data.lastPr);
        } else {
            console.error('Could not fetch current price for order:', priceData.msg);
            return res.status(500).json({ error: 'Could not fetch current price to determine trade size.' });
        }
    } catch (error) {
        console.error('Error fetching price for trade size calculation:', error);
        return res.status(500).json({ error: 'Network error fetching price for trade size calculation.' });
    }

    // Calculate actual trade size in base token (e.g., ETH quantity)
    const quantity = (tradeAmount / currentPrice).toFixed(6); // Adjust decimal places based on exchange minimums

    const body = JSON.stringify({
        symbol: tradingPair,
        side: side, // 'buy' or 'sell'
        type: 'market',
        size: quantity.toString(), // Size is in base currency for market orders on Bitget
        clientOid: clientOrderId,
    });
    const method = 'POST';
    const signature = signRequest(timestamp, method, requestPath, body);

    try {
        const bitgetResponse = await fetch(`https://api.bitget.com${requestPath}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'ACCESS-KEY': API_KEY,
                'ACCESS-SIGN': signature,
                'ACCESS-TIMESTAMP': timestamp,
                'ACCESS-PASSPHRASE': API_PASSPHRASE,
                'x-bg-rec-window': '5000', // Adjust as needed (request valid for 5 seconds)
            },
            body: body,
        });

        const bitgetData = await bitgetResponse.json();

        if (bitgetData.code === '00000') {
            res.status(200).json({
                success: true,
                orderId: bitgetData.data.orderId,
                message: `Real trade executed successfully: ${side} ${quantity} ${tokenSymbol.toUpperCase()} for ~${tradeAmount} USDT.`,
                bitgetResponse: bitgetData
            });
        } else {
            res.status(500).json({
                success: false,
                error: bitgetData.msg || 'Bitget API error during trade execution.',
                bitgetResponse: bitgetData
            });
        }
    } catch (error) {
        console.error('Error executing real trade:', error);
        res.status(500).json({ error: 'Internal server error while executing real trade.' });
    }
};
