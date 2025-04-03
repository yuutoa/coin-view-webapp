from django.contrib import admin
from apps.api.models import CryptoCurrency, ConversionHistory

admin.site.register(CryptoCurrency)
admin.site.register(ConversionHistory)
