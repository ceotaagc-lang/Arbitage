const fetch = require('node-fetch');
const crypto = require('crypto');

// Bitget API configuration from environment variables
const API_KEY = process.env.BITGET_API_KEY;
const API_SECRET = process.env.BITGET_API_SECRET;
const API_PASSPHRASE = process.env.BITGET_API_PASSPHRASE;
const MIN_TRADE_AMOUNT_USDT = parseFloat(process.env.MIN_TRADE_AMOUNT_USDT) || 10;

// Function to sign API requests
function signRequest(timestamp, method, requestPath, body) {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', API_SECRET);
    return hmac.update(message).digest('base64');
}

module.exports = async (req, res) => {
    // This is a simple, placeholder strategy. You should develop a more complex strategy.
    if (!req.body || !req.body.tokenSymbol) {
        return res.status(400).json({ error: 'Missing tokenSymbol in request body' });
    }

    const { tokenSymbol } = req.body;
    const tradingPair = `${tokenSymbol.toUpperCase()}USDT`;

    if (!API_KEY || !API_SECRET || !API_PASSPHRASE) {
        return res.status(500).json({ error: 'API credentials not configured.' });
    }

    // A real bot would check market data here before placing an order
    // This is a placeholder to demonstrate the execution logic
    const clientOrderId = Date.now().toString();
    const timestamp = Date.now().toString();
    const body = JSON.stringify({
        symbol: tradingPair,
        side: 'buy', // Or 'sell' based on your logic
        type: 'market',
        size: MIN_TRADE_AMOUNT_USDT.toString(),
        clientOid: clientOrderId,
    });
    const method = 'POST';
    const requestPath = '/api/v2/spot/trade/place-order';
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
                'x-bg-rec-window': '5000',
            },
            body: body,
        });

        const bitgetData = await bitgetResponse.json();

        if (bitgetData.code === '00000') {
            res.status(200).json({ success: true, orderId: bitgetData.data.orderId, message: 'Trade executed successfully.' });
        } else {
            res.status(500).json({ success: false, error: bitgetData.msg || 'Bitget API error.', bitgetData });
        }
    } catch (error) {
        console.error('Error executing trade:', error);
        res.status(500).json({ error: 'Internal server error while executing trade.' });
    }
};
