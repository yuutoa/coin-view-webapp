// Get cookie by name
export function getCookie(name) {
    const cookie = document.cookie
        .split("; ")
        .find(row => row.startsWith(name + "="));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

// Fetch wrapper with CSRF and error handling
export async function authorizedFetch(url, options = {}) {
    const csrfToken = getCookie("csrftoken");

    const opts = {
        credentials: "include",
        method: options.method || "GET",
        headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
            ...(options.headers || {}),
        },
        ...options,
    };

    const res = await fetch(url, opts);

    if (res.status === 401) {
        window.location.href = "/auth/oauth/callback/";
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        console.error(`API Error ${res.status}:`, errorData);
        throw new Error(`Request failed: ${res.status}`);
    }

    return res;
}

// Fetch all crypto data
export async function fetchCryptoList() {
    const res = await authorizedFetch("/api/crypto-list/");
    return res.json();
}

// Fetch single crypto detail
export async function fetchCryptoDetail(symbol) {
    const res = await authorizedFetch(`/api/crypto-detail/${symbol}/`);
    return res.json();
}

// Convert crypto amount
export async function convertCrypto(from, to, amount) {
    const res = await authorizedFetch("/api/crypto-conversion/", {
        method: "POST",
        body: JSON.stringify({ from_currency: from, to_currency: to, amount }),
    });
    return res.json();
}

// Get past conversions
export async function fetchConversionHistory() {
    const res = await authorizedFetch("/api/conversion-history/");
    return res.json();
}

// Calculate APR based on user input
export async function calculateAPR(crypto, principal, rate, years) {
    const res = await authorizedFetch("/api/apr-calculator/", {
        method: "POST",
        body: JSON.stringify({ crypto_symbol: crypto, principal, rate, time_years: years }),
    });
    return res.json();
}

// Update market data from external API
export async function updateCryptoData() {
    const res = await authorizedFetch("/api/update-data/", {
        method: "GET",
    });
    return res.json();
}
