from django.utils.deprecation import MiddlewareMixin


class RoleBasedRedirectMiddleware(MiddlewareMixin):
    """
    Placeholder middleware for future server-side role-based redirects.
    All role enforcement is currently handled client-side via JavaScript
    and enforced server-side via DRF permission classes.
    """
    def process_request(self, request):
        # No server-side redirect needed — frontend handles routing
        pass