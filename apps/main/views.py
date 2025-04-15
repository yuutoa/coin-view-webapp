# apps/main/views

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.urls import reverse_lazy

def welcome_view(request):
    if request.user.is_authenticated:
        return redirect('app_home')
    return render(request, 'main/welcome.html')

@login_required(login_url=reverse_lazy('login'))
def spa_view(request):
    return render(request, 'main/spa.html')