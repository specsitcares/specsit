"""
File: apps\system_core\dashboard.py
Module: System_core
Description: System-wide shared models, utilities, and core dashboards. Contains logic related to this module.
"""
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

def dashboard_callback(request, context):
    """
    Customizes the Unfold dashboard to show major apps and quick actions.
    """
    context.update({
        "custom_variable": "Welcome to SpectsHQ Admin",
        # We can add more context for custom template components here
    })
    return context
