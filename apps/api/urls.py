from django.urls import path
from apps.api import views

urlpatterns = [
    path("crypto-list/", views.CryptoListView.as_view(), name="crypto-list"),
    path("crypto-detail/<str:symbol>/", views.CryptoDetailView.as_view(), name="crypto-detail"),
    path("crypto-conversion/", views.CryptoConversionView.as_view(), name="crypto-conversion"),
    path("conversion-history/", views.ConversionHistoryView.as_view(), name="conversion-history"),
    path("apr-calculator/", views.APRCalculatorView.as_view(), name="apr-calculator"),
    path("update-data/", views.UpdateCryptoData.as_view(), name="update-data"),
    path('logout/', views.logout_view, name='logout'),
]