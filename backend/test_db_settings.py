import os
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parent))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ['DATABASE_URL'] = 'postgresql://postgres.yvnqwhgjvxktlyhnikzx:Specsit%402026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres'
os.environ['DB_ENGINE'] = 'django.db.backends.postgresql'

import django
django.setup()

from django.conf import settings
print("DATABASES CONFIG:", settings.DATABASES)
