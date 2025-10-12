document.addEventListener('DOMContentLoaded', () => {
    const opportunitiesList = document.getElementById('opportunities-list');
    const statusDiv = document.getElementById('status');
    const tokenSymbol = 'eth'; // Still controlled from the client

    async function fetchPrices() {
        statusDiv.textContent = 'Fetching real-time data from Bitget...';

        try {
            // Call your Vercel serverless function, which now uses the Bitget API
            const response = await fetch(`/api/fetchArbitrage?tokenSymbol=${tokenSymbol}`);
            const data = await response.json();

            if (data.error) {
                statusDiv.textContent = data.error;
                opportunitiesList.innerHTML = '';
                return;
            }

            // Extract data from the serverless function's response
            const { lastPrice, highPrice, lowPrice, profitPercentage, profitClass, tokenSymbol: fetchedToken } = data;

            opportunitiesList.innerHTML = `
                <div class="opportunity">
                    <h3>Intra-exchange Opportunity on Bitget for ${fetchedToken}</h3>
                    <p>Current Price:</p>
                    <div class="exchange">
                        <span>Last Trade Price:</span>
                        <span class="price">$${lastPrice.toFixed(2)}</span>
                    </div>
                    <p>24-Hour Price Range:</p>
                    <div class="exchange">
                        <span>Highest:</span>
                        <span class="price">$${highPrice.toFixed(2)}</span>
                    </div>
                    <div class="exchange">
                        <span>Lowest:</span>
                        <span class="price">$${lowPrice.toFixed(2)}</span>
                    </div>
                    <p class="profit ${profitClass}">Potential Volatility Profit: ${profitPercentage.toFixed(2)}%</p>
                    <p class="note">*This opportunity is based on the 24h price range and does not account for fees or slippage.</p>
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
