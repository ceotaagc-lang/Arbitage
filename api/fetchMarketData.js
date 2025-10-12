const fetch = require('node-fetch');
const crypto = require('crypto'); // Used for signing if needed for authenticated endpoints

// Placeholder if you need to use signed public endpoints or transition to private
const API_KEY = process.env.BITGET_API_KEY;
const API_SECRET = process.env.BITGET_API_SECRET;
const API_PASSPHRASE = process.env.BITGET_API_PASSPHRASE;

// Helper function for signing requests (Bitget specific)
function signRequest(timestamp, method, requestPath, body = '') {
    const message = timestamp + method + requestPath + body;
    const hmac = crypto.createHmac('sha256', API_SECRET);
    return hmac.update(message).digest('base64');
}

module.exports = async (req, res) => {
    const { tokenSymbol = 'eth' } = req.query;
    const tradingPair = `${tokenSymbol.toUpperCase()}USDT`; // e.g., ETHUSDT

    try {
        // Fetch public market ticker data from Bitget (does not require signing)
        const response = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${tradingPair}`);
        const data = await response.json();

        if (data.code !== '00000' || !data.data || data.data.length === 0) {
            console.error('Bitget API Error (fetchMarketData):', data.msg);
            return res.status(500).json({ error: data.msg || `Could not retrieve ticker data for ${tradingPair}.` });
        }

        const ticker = data.data; // Bitget returns an array, but we asked for a specific symbol

        const lastPrice = parseFloat(ticker.lastPr);
        const highPrice = parseFloat(ticker.high24h);
        const lowPrice = parseFloat(ticker.low24h);
        const priceDifference = highPrice - lowPrice;
        const volatilityPercentage = (priceDifference / lowPrice) * 100;
        const profitClass = volatilityPercentage > 0 ? 'positive' : 'negative'; // Represents volatility, not guaranteed profit

        res.status(200).json({
            lastPrice,
            highPrice,
            lowPrice,
            volatilityPercentage,
            profitClass, // Renamed for clarity in the UI
            tokenSymbol: tokenSymbol.toUpperCase(),
            exchange: 'Bitget', // Indicate the source of data
        });

    } catch (error) {
        console.error('Error fetching data from Bitget (fetchMarketData):', error);
        res.status(500).json({ error: 'Error fetching real-time data from Bitget. Please try again later.' });
    }
};
