from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import (
    Reservation, Client, Service, ReservationStatusType, Specialist, Subscription, ReservationType, TariffUnit, 
    ServiceGroup
)


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'


class ReservationStatusTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationStatusType
        fields = '__all__'


class ClientSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(
        required=True,
        allow_blank=False,
        validators=[UniqueValidator(queryset=Client.objects.all())],
        help_text=(
            '<span style="color: red;"><code>unique</code></span>'
            'Номер телефона клиента'
        ),
    )

    class Meta:
        model = Client
        fields = '__all__'


class SpecialistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialist
        fields = '__all__'


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = '__all__'


class ReservationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationType
        fields = '__all__'


class TariffUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffUnit
        fields = '__all__'


class ServiceGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceGroup
        fields = '__all__'
