from rest_framework import serializers
from apps.api.models import CryptoCurrency, ConversionHistory
from apps.api.services import calculate_apr

class CryptoCurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = CryptoCurrency
        fields = "__all__"

class ConversionHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversionHistory
        fields = "__all__"

class APRCalculatorSerializer(serializers.Serializer):
    crypto_symbol = serializers.CharField(max_length=10)
    principal = serializers.DecimalField(max_digits=20, decimal_places=6)
    rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    time_years = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_crypto_symbol(self, value):
        """Ensure the cryptocurrency symbol exists in the database."""
        value = value.upper()
        if not CryptoCurrency.objects.filter(symbol=value).exists():
            raise serializers.ValidationError("Invalid cryptocurrency symbol")
        return value

    def calculate_apr(self):
        return calculate_apr(
            self.validated_data["crypto_symbol"],
            self.validated_data["principal"],
            self.validated_data["rate"],
            self.validated_data["time_years"],
        )
