from django.contrib import admin

from .models import (
    SpecialistColor, CancellationPolicy, CancellationReason, Subscription, ReservationStatusType,
    Reservation, ReservationType, TariffUnit, ServiceGroup, Service,
    Specialist, Client, ClientGroup, ClientRating, Room
)


@admin.register(SpecialistColor)
class SpecialistColorAdmin(admin.ModelAdmin):
    list_display = ('specialist', 'primary_color', 'secondary_color')
    search_fields = ('specialist__name',)

@admin.register(CancellationPolicy)
class CancellationPolicyAdmin(admin.ModelAdmin):
    list_display = ('reservation_type', 'hours_before')
    list_filter = ('reservation_type',)
    search_fields = ('reservation_type__name',)

@admin.register(CancellationReason)
class CancellationReasonAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'order')
    list_editable = ('is_active', 'order')
    search_fields = ('name',)
    ordering = ('order', 'name')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('client', 'reservation_type', 'balance')
    list_filter = ('reservation_type',)
    search_fields = ('client__name', 'reservation_type__name')

@admin.register(ReservationStatusType)
class ReservationStatusTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('client', 'specialist', 'room', 'reservation_type', 'datetimestart', 'datetimeend', 'status')
    list_filter = ('status', 'reservation_type', 'specialist', 'room')
    search_fields = ('client__name', 'specialist__name', 'room__name')
    date_hierarchy = 'datetimestart'

@admin.register(ReservationType)
class ReservationTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(TariffUnit)
class TariffUnitAdmin(admin.ModelAdmin):
    list_display = ('reservation_type', 'min_reservation_time', 'tariff_unit_cost')
    list_filter = ('reservation_type',)
    search_fields = ('reservation_type__name',)

@admin.register(ServiceGroup)
class ServiceGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'active')
    list_filter = ('active',)
    search_fields = ('name',)

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'active', 'group')
    list_filter = ('active', 'group', 'reservation_type')
    search_fields = ('name', 'group__name')

@admin.register(Specialist)
class SpecialistAdmin(admin.ModelAdmin):
    list_display = ('name', 'active')
    list_filter = ('active', 'reservation_type')
    search_fields = ('name',)

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'get_groups')
    list_filter = ('groups',)
    search_fields = ('name', 'phone')

    def get_groups(self, obj):
        return ", ".join([g.name for g in obj.groups.all()])
    get_groups.short_description = "Группы"

@admin.register(ClientGroup)
class ClientGroupAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(ClientRating)
class ClientRatingAdmin(admin.ModelAdmin):
    list_display = ('client', 'rating', 'comment')
    list_filter = ('rating',)
    search_fields = ('client__name',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'hourstart', 'hourend')
    search_fields = ('name',)
    filter_horizontal = ('reservation_type', 'service')

