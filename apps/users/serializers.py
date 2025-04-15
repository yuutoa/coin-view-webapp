from dj_rest_auth.serializers import UserDetailsSerializer
from rest_framework import serializers

class CustomUserSerializer(UserDetailsSerializer):
    class Meta(UserDetailsSerializer.Meta):
        fields = ("id", "username", "email", "first_name", "last_name")
