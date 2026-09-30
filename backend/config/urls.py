from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('clinics.urls')),
    path('api/', include('staff.urls')),
    path('api/', include('pets.urls')),
    path('api/', include('audit_log.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
