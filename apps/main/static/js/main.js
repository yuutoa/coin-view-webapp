// ==============================
// IMPORTS
// ==============================
import {
    fetchCryptoList,
    fetchCryptoDetail,
    convertCrypto,
    fetchConversionHistory,
    calculateAPR,
    updateCryptoData,
    getCookie
} from "./api.js";

import {
    login as authLogin,
    logout as authLogout,
    refreshAccessToken
} from "./auth.js";

// ==============================
// INITIAL ROUTER + LOGOUT SETUP
// ==============================
document.addEventListener("DOMContentLoaded", () => {
    router();
    setupLogoutListener();
});

window.addEventListener("hashchange", router);

// ==============================
// GLOBAL APP CONTAINER
// ==============================
const app = document.getElementById("app");

// ==============================
// ALERT FUNCTION (Bootstrap-compatible)
// ==============================
function renderAlert(message, type = "info") {
    const id = `alert-${Date.now()}`;
    return `
        <div id="${id}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// ==============================
// ROUTER LOGIC
// ==============================
async function router() {
    const path = window.location.hash.slice(1) || "/";
    const routes = {
        "/": renderCryptoList,
        "/crypto-list": renderCryptoList,
        "/convert": renderConvert,
        "/history": renderHistory,
        "/apr": renderAPR
    };

    if (path.startsWith("/crypto/")) {
        const symbol = path.split("/crypto/")[1];
        renderCryptoDetail(symbol);
        return;
    }

    (routes[path] || renderCryptoList)();
}

// ==============================
// CRYPTO LIST PAGE
// ==============================
async function renderCryptoList() {
    app.innerHTML = `<p>Loading crypto list...</p>`;

    const renderTable = (data) => `
        <table class="table table-bordered table-striped table-hover">
            <thead class="thead-dark">
                <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th class="text-end">Price (USD)</th>
                    <th class="text-end">Market Cap</th>
                    <th class="text-end">Volume (24h)</th>
                    <th class="${data.some(c => parseFloat(c.percent_change_24h) < 0) ? 'text-end' : 'text-end'}">Change (24h)</th>
                    <th class="text-end">Circulating Supply</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(c => `
                    <tr>
                        <td><a href="#/crypto/${c.symbol}">${c.name}</a></td>
                        <td>${c.symbol.toUpperCase()}</td>
                        <td class="text-end">${formatPrice(c.price_usd)}</td>
                        <td class="text-end">${formatHumanReadableNumber(c.market_cap)}</td>
                        <td class="text-end">${formatHumanReadableNumber(c.volume_24h)}</td>
                        <td class="text-end ${parseFloat(c.percent_change_24h) < 0 ? 'text-danger' : 'text-success'}">${parseFloat(c.percent_change_24h).toFixed(2)}%</td>
                        <td class="text-end">${formatHumanReadableNumber(c.circulating_supply)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>`;

    const formatPrice = (price) => {
        const numPrice = parseFloat(price);
        if (Math.abs(numPrice) < 0.01 && Math.abs(numPrice) > 0) {
            const strPrice = numPrice.toString();
            const firstFourNonZero = strPrice.match(/0\.0*[1-9]{1,4}/);
            return firstFourNonZero ? firstFourNonZero[0] : numPrice.toFixed(8);
        } else {
            return numPrice.toFixed(4);
        }
    };

    const formatHumanReadableNumber = (number) => {
        const absNumber = Math.abs(number);
        if (absNumber >= 1e12) {
            return (number / 1e12).toFixed(2) + 'T';
        } else if (absNumber >= 1e9) {
            return (number / 1e9).toFixed(2) + 'B';
        } else if (absNumber >= 1e6) {
            return (number / 1e6).toFixed(2) + 'M';
        } else if (absNumber >= 1e3) {
            return (number / 1e3).toFixed(2) + 'K';
        } else {
            return parseFloat(number).toFixed(2);
        }
    };

    const renderPage = (data) => {
        const lastUpdated = data.length > 0 ? new Date(data[0].last_updated).toLocaleString() : 'N/A';

        app.innerHTML = `
            <h2>Crypto List</h2>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div><strong>Last Updated:</strong> <span class="text-muted">${lastUpdated}</span></div>
                <button id="update-data-btn" class="btn btn-outline-secondary btn-sm">🔄 Update</button>
            </div>
            <div id="update-message" class="my-2 text-center text-muted"></div>
            <div class="table-responsive">
                ${renderTable(data)}
            </div>
        `;

        const updateButton = document.getElementById("update-data-btn");
        const updateMessage = document.getElementById("update-message");

        if (updateButton) {
            updateButton.addEventListener("click", async () => {
                updateMessage.textContent = "Updating...";
                try {
                    await updateCryptoData();
                    const updatedData = await fetchCryptoList();
                    document.querySelector(".table-responsive").innerHTML = renderTable(updatedData);
                    const newLastUpdated = updatedData.length > 0 ? new Date(updatedData[0].last_updated).toLocaleString() : 'N/A';
                    document.querySelector('.d-flex strong + span').textContent = newLastUpdated;
                    updateMessage.innerHTML = renderAlert("✅ Updated!", "success");
                    setTimeout(() => updateMessage.textContent = '', 3000);
                } catch (err) {
                    console.error(err);
                    updateMessage.innerHTML = renderAlert("⚠️ Update failed.", "danger");
                    setTimeout(() => updateMessage.textContent = '', 3000);
                }
            });
        }
    };

    try {
        const data = await fetchCryptoList();
        renderPage(data);
    } catch (err) {
        console.error(err);
        app.innerHTML = renderAlert("Failed to fetch crypto list ❌", "danger");
    }
}


// ==============================
// CRYPTO DETAIL PAGE
// ==============================
async function renderCryptoDetail(symbol) {
    app.innerHTML = `<p>Loading ${symbol} details...</p>`;

    try {
        const data = await fetchCryptoDetail(symbol);

        const description = data.description ? `<p>${data.description}</p>` : `<p>No description available for ${data.name}.</p>`;

        app.innerHTML = `
            <h2>${data.name} (${data.symbol.toUpperCase()})</h2>
            <div class="mb-4">${description}</div>
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">${data.name} Details</h5>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item">
                            <strong>Price:</strong> $${parseFloat(data.price_usd).toFixed(4)}
                        </li>
                        <li class="list-group-item">
                            <strong>Market Cap:</strong> $${parseFloat(data.market_cap).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </li>
                        <li class="list-group-item">
                            <strong>Volume (24h):</strong> $${parseFloat(data.volume_24h).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </li>
                        <li class="list-group-item">
                            <strong>Change (24h):</strong> ${parseFloat(data.percent_change_24h).toFixed(2)}%
                        </li>
                        <li class="list-group-item">
                            <strong>Circulating Supply:</strong> ${parseFloat(data.circulating_supply).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${data.symbol.toUpperCase()}
                        </li>
                        <li class="list-group-item">
                            <strong>Last Updated:</strong> ${new Date(data.last_updated).toLocaleString()}
                        </li>
                    </ul>
                    <a href="#/crypto-list" class="btn btn-secondary mt-3">← Back to List</a>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        app.innerHTML = renderAlert(`Failed to load details for ${symbol} ❌`, "danger");
    }
}

// ==============================
// CONVERT PAGE
// ==============================
function renderConvert() {
    app.innerHTML = `
        <h2>Convert Crypto</h2>
        <form id="convert-form">
            <input type="text" name="from_currency" class="form-control mb-2" placeholder="From (e.g., BTC)" required oninput="this.value = this.value.toUpperCase()" />
            <input type="text" name="to_currency" class="form-control mb-2" placeholder="To (e.g., ETH)" required oninput="this.value = this.value.toUpperCase()" />
            <input type="number" name="amount" class="form-control mb-2" placeholder="Amount" step="any" required />
            <button class="btn btn-primary">Convert</button>
        </form>
        <div id="conversion-result" class="mt-3"></div>
    `;

    document.getElementById("convert-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(e.target));

        try {
            const result = await convertCrypto(formData.from_currency, formData.to_currency, formData.amount);

            const formattedAmount = parseFloat(result.amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            const formattedConvertedAmount = parseFloat(result.converted_amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            const formattedRate = parseFloat(result.conversion_rate).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

            document.getElementById("conversion-result").innerHTML = renderAlert(
                `<strong>Conversion Result</strong><br>
                <strong>From:</strong> ${formattedAmount} ${result.from_currency}<br>
                <strong>To:</strong> ${formattedConvertedAmount} ${result.to_currency}<br>
                <strong>Conversion Rate (${result.from_currency} to ${result.to_currency}):</strong> ${formattedRate}`,
                "info"
            );
        } catch (err) {
            console.error(err);
            document.getElementById("conversion-result").innerHTML = renderAlert("Conversion failed ❌", "danger");
        }
    });
}

// ==============================
// HISTORY PAGE
// ==============================
async function renderHistory() {
    app.innerHTML = `<p>Loading conversion history...</p>`;

    try {
        const data = await fetchConversionHistory();

        if (!data || data.length === 0) {
            app.innerHTML = renderAlert("No conversion history available.", "info");
            return;
        }

        const formattedHistory = data.map(item => {
            const timestamp = new Date(item.timestamp).toLocaleString();
            const amountFormatted = parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            const convertedAmountFormatted = parseFloat(item.converted_amount).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
            const rateFormatted = parseFloat(item.conversion_rate).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

            return `
                <tr>
                    <td>${timestamp}</td>
                    <td>${item.from_currency.toUpperCase()}</td>
                    <td>${amountFormatted}</td>
                    <td>${item.to_currency.toUpperCase()}</td>
                    <td>${convertedAmountFormatted}</td>
                    <td>${rateFormatted}</td>
                </tr>
            `;
        }).join("");

        app.innerHTML = `
            <h2>Conversion History</h2>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>From Currency</th>
                            <th>Amount</th>
                            <th>To Currency</th>
                            <th>Converted Amount</th>
                            <th>Conversion Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${formattedHistory}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        console.error(err);
        app.innerHTML = renderAlert("Failed to load history ❌", "danger");
    }
}

// ==============================
// APR CALCULATOR PAGE
// ==============================
function renderAPR() {
    app.innerHTML = `
        <h2>APR Calculator</h2>
        <form id="apr-form">
            <input name="crypto_symbol" class="form-control mb-2" placeholder="Crypto Symbol (e.g., XRP)" required oninput="this.value = this.value.toUpperCase()" />
            <input type="number" name="principal" class="form-control mb-2" placeholder="Principal (in crypto)" step="any" required />
            <input type="number" name="rate" class="form-control mb-2" placeholder="APR (%)" step="any" required />
            <input type="number" name="time_years" class="form-control mb-2" placeholder="Years" step="any" required />
            <button class="btn btn-primary">Calculate</button>
        </form>
        <div id="apr-result" class="mt-4"></div>
    `;

    const aprForm = document.getElementById("apr-form");
    if (aprForm) {
        aprForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = Object.fromEntries(new FormData(e.target));

            try {
                const result = await calculateAPR(
                    formData.crypto_symbol,
                    formData.principal,
                    formData.rate,
                    formData.time_years
                );

                const formattedPrincipalCrypto = parseFloat(result.principal_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                const formattedPrincipalUSD = parseFloat(result.principal_in_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const formattedRate = parseFloat(result.annual_rate_percent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const formattedInterest = parseFloat(result.interest_earned_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
                const formattedTotal = parseFloat(result.total_amount_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

                const totalYears = parseFloat(result.time_years);
                const years = Math.floor(totalYears);
                const remainingMonthsDecimal = (totalYears - years) * 12;
                const months = Math.round(remainingMonthsDecimal);

                let timeString = '';
                if (years > 0) {
                    timeString += `${years} year${years > 1 ? 's' : ''}`;
                }
                if (months > 0) {
                    if (timeString) {
                        timeString += ' ';
                    }
                    timeString += `${months} month${months > 1 ? 's' : ''}`;
                }
                if (!timeString) {
                    timeString = 'Less than a month';
                }

                document.getElementById("apr-result").innerHTML = renderAlert(
                    `<strong>${result.crypto_symbol.toUpperCase()} APR Results</strong><br>
                    <strong>Principal (in crypto):</strong> ${formattedPrincipalCrypto} ${result.crypto_symbol.toUpperCase()}<br>
                    <strong>Principal (USD):</strong> $${formattedPrincipalUSD}<br>
                    <strong>Annual Rate (%):</strong> ${formattedRate}%<br>
                    <strong>Time:</strong> ${timeString}<br>
                    <strong>Interest Earned:</strong> ${formattedInterest} ${result.crypto_symbol.toUpperCase()}<br>
                    <strong>Total Amount:</strong> ${formattedTotal} ${result.crypto_symbol.toUpperCase()}`,
                    "info"
                );
            } catch (err) {
                console.error(err);
                document.getElementById("apr-result").innerHTML = renderAlert("APR Calculation failed ❌", "danger");
            }
        });
    }
}


// ==============================
// LOGOUT HANDLER
// ==============================
function setupLogoutListener() {
    const logoutButton = document.querySelector(".logout-link");

    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            try {
                const res = await fetch("/api/logout/", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "X-CSRFToken": getCookie("csrftoken")
                    },
                });

                if (res.ok) {
                    authLogout();
                    window.location.hash = "/";
                    router();
                } else {
                    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
                    console.error("Logout failed:", errorData);
                    alert("Logout failed. Please try again.");
                }
            } catch (err) {
                console.error("Error during logout:", err);
                alert("An error occurred during logout.");
            }
        });
    }
}
