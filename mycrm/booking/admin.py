from django.contrib import admin
from .models import SpecialistColor

@admin.register(SpecialistColor)
class SpecialistColorAdmin(admin.ModelAdmin):
    list_display = ('specialist', 'primary_color', 'secondary_color')
    search_fields = ('specialist__name',)

# Register your models here.
