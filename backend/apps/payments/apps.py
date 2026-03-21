"""
File: apps\payments\apps.py
Module: Payments
Description: Billing, payment gateway integration, and transaction history. Basic configuration class for the Django application.
"""
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = 'apps.payments'
