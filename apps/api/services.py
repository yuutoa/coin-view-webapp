import requests
import logging
from apps.api.models import CryptoCurrency
from decimal import Decimal
from django.db import transaction

# Logger setup
logger = logging.getLogger(__name__)

# Third-party API URL (CoinGecko example)
API_URL = "https://api.coingecko.com/api/v3/coins/markets"

# List of cryptocurrencies to update
CRYPTO_SYMBOLS = [
    "BTC",
    "ETH",
    "USDT",
    "BNB",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "MATIC",
    "DOT",
    "AVAX",
    "TRX",
    "LTC",
    "SHIB",
    "WBTC",
]

symbol_to_id = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "BNB": "binancecoin",
    "SOL": "solana",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "MATIC": "matic-network",
    "DOT": "polkadot",
    "AVAX": "avalanche-2",
    "TRX": "tron",
    "LTC": "litecoin",
    "SHIB": "shiba-inu",
    "WBTC": "wrapped-bitcoin",
}


def get_crypto_data():
    """
    Fetch cryptocurrency prices from API and update the database.
    Returns a list of updated cryptocurrency symbols.
    """
    params = {
        "vs_currency": "usd",
        "ids": ",".join(symbol_to_id.values()),
        "order": "market_cap_desc",
        "per_page": len(CRYPTO_SYMBOLS),
        "page": 1,
        "sparkline": False,
    }

    try:
        response = requests.get(API_URL, params=params, timeout=10)
        response.raise_for_status()
        crypto_data = response.json()

        updated_symbols = []

        with transaction.atomic():
            for coin in crypto_data:
                symbol_upper = next(
                    (key for key, val in symbol_to_id.items() if val == coin["id"]),
                    None,
                )

                if not symbol_upper:
                    continue

                try:
                    crypto = CryptoCurrency.objects.get(symbol=symbol_upper)

                    # Update fields
                    crypto.price_usd = Decimal(str(coin["current_price"]))
                    crypto.market_cap = coin["market_cap"]
                    crypto.volume_24h = coin["total_volume"]
                    crypto.percent_change_24h = Decimal(
                        str(coin["price_change_percentage_24h"])
                    )
                    crypto.circulating_supply = coin["circulating_supply"]

                    crypto.save()
                    updated_symbols.append(symbol_upper)

                except CryptoCurrency.DoesNotExist:
                    logger.warning(f"Skipping {symbol_upper}: Not found in DB")

        logger.info(f"Updated cryptocurrencies: {updated_symbols}")
        return updated_symbols

    except requests.RequestException as e:
        logger.error(f"Error fetching crypto data: {e}")
        return []


def calculate_apr(crypto_symbol, principal, rate, time_years):
    """Perform the APR calculation logic."""

    crypto = CryptoCurrency.objects.get(symbol=crypto_symbol)
    crypto_price = Decimal(crypto.price_usd)

    principal_in_usd = principal * crypto_price
    total_amount_in_usd = principal_in_usd * (1 + (rate / Decimal(100)) * time_years)
    interest_earned_in_usd = total_amount_in_usd - principal_in_usd

    total_amount_in_crypto = total_amount_in_usd / crypto_price
    interest_earned_in_crypto = interest_earned_in_usd / crypto_price

    return {
        "crypto_symbol": crypto_symbol,
        "principal_in_crypto": principal,
        "principal_in_usd": round(principal_in_usd, 2),
        "annual_rate_percent": round(rate, 2),
        "time_years": round(time_years, 2),
        "total_amount_in_crypto": round(total_amount_in_crypto, 4),
        "interest_earned_in_crypto": round(interest_earned_in_crypto, 4),
    }
