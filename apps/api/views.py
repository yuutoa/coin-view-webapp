from rest_framework import views, generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth.models import User
from decimal import Decimal, ROUND_DOWN
from apps.api.serializers import (
    CryptoCurrencySerializer,
    ConversionHistorySerializer,
    APRCalculatorSerializer,
)
from apps.api.models import CryptoCurrency, ConversionHistory
from apps.api.services import get_crypto_data


class CryptoListView(generics.ListAPIView):
    """
    API to list all available cryptocurrencies.
    """

    queryset = CryptoCurrency.objects.all()
    serializer_class = CryptoCurrencySerializer
    permission_classes = [permissions.IsAuthenticated]


class CryptoDetailView(generics.RetrieveAPIView):
    """
    API to get details of a specific cryptocurrency by symbol.
    """

    queryset = CryptoCurrency.objects.all()
    serializer_class = CryptoCurrencySerializer
    lookup_field = "symbol"
    permission_classes = [permissions.IsAuthenticated]


class CryptoConversionView(views.APIView):
    """
    API to convert an amount from one cryptocurrency to another.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Example payload:
        {
            "from_currency": "BTC",
            "to_currency": "ETH",
            "amount": 0.01
        }
        """
        from_currency = request.data.get("from_currency")
        to_currency = request.data.get("to_currency")
        amount = request.data.get("amount")

        if not from_currency or not to_currency or not amount:
            return Response(
                {"error": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from_coin = CryptoCurrency.objects.get(symbol=from_currency.upper())
            to_coin = CryptoCurrency.objects.get(symbol=to_currency.upper())

            # Calculate conversion
            converted_amount = (
                Decimal(amount) * from_coin.price_usd
            ) / to_coin.price_usd
            conversion_rate = from_coin.price_usd / to_coin.price_usd

            # Round to 6 decimal places
            converted_amount = converted_amount.quantize(
                Decimal("0.000000"), rounding=ROUND_DOWN
            )
            conversion_rate = conversion_rate.quantize(
                Decimal("0.000000"), rounding=ROUND_DOWN
            )

            # Store in conversion history (if user is authenticated)
            if request.user.is_authenticated:
                ConversionHistory.objects.create(
                    user=request.user,
                    from_currency=from_currency.upper(),
                    to_currency=to_currency.upper(),
                    amount=Decimal(amount),
                    converted_amount=converted_amount,
                    conversion_rate=conversion_rate,
                )

            return Response(
                {
                    "from_currency": from_currency.upper(),
                    "to_currency": to_currency.upper(),
                    "amount": round(float(amount), 6),
                    "converted_amount": float(converted_amount),
                    "conversion_rate": float(conversion_rate),
                },
                status=status.HTTP_200_OK,
            )

        except CryptoCurrency.DoesNotExist:
            return Response(
                {"error": "Invalid currency symbol"}, status=status.HTTP_400_BAD_REQUEST
            )


class ConversionHistoryView(generics.ListAPIView):
    """
    API to get the conversion history of the authenticated user.
    """

    serializer_class = ConversionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ConversionHistory.objects.filter(user=self.request.user)


class APRCalculatorView(views.APIView):
    """
    API to calculate APR (Annual Percentage Rate) using cryptocurrency.
    """

    permission_classes = [permissions.IsAuthenticated]


    def post(self, request):
        serializer = APRCalculatorSerializer(data=request.data)
        if serializer.is_valid():
            apr_result = serializer.calculate_apr()
            return Response(apr_result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateCryptoData(views.APIView):
    """
    Fetch cryptocurrency prices from API and update the database.
    Returns a list of updated cryptocurrency symbols.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        updated_symbols = get_crypto_data()
        return Response({"updated_cryptos": updated_symbols}, status=status.HTTP_200_OK)
