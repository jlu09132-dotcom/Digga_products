from django.apps import AppConfig


class MyappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'myapp'
    verbose_name       = 'Digga Marketplace'

    def ready(self):
        import myapp.signals  # noqa: F401 — registers signal handlers