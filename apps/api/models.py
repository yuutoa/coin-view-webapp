from django.db import models
from django.contrib.auth.models import User

class CryptoCurrency(models.Model):
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=50)
    price_usd = models.DecimalField(max_digits=20, decimal_places=8, default=0.0)
    market_cap = models.BigIntegerField(default=0)
    volume_24h = models.BigIntegerField(default=0)
    percent_change_24h = models.FloatField(default=0.0)
    circulating_supply = models.BigIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.symbol})"

class ConversionHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    from_currency = models.CharField(max_length=10)
    to_currency = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=20, decimal_places=8)
    converted_amount = models.DecimalField(max_digits=20, decimal_places=8)
    conversion_rate = models.DecimalField(max_digits=20, decimal_places=8)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.from_currency} to {self.to_currency}"

