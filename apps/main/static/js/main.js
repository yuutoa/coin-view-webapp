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

    const formatPrice = (price) => {
        const numPrice = parseFloat(price);

        if (numPrice >= 1000) {
            return numPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (Math.abs(numPrice) >= 0.0001) {
            return numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        } else if (Math.abs(numPrice) > 0) {
            const strPrice = numPrice.toString();
            const match = strPrice.match(/^0\.0*([1-9]\d{0,3})/);
            return match ? `0.${'0'.repeat(match[0].indexOf(match[1][0]) - 2)}${match[1]}` : numPrice.toExponential(2);
        } else {
            return "0.00";
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
            return (number / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'K';
        } else {
            return parseFloat(number).toFixed(2);
        }
    };

    const renderTable = (data) => `
        <table class="table table-hover" style="width: 100%;">
            <thead class="thead-light">
                <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th class="text-end">Price</th>
                    <th class="text-end">Change (24h)</th>
                    <th class="text-end">Market Cap</th>
                    <th class="text-end">Volume (24h)</th>
                    <th class="text-end">Circulating Supply</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(c => `
                    <tr>
                        <td><a href="#/crypto/${c.symbol}">${c.name}</a></td>
                        <td>${c.symbol.toUpperCase()}</td>
                        <td class="text-end">$${formatPrice(c.price_usd)}</td>
                        <td class="text-end ${parseFloat(c.percent_change_24h) < 0 ? 'text-danger' : 'text-success'}">${parseFloat(c.percent_change_24h).toFixed(2)}%</td>
                        <td class="text-end">${formatHumanReadableNumber(c.market_cap)}</td>
                        <td class="text-end">${formatHumanReadableNumber(c.volume_24h)}</td>
                        <td class="text-end">${formatHumanReadableNumber(c.circulating_supply)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>`;

    const renderPage = (data) => {
        const lastUpdated = data.length > 0 ? new Date(data[0].last_updated).toLocaleString() : 'N/A';

        app.innerHTML = `
            <div class="page-header compact-header d-flex justify-content-between align-items-center mb-3">
                <div>
                    <button id="update-data-btn" class="btn btn-primary btn-sm update-btn">Update Data</button>
                </div>
                <div class="text-end">
                    <span class="text-muted small">Last Updated: ${lastUpdated}</span>
                </div>
            </div>
            <div id="update-message" class="mt-2 text-center text-muted"></div>
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
                    document.querySelector('.compact-header .text-muted').textContent = `Last Updated: ${newLastUpdated}`;
                    updateMessage.innerHTML = renderAlert("Updated successfully.", "success");
                    setTimeout(() => updateMessage.textContent = '', 3000);
                } catch (err) {
                    console.error(err);
                    updateMessage.innerHTML = renderAlert("Update failed.", "danger");
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
        app.innerHTML = renderAlert("Failed to fetch crypto list.", "danger");
    }
}

// ==============================
// CRYPTO DETAIL PAGE
// ==============================
async function renderCryptoDetail(symbol) {
    app.innerHTML = `<p class="text-center">Loading ${symbol} details...</p>`;

    const formatPrice = (price) => {
        const numPrice = parseFloat(price);
        if (numPrice >= 1000) {
            return numPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (Math.abs(numPrice) >= 0.0001) {
            return numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        } else if (Math.abs(numPrice) > 0) {
            const strPrice = numPrice.toString();
            const match = strPrice.match(/^0\.0*([1-9]\d{0,3})/);
            return match ? `0.${'0'.repeat(match[0].indexOf(match[1][0]) - 2)}${match[1]}` : numPrice.toExponential(2);
        } else {
            return "0.00";
        }
    };

    const formatNumber = (num) => {
        return parseFloat(num).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    try {
        const data = await fetchCryptoDetail(symbol);
        const lastUpdated = new Date(data.last_updated).toLocaleString();
const description = data.description
    ? `<p class="lead description-style text-center">${data.description}</p>`
    : `<p class="lead description-style text-center mw300">${data.name} is a digital currency that operates without a central bank or single administrator. It utilizes decentralized technology, typically blockchain, to enable secure and transparent peer-to-peer transactions. Aiming to offer an alternative to traditional financial systems.</p>`;

        app.innerHTML = `
            <a href="#/crypto-list" class="back-button">← Back to Cryptocurrencies</a>
            <div class="detail-page-content">
                <h2 class="text-center mb-3">${data.name} (${data.symbol.toUpperCase()})</h2>
                <div class="mb-4">${description}</div>
                <div class="card mx-auto" style="max-width: 600px;">
                    <div class="card-body">
                        <h5 class="card-title text-center">${data.name} Overview</h5>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <strong>Price:</strong>
                                <span>$${formatPrice(data.price_usd)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <strong>Market Cap:</strong>
                                <span>$${formatNumber(data.market_cap)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <strong>Volume (24h):</strong>
                                <span>$${formatNumber(data.volume_24h)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <strong>Change (24h):</strong>
                                <span class="${parseFloat(data.percent_change_24h) < 0 ? 'text-danger' : 'text-success'}">${parseFloat(data.percent_change_24h).toFixed(2)}%</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <strong>Circulating Supply:</strong>
                                <span>${formatNumber(data.circulating_supply)} ${data.symbol.toUpperCase()}</span>
                            </li>
                            <li class="list-group-item text-center small text-muted">
                                Last Updated: ${lastUpdated}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        app.innerHTML = renderAlert(`Failed to load details for ${symbol} ❌`, "danger");
    }
}

// ==============================
// CONVERSION PAGE
// ==============================
function renderConvert() {
    app.innerHTML = `
        <div class="container">
            <div class="d-flex flex-column flex-md-row justify-content-center align-items-start gap-4 animated-form-container">
                <div class="conversion-form card p-4 shadow w-100" style="max-width: 480px;">
                    <form id="convert-form">
                        <h2 class="form-title mb-4 text-center">Crypto Converter</h2>
                        <div class="mb-3">
                            <label for="from_currency" class="form-label">From</label>
                            <input type="text" name="from_currency" class="form-control form-control-lg" placeholder="BTC" required oninput="this.value = this.value.toUpperCase()" />
                        </div>
                        <div class="mb-3">
                            <label for="to_currency" class="form-label">To</label>
                            <input type="text" name="to_currency" class="form-control form-control-lg" placeholder="ETH" required oninput="this.value = this.value.toUpperCase()" />
                        </div>
                        <div class="mb-4">
                            <label for="amount" class="form-label">Amount</label>
                            <input type="number" name="amount" class="form-control form-control-lg" placeholder="Enter amount" step="any" required />
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100">Convert</button>
                    </form>
                </div>
                <div id="conversion-result" class="conversion-result d-none w-100" style="max-width: 500px;"></div>
            </div>
        </div>
    `;

    const form = document.getElementById("convert-form");
    const resultBox = document.getElementById("conversion-result");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = Object.fromEntries(new FormData(form));
        resultBox.innerHTML = `<div class="text-muted p-3 text-center">Calculating...</div>`;
        resultBox.classList.remove("d-none");

        try {
            const result = await convertCrypto(formData.from_currency, formData.to_currency, formData.amount);

            const amount = parseFloat(result.amount).toLocaleString(undefined, { minimumFractionDigits: 4 });
            const converted = parseFloat(result.converted_amount).toLocaleString(undefined, { minimumFractionDigits: 4 });
            const rate = parseFloat(result.conversion_rate).toLocaleString(undefined, { minimumFractionDigits: 4 });

            resultBox.innerHTML = `
                <div class="card shadow-sm border rounded p-4">
                    <h4 class="text-center mb-4">${result.from_currency} ➝ ${result.to_currency}</h4>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Amount:</strong> <span>${amount} ${result.from_currency}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Converted:</strong> <span>${converted} ${result.to_currency}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Rate:</strong> <span>1 ${result.from_currency} = ${rate} ${result.to_currency}</span>
                        </li>
                    </ul>
                </div>
            `;

            form.closest(".conversion-form").classList.add("slide-left");
            resultBox.classList.add("slide-in");

        } catch (err) {
            console.error(err);
            resultBox.innerHTML = `<div class="alert alert-danger">Conversion failed ❌</div>`;
        }
    });
}

// ==============================
// APR PAGE
// ==============================
function renderAPR() {
    app.innerHTML = `
        <div class="container" style="padding-top: 0;">
            <div class="d-flex flex-column flex-md-row justify-content-center align-items-start gap-4 animated-form-container">
                <div class="apr-form card p-4 shadow w-100" style="max-width: 480px;">
                    <form id="apr-form">
                        <h2 class="form-title mb-4 text-center">APR Calculator</h2>
                        <div class="mb-3">
                            <label for="crypto_symbol" class="form-label">Crypto Symbol</label>
                            <input name="crypto_symbol" class="form-control form-control-lg" placeholder="XRP" required oninput="this.value = this.value.toUpperCase()" />
                        </div>
                        <div class="mb-3">
                            <label for="principal" class="form-label">Principal (in crypto)</label>
                            <input type="number" name="principal" class="form-control form-control-lg" placeholder="Principal amount" step="any" required />
                        </div>
                        <div class="mb-3">
                            <label for="rate" class="form-label">APR (%)</label>
                            <input type="number" name="rate" class="form-control form-control-lg" placeholder="Annual rate" step="any" required />
                        </div>
                        <div class="mb-4">
                            <label for="time_years" class="form-label">Years</label>
                            <input type="number" name="time_years" class="form-control form-control-lg" placeholder="Years" step="any" required />
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100">Calculate</button>
                    </form>
                </div>
                <div id="apr-result" class="apr-result d-none w-100" style="max-width: 500px;"></div>
            </div>
        </div>
    `;

    const form = document.getElementById("apr-form");
    const resultBox = document.getElementById("apr-result");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        resultBox.innerHTML = `<div class="text-muted p-3 text-center">Calculating...</div>`;
        resultBox.classList.remove("d-none");

        const formData = Object.fromEntries(new FormData(form));
        try {
            const result = await calculateAPR(
                formData.crypto_symbol,
                formData.principal,
                formData.rate,
                formData.time_years
            );

            const principalCrypto = parseFloat(result.principal_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4 });
            const principalUSD = parseFloat(result.principal_in_usd).toLocaleString(undefined, { minimumFractionDigits: 2 });
            const rate = parseFloat(result.annual_rate_percent).toLocaleString(undefined, { minimumFractionDigits: 2 });
            const interest = parseFloat(result.interest_earned_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4 });
            const total = parseFloat(result.total_amount_in_crypto).toLocaleString(undefined, { minimumFractionDigits: 4 });

            const years = Math.floor(result.time_years);
            const months = Math.round((result.time_years - years) * 12);
            const timeString = `${years ? `${years} year${years > 1 ? 's' : ''}` : ''} ${months ? `${months} month${months > 1 ? 's' : ''}` : ''}`.trim();

            resultBox.innerHTML = `
                <div class="card shadow-sm border rounded p-4">
                    <h4 class="text-center mb-4">${result.crypto_symbol.toUpperCase()} APR Results</h4>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Principal (Crypto):</strong> <span>${principalCrypto} ${result.crypto_symbol.toUpperCase()}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Principal (USD):</strong> <span>$${principalUSD}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>APR:</strong> <span>${rate}%</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Time:</strong> <span>${timeString}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Interest Earned:</strong> <span>${interest} ${result.crypto_symbol.toUpperCase()}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                            <strong>Total Amount:</strong> <span>${total} ${result.crypto_symbol.toUpperCase()}</span>
                        </li>
                    </ul>
                </div>
            `;

            form.closest(".apr-form").classList.add("slide-left");
            resultBox.classList.add("slide-in");

        } catch (err) {
            console.error(err);
            resultBox.innerHTML = `<div class="alert alert-danger">APR Calculation failed ❌</div>`;
        }
    });
}

// ==============================
// HISTORY PAGE
// ==============================
async function renderHistory() {
    app.innerHTML = `
        <div class="container" style="padding-top: 0;">
            <h2 class="text-center mb-4">Conversion History</h2>
            <div class="table-responsive">
                <table class="table table-striped table-hover shadow-sm mx-auto" style="max-width: 95%;">
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
                        <tr><td colspan="6" class="text-center">Loading history...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const data = await fetchConversionHistory();
        const historyTableBody = app.querySelector('.table-responsive tbody');
        historyTableBody.innerHTML = '';

        if (!data || data.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No conversion history available.</td></tr>`;
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

        historyTableBody.innerHTML = formattedHistory;

    } catch (err) {
        console.error(err);
        app.querySelector('.table-responsive tbody').innerHTML = `<tr><td colspan="6" class="text-center">${renderAlert("Failed to load history ❌", "danger")}</td></tr>`;
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
