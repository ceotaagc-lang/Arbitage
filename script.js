document.addEventListener('DOMContentLoaded', () => {
    const opportunitiesList = document.getElementById('opportunities-list');
    const statusDiv = document.getElementById('status');
    const tokenSymbol = 'eth';

    async function fetchPrices() {
        statusDiv.textContent = 'Fetching real-time data...';

        try {
            // Call your Vercel serverless function at the API endpoint
            const response = await fetch(`/api/fetchArbitrage?tokenSymbol=${tokenSymbol}`);
            const data = await response.json();

            if (data.error) {
                statusDiv.textContent = data.error;
                return;
            }

            const tickers = data.tickers;
            const usdtTickers = tickers.filter(t => t.target === 'USDT').slice(0, 5);

            if (usdtTickers.length < 2) {
                statusDiv.textContent = `Need at least 2 exchanges to compare prices for ${tokenSymbol.toUpperCase()}.`;
                return;
            }

            let lowestPriceTicker = usdtTickers.reduce((min, ticker) => ticker.last < min.last ? ticker : min, usdtTickers[0]);
            let highestPriceTicker = usdtTickers.reduce((max, ticker) => ticker.last > max.last ? ticker : max, usdtTickers[0]);

            const priceDifference = highestPriceTicker.last - lowestPriceTicker.last;
            const profitPercentage = (priceDifference / lowestPriceTicker.last) * 100;
            const profitClass = profitPercentage > 0 ? 'positive' : 'negative';

            opportunitiesList.innerHTML = `
                <div class="opportunity">
                    <h3>Arbitrage Opportunity for ${tokenSymbol.toUpperCase()}</h3>
                    <p>Buy at: ${lowestPriceTicker.market.name}</p>
                    <div class="exchange">
                        <span>Price:</span>
                        <span class="price">$${lowestPriceTicker.last.toFixed(2)}</span>
                    </div>
                    <p>Sell at: ${highestPriceTicker.market.name}</p>
                    <div class="exchange">
                        <span>Price:</span>
                        <span class="price">$${highestPriceTicker.last.toFixed(2)}</span>
                    </div>
                    <p class="profit ${profitClass}">Potential Profit: ${profitPercentage.toFixed(2)}%</p>
                    <p class="note">*This does not account for fees or slippage.</p>
                </div>
            `;
            statusDiv.textContent = 'Data updated.';

        } catch (error) {
            console.error('Error fetching data:', error);
            statusDiv.textContent = 'Error fetching data. Please try again later.';
        }
    }

    fetchPrices();
    setInterval(fetchPrices, 30000);
});
