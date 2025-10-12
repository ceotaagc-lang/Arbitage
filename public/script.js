document.addEventListener('DOMContentLoaded', () => {
    const opportunitiesList = document.getElementById('opportunities-list');
    const statusDiv = document.getElementById('status');
    const simulateTradeBtn = document.getElementById('simulateTradeBtn');
    const tradeStatusDiv = document.getElementById('trade-status');
    const tokenSymbol = 'eth'; // You can change this

    async function fetchMarketData() {
        statusDiv.textContent = `Fetching simulated data for ${tokenSymbol.toUpperCase()}...`;

        try {
            // Call the Vercel serverless function to get simulated market data
            const response = await fetch(`/api/fetchMarketData?tokenSymbol=${tokenSymbol}`);
            const data = await response.json();

            if (data.error) {
                statusDiv.textContent = `Error: ${data.error}`;
                opportunitiesList.innerHTML = '';
                return;
            }

            const { lastPrice, highPrice, lowPrice, profitPercentage, profitClass, tokenSymbol: fetchedToken } = data;

            opportunitiesList.innerHTML = `
                <div class="opportunity">
                    <h3>Simulated Market Data for ${fetchedToken}</h3>
                    <p>Simulated Current Price:</p>
                    <div class="exchange">
                        <span>Last Trade Price:</span>
                        <span class="price">$${lastPrice.toFixed(2)}</span>
                    </div>
                    <p>Simulated 24-Hour Price Range:</p>
                    <div class="exchange">
                        <span>Highest:</span>
                        <span class="price">$${highPrice.toFixed(2)}</span>
                    </div>
                    <div class="exchange">
                        <span>Lowest:</span>
                        <span class="price">$${lowPrice.toFixed(2)}</span>
                    </div>
                    <p class="profit ${profitClass}">Simulated 24h Volatility: ${profitPercentage.toFixed(2)}%</p>
                    <p class="note">*This represents a simulated range percentage.</p>
                </div>
            `;
            statusDiv.textContent = `Simulated data updated for ${fetchedToken}.`;

        } catch (error) {
            console.error('Error fetching simulated market data:', error);
            statusDiv.textContent = 'Error fetching simulated market data. Please try again later.';
        }
    }

    async function simulateTrade() {
        tradeStatusDiv.className = 'trade-info'; // Reset class
        tradeStatusDiv.textContent = `Initiating trade simulation for ${tokenSymbol.toUpperCase()}...`;
        simulateTradeBtn.disabled = true; // Prevent multiple clicks

        try {
            // Call the Vercel serverless function to execute trade (simulation)
            const response = await fetch('/api/simulateTrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tokenSymbol: tokenSymbol }),
            });
            const data = await response.json();

            if (data.success) {
                tradeStatusDiv.className = 'trade-info success';
                tradeStatusDiv.innerHTML = `<strong>Trade Simulation Success:</strong> Simulated Order ID: ${data.orderId || 'N/A'}. Message: ${data.message}`;
            } else {
                tradeStatusDiv.className = 'trade-info error';
                tradeStatusDiv.innerHTML = `<strong>Trade Simulation Failed:</strong> ${data.error || 'Unknown error'}.`;
            }

        } catch (error) {
            console.error('Error simulating trade:', error);
            tradeStatusDiv.className = 'trade-info error';
            tradeStatusDiv.innerHTML = `<strong>Trade Simulation Failed:</strong> Network error or server issue.`;
        } finally {
            simulateTradeBtn.disabled = false; // Re-enable button
        }
    }

    // Fetch market data immediately and then every 30 seconds
    fetchMarketData();
    setInterval(fetchMarketData, 30000);

    // Add event listener for the trade button
    simulateTradeBtn.addEventListener('click', simulateTrade);
});
