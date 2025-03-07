from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import (
    Reservation, Client, Service, ReservationStatusType, Specialist, Subscription, ReservationType, TariffUnit, 
    ServiceGroup, ClientGroup, ClientRating, Room, SpecialistColor, CancellationPolicy, CancellationReason, PaymentType,
    Payment
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


class ClientGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientGroup
        fields = '__all__'


class ClientRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRating
        fields = '__all__'


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'


class SpecialistColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecialistColor
        fields = '__all__'


class CancellationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationPolicy
        fields = '__all__'


class CancellationReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationReason
        fields = '__all__'


class PaymentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentType
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

