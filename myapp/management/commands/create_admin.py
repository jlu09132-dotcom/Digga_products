"""
Management command to create an AdminUser with a properly hashed password.

Usage:
    python manage.py create_admin
    python manage.py create_admin --email admin@digga.com --name "Admin" --password secret123
"""

from django.core.management.base import BaseCommand, CommandError
from myapp.models import AdminUser


class Command(BaseCommand):
    help = 'Create an AdminUser account with a properly hashed password.'

    def add_arguments(self, parser):
        parser.add_argument('--email',    type=str, help='Admin email address')
        parser.add_argument('--name',     type=str, help='Admin full name')
        parser.add_argument('--phone',    type=str, default='0000000000', help='Phone number')
        parser.add_argument('--password', type=str, help='Admin password (plain text — will be hashed)')
        parser.add_argument('--force',    action='store_true', help='Update existing admin if email exists')

    def handle(self, *args, **options):
        email    = options['email']    or input('Email:    ').strip()
        name     = options['name']     or input('Name:     ').strip()
        password = options['password'] or input('Password: ').strip()
        phone    = options['phone']

        if not email or not name or not password:
            raise CommandError('email, name, and password are all required.')

        existing = AdminUser.objects.filter(email=email).first()

        if existing:
            if options['force']:
                existing.name  = name
                existing.phone = phone
                existing.set_password(password)
                existing.is_active = True
                existing.save()
                self.stdout.write(
                    self.style.SUCCESS(f'✅  Updated AdminUser: {email} (id={existing.admin_id})')
                )
            else:
                raise CommandError(
                    f'AdminUser with email "{email}" already exists. '
                    f'Use --force to overwrite.'
                )
        else:
            admin = AdminUser(email=email, name=name, phone=phone)
            admin.set_password(password)
            admin.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅  AdminUser created: {email} (id={admin.admin_id})\n'
                    f'    Login at /login/ with role → admin'
                )
            )