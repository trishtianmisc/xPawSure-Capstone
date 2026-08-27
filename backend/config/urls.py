from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('clinics.urls')),
    path('api/', include('staff.urls')),
    path('api/', include('pets.urls')),
    path('api/', include('veterinarians.urls')),
]
