document.addEventListener('DOMContentLoaded', () => {
    const opportunitiesList = document.getElementById('opportunities-list');
    const statusDiv = document.getElementById('status');
    const tradeStatusDiv = document.getElementById('trade-status'); // Will show simulated or last trade status
    const tokenSymbol = 'eth';

    async function fetchRealMarketData() {
        statusDiv.textContent = `Fetching real-time market data for ${tokenSymbol.toUpperCase()}...`;

        try {
            const response = await fetch(`/api/fetchMarketData?tokenSymbol=${tokenSymbol}`);
            const data = await response.json();

            if (data.error) {
                statusDiv.textContent = `Error: ${data.error}`;
                opportunitiesList.innerHTML = '';
                return;
            }

            const { lastPrice, highPrice, lowPrice, volatilityPercentage, profitClass, tokenSymbol: fetchedToken, exchange } = data;

            opportunitiesList.innerHTML = `
                <div class="opportunity">
                    <h3>Real-Time Data for ${fetchedToken} on ${exchange}</h3>
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
                    <p class="profit ${profitClass}">24h Volatility: ${volatilityPercentage.toFixed(2)}%</p>
                    <p class="note">*Data from ${exchange}.</p>
                </div>
            `;
            statusDiv.textContent = `Real-time data updated for ${fetchedToken} on ${exchange}.`;

        } catch (error) {
            console.error('Error fetching real-time market data:', error);
            statusDiv.textContent = 'Error fetching real-time market data. Please try again later.';
        }
    }

    // This front-end button is now a placeholder.
    // Real trades should be triggered by the automated backend function (`checkArbitrage.js`)
    // via a Vercel Cron Job or similar mechanism, NOT directly by the user interface.
    // The button remains for educational demonstration or if you decide to add a manual override (risky).
    const simulateTradeBtn = document.getElementById('simulateTradeBtn');
    if (simulateTradeBtn) {
        simulateTradeBtn.addEventListener('click', async () => {
            tradeStatusDiv.className = 'trade-info';
            tradeStatusDiv.textContent = `Attempting a manual trade (for demonstration only!)...`;
            simulateTradeBtn.disabled = true;

            try {
                // For a real bot, you'd trigger `executeTrade` from a server-side logic
                // For a front-end manual trigger, you'd pass the actual trade parameters.
                const response = await fetch('/api/executeTrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tokenSymbol: tokenSymbol,
                        side: 'buy', // Example: always buy
                        tradeSizeUSDT: 10 // Example: minimum trade size
                    }),
                });
                const data = await response.json();

                if (data.success) {
                    tradeStatusDiv.className = 'trade-info success';
                    tradeStatusDiv.innerHTML = `<strong>Manual Trade Success:</strong> Order ID: ${data.orderId}. Message: ${data.message}`;
                } else {
                    tradeStatusDiv.className = 'trade-info error';
                    tradeStatusDiv.innerHTML = `<strong>Manual Trade Failed:</strong> ${data.error}. Response: ${JSON.stringify(data.bitgetResponse)}`;
                }
            } catch (error) {
                console.error('Error triggering manual trade:', error);
                tradeStatusDiv.className = 'trade-info error';
                tradeStatusDiv.innerHTML = `<strong>Manual Trade Failed:</strong> Network error or server issue.`;
            } finally {
                simulateTradeBtn.disabled = false;
            }
        });
    }

    fetchRealMarketData();
    setInterval(fetchRealMarketData, 30000); // Refresh display every 30 seconds
});
