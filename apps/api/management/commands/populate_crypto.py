from django.core.management.base import BaseCommand
from apps.api.models import CryptoCurrency

class Command(BaseCommand):
    help = "Populate the database with sample cryptocurrency data"

    def handle(self, *args, **kwargs):
        crypto_data = [
            {
                "symbol": "BTC",
                "name": "Bitcoin",
                "price_usd": 68000,
                "market_cap": 1300000000000,
                "volume_24h": 40000000000,
                "percent_change_24h": 2.5,
                "circulating_supply": 19000000,
            },
            {
                "symbol": "ETH",
                "name": "Ethereum",
                "price_usd": 3500,
                "market_cap": 420000000000,
                "volume_24h": 20000000000,
                "percent_change_24h": 1.8,
                "circulating_supply": 120000000,
            },
            {
                "symbol": "USDT",
                "name": "Tether",
                "price_usd": 1.00,
                "market_cap": 110000000000,
                "volume_24h": 50000000000,
                "percent_change_24h": 0.01,
                "circulating_supply": 110000000000,
            },
            {
                "symbol": "BNB",
                "name": "Binance Coin",
                "price_usd": 450,
                "market_cap": 75000000000,
                "volume_24h": 5000000000,
                "percent_change_24h": 1.2,
                "circulating_supply": 170000000,
            },
            {
                "symbol": "SOL",
                "name": "Solana",
                "price_usd": 150,
                "market_cap": 50000000000,
                "volume_24h": 6000000000,
                "percent_change_24h": 3.4,
                "circulating_supply": 330000000,
            },
            {
                "symbol": "XRP",
                "name": "XRP",
                "price_usd": 0.85,
                "market_cap": 40000000000,
                "volume_24h": 3000000000,
                "percent_change_24h": -0.5,
                "circulating_supply": 47000000000,
            },
            {
                "symbol": "ADA",
                "name": "Cardano",
                "price_usd": 1.20,
                "market_cap": 38000000000,
                "volume_24h": 2000000000,
                "percent_change_24h": 2.1,
                "circulating_supply": 32000000000,
            },
            {
                "symbol": "DOGE",
                "name": "Dogecoin",
                "price_usd": 0.20,
                "market_cap": 25000000000,
                "volume_24h": 1000000000,
                "percent_change_24h": 4.0,
                "circulating_supply": 130000000000,
            },
            {
                "symbol": "MATIC",
                "name": "Polygon",
                "price_usd": 1.50,
                "market_cap": 14000000000,
                "volume_24h": 1500000000,
                "percent_change_24h": 1.5,
                "circulating_supply": 10000000000,
            },
            {
                "symbol": "DOT",
                "name": "Polkadot",
                "price_usd": 8.50,
                "market_cap": 12000000000,
                "volume_24h": 800000000,
                "percent_change_24h": -1.0,
                "circulating_supply": 1200000000,
            },
            {
                "symbol": "AVAX",
                "name": "Avalanche",
                "price_usd": 35,
                "market_cap": 10000000000,
                "volume_24h": 1200000000,
                "percent_change_24h": 3.2,
                "circulating_supply": 310000000,
            },
            {
                "symbol": "TRX",
                "name": "Tron",
                "price_usd": 0.08,
                "market_cap": 9000000000,
                "volume_24h": 800000000,
                "percent_change_24h": 2.7,
                "circulating_supply": 89000000000,
            },
            {
                "symbol": "LTC",
                "name": "Litecoin",
                "price_usd": 200,
                "market_cap": 8000000000,
                "volume_24h": 900000000,
                "percent_change_24h": 1.9,
                "circulating_supply": 73000000,
            },
            {
                "symbol": "SHIB",
                "name": "Shiba Inu",
                "price_usd": 0.000025,
                "market_cap": 7000000000,
                "volume_24h": 500000000,
                "percent_change_24h": 4.5,
                "circulating_supply": 500000000000000,
            },
            {
                "symbol": "WBTC",
                "name": "Wrapped Bitcoin",
                "price_usd": 67500,
                "market_cap": 7000000000,
                "volume_24h": 300000000,
                "percent_change_24h": 2.3,
                "circulating_supply": 120000,
            },
        ]

        for coin in crypto_data:
            obj, created = CryptoCurrency.objects.update_or_create(
                symbol=coin["symbol"],
                defaults={
                    "name": coin["name"],
                    "price_usd": coin["price_usd"],
                    "market_cap": coin["market_cap"],
                    "volume_24h": coin["volume_24h"],
                    "percent_change_24h": coin["percent_change_24h"],
                    "circulating_supply": coin["circulating_supply"],
                },
            )
            status = "Created" if created else "Updated"
            self.stdout.write(f"{status} {coin['symbol']}")

        self.stdout.write(self.style.SUCCESS("✅ Crypto data population complete!"))
