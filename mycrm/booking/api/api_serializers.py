from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import Reservation, Client, Service, ReservationStatusType, Specialist


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
