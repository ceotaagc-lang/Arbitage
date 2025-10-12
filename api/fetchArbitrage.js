const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { tokenSymbol = 'eth' } = req.query;
    // Construct the symbol using the token and the quote currency (e.g., ETHUSDT)
    const tradingPair = `${tokenSymbol.toUpperCase()}USDT`;

    try {
        // Call the Bitget Spot Market API to get the ticker for the specified pair
        const response = await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${tradingPair}`);
        const data = await response.json();

        // Check for API errors
        if (data.code !== '00000') {
            res.status(500).json({ error: data.msg || 'Error retrieving data from Bitget API.' });
            return;
        }

        const tickers = data.data;

        if (!tickers || tickers.length === 0) {
            res.status(500).json({ error: `Could not retrieve ticker data for ${tradingPair}.` });
            return;
        }

        const ticker = tickers[0];

        // For a single exchange like Bitget, we will compare against the average
        // market price of the last 24 hours to find a potential opportunity
        const lastPrice = parseFloat(ticker.lastPr);
        const highPrice = parseFloat(ticker.high24h);
        const lowPrice = parseFloat(ticker.low24h);

        // A basic, intra-exchange "arbitrage" opportunity can be calculated
        const priceDifference = highPrice - lowPrice;
        const profitPercentage = (priceDifference / lowPrice) * 100;
        const profitClass = profitPercentage > 0 ? 'positive' : 'negative';

        // Return the processed data to the front-end
        res.status(200).json({
            lastPrice,
            highPrice,
            lowPrice,
            profitPercentage,
            profitClass,
            tokenSymbol: tokenSymbol.toUpperCase(),
        });

    } catch (error) {
        console.error('Error fetching data from Bitget:', error);
        res.status(500).json({ error: 'Error fetching data from Bitget. Please try again later.' });
    }
};
