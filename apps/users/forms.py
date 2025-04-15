# apps/users/forms.py

from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django import forms
from django.core.validators import RegexValidator

class CustomUserCreationForm(UserCreationForm):
    first_name = forms.CharField(
        max_length=30,
        required=True,
        label="First name",
        validators=[RegexValidator(r'^[a-zA-Z\s]*$', 'Only letters and spaces are allowed.')]
    )
    last_name = forms.CharField(
        max_length=30,
        required=True,
        label="Last name",
        validators=[RegexValidator(r'^[a-zA-Z\s]*$', 'Only letters and spaces are allowed.')]
    )
    email = forms.EmailField(max_length=254, required=True, label="Email address")
    username = forms.CharField(
        max_length=150,
        required=True,
        label="Username",
        validators=[RegexValidator(r'^[a-zA-Z0-9._-]+$', 'Enter a valid username. This value may contain letters, numbers, and ./-/_ characters.')]
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password2'].help_text = None
        for visible in self.visible_fields():
            visible.field.widget.attrs['class'] = 'form-control'

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ["first_name", "last_name", "email", "username", "password1", "password2"]


class CustomAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({'class': 'form-control'})
        self.fields['password'].widget.attrs.update({'class': 'form-control'})