from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from .models import (
    SpecialistColor,
    CancellationPolicy,
    CancellationReason,
    Subscription,
    ReservationStatusType,
    Reservation,
    Scenario,
    TariffUnit,
    ServiceGroup,
    Service,
    Specialist,
    Client,
    ClientGroup,
    ClientRating,
    Room,
    Area,
    PaymentType,
    Payment,
    SpecialistWeeklyInterval,
    SpecialistScheduleOverride,
    SpecialistOverrideInterval,
)


class SpecialistWeeklyIntervalInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        # Группируем интервалы по weekday и валидируем пересечения прямо на форме.
        intervals_by_weekday = {}

        for form in self.forms:
            if not hasattr(form, "cleaned_data"):
                continue
            if form.cleaned_data.get("DELETE"):
                continue

            weekday = form.cleaned_data.get("weekday")
            start = form.cleaned_data.get("start_time")
            end = form.cleaned_data.get("end_time")
            if weekday is None or start is None or end is None:
                continue

            intervals_by_weekday.setdefault(int(weekday), []).append((start, end))

        for weekday, intervals in intervals_by_weekday.items():
            intervals_sorted = sorted(intervals, key=lambda x: x[0])
            prev_end = None
            for start, end in intervals_sorted:
                if start >= end:
                    raise ValidationError("Начало интервала должно быть меньше конца")
                if prev_end is not None and start < prev_end:
                    raise ValidationError("Интервалы расписания пересекаются")
                prev_end = end


class SpecialistWeeklyIntervalInline(admin.TabularInline):
    model = SpecialistWeeklyInterval
    extra = 0
    formset = SpecialistWeeklyIntervalInlineFormSet


class SpecialistOverrideIntervalInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()

        # Если дата помечена как выходной — запрещаем любые интервалы в инлайне.
        if getattr(self.instance, "is_day_off", False):
            has_any_interval = any(
                getattr(form, "cleaned_data", None)
                and not form.cleaned_data.get("DELETE")
                and form.cleaned_data.get("start_time") is not None
                and form.cleaned_data.get("end_time") is not None
                for form in self.forms
            )
            if has_any_interval:
                raise ValidationError("Нельзя задавать интервалы, если выбран выходной")

        # Дополнительная валидация пересечений интервалов override.
        intervals = []
        for form in self.forms:
            if not hasattr(form, "cleaned_data"):
                continue
            if form.cleaned_data.get("DELETE"):
                continue

            start = form.cleaned_data.get("start_time")
            end = form.cleaned_data.get("end_time")
            if start is None or end is None:
                continue
            intervals.append((start, end))

        intervals_sorted = sorted(intervals, key=lambda x: x[0])
        prev_end = None
        for start, end in intervals_sorted:
            if start >= end:
                raise ValidationError("Начало интервала должно быть меньше конца")
            if prev_end is not None and start < prev_end:
                raise ValidationError("Интервалы исключения пересекаются")
            prev_end = end


class SpecialistOverrideIntervalInline(admin.TabularInline):
    model = SpecialistOverrideInterval
    extra = 0
    formset = SpecialistOverrideIntervalInlineFormSet


@admin.register(SpecialistColor)
class SpecialistColorAdmin(admin.ModelAdmin):
    list_display = ("specialist", "primary_color", "secondary_color")
    search_fields = ("specialist__name",)


@admin.register(CancellationPolicy)
class CancellationPolicyAdmin(admin.ModelAdmin):
    list_display = ("scenario", "hours_before")
    list_filter = ("scenario",)
    search_fields = ("scenario__name",)


@admin.register(CancellationReason)
class CancellationReasonAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "order")
    list_editable = ("is_active", "order")
    search_fields = ("name",)
    ordering = ("order", "name")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("client", "scenario", "balance")
    list_filter = ("scenario",)
    search_fields = ("client__name", "scenario__name")


@admin.register(ReservationStatusType)
class ReservationStatusTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "description")
    search_fields = ("name",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "client",
        "specialist",
        "room",
        "scenario",
        "datetimestart",
        "datetimeend",
        "status",
    )
    list_filter = ("status", "scenario", "specialist", "room")
    search_fields = ("client__name", "specialist__name", "room__name")
    date_hierarchy = "datetimestart"


@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(TariffUnit)
class TariffUnitAdmin(admin.ModelAdmin):
    list_display = ("scenario", "min_reservation_time", "tariff_unit_cost")
    list_filter = ("scenario",)
    search_fields = ("scenario__name",)


@admin.register(ServiceGroup)
class ServiceGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "active")
    list_filter = ("active",)
    search_fields = ("name",)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "active", "group")
    list_filter = ("active", "group")
    search_fields = ("name", "group__name")


@admin.register(Specialist)
class SpecialistAdmin(admin.ModelAdmin):
    list_display = ("name", "active")
    list_filter = ("active",)
    search_fields = ("name",)
    inlines = (SpecialistWeeklyIntervalInline,)


@admin.register(SpecialistScheduleOverride)
class SpecialistScheduleOverrideAdmin(admin.ModelAdmin):
    list_display = ("specialist", "date", "is_day_off")
    list_filter = ("is_day_off", "specialist")
    search_fields = ("specialist__name",)
    date_hierarchy = "date"
    inlines = (SpecialistOverrideIntervalInline,)


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "get_groups")
    list_filter = ("groups",)
    search_fields = ("name", "phone")

    def get_groups(self, obj):
        return ", ".join([g.name for g in obj.groups.all()])

    get_groups.short_description = "Группы"


@admin.register(ClientGroup)
class ClientGroupAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(ClientRating)
class ClientRatingAdmin(admin.ModelAdmin):
    list_display = ("client", "rating", "comment")
    list_filter = ("rating",)
    search_fields = ("client__name",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "area", "hourstart", "hourend")
    list_filter = ("area",)
    search_fields = ("name", "area__name")
    filter_horizontal = ("scenario",)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        from .models import Area

        if db_field.name == "scenario":
            obj_id = (
                request.resolver_match.kwargs.get("object_id")
                if hasattr(request, "resolver_match")
                else None
            )
            area_id = None
            if obj_id:
                from .models import Room

                try:
                    room = Room.objects.get(pk=obj_id)
                    if room.area_id:
                        area_id = room.area_id
                except Room.DoesNotExist:
                    pass
            if area_id:
                area = Area.objects.filter(pk=area_id).first()
                if area:
                    kwargs["queryset"] = area.scenario.all()
                else:
                    kwargs["queryset"] = Area.objects.none()
            else:
                kwargs["queryset"] = Area.objects.none()
        return super().formfield_for_manytomany(db_field, request, **kwargs)


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    filter_horizontal = ("scenario",)
