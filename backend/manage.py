import os
import sys
from pathlib import Path


def main():
    """Run administrative tasks."""
    # BASE_DIR is backend/ folder
    BASE_DIR = Path(__file__).resolve().parent
    
    # The backend folder is already in the path when running manage.py.
    # We use full package paths (e.g., apps.catalog) for better IDE resolution.
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
