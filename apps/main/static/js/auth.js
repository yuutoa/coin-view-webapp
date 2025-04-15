import { getCookie } from "./api.js";

// Called after login (placeholder)
export function login() {
    console.log("Logged in ✔️");
}

// Logout user: call backend, clear cookies, redirect
export function logout() {
    fetch("/api/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
        },
    }).finally(() => {
        document.cookie = "csrftoken=; Max-Age=0; path=/";
        localStorage.clear();
        window.location.href = "/";
    });
}

// Refresh access token using refresh_token cookie
export async function refreshAccessToken() {
    try {
        const res = await fetch("/api/token/refresh/", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
        });

        if (res.ok) return true;

        if (res.status === 401) {
            logout();
            return false;
        }

        console.error("Token refresh failed:", res.statusText);
        return false;

    } catch (err) {
        console.error("Refresh error:", err);
        return false;
    }
}

// HttpOnly cookie cannot be read from JS
export function getAccessToken() {
    return null;
}
