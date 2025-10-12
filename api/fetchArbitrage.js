const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { tokenSymbol = 'eth' } = req.query;

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${tokenSymbol}/tickers`);
        const data = await response.json();

        if (!data || !data.tickers) {
            res.status(500).json({ error: 'Could not retrieve tickers from the API.' });
            return;
        }
        
        // Return the full tickers data to the client-side for processing
        res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching data from CoinGecko:', error);
        res.status(500).json({ error: 'Error fetching data. Please try again later.' });
    }
};
