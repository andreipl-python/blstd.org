from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from ..models import (
    Reservation,
    Client,
    Service,
    ReservationStatusType,
    Specialist,
    Subscription,
    Scenario,
    TariffUnit,
    ServiceGroup,
    ClientGroup,
    ClientRating,
    Room,
    SpecialistColor,
    CancellationPolicy,
    CancellationReason,
    PaymentType,
    Payment,
    Area,
)


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = "__all__"


class ReservationStatusTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationStatusType
        fields = "__all__"


class ClientSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(
        required=True,
        allow_blank=False,
        validators=[UniqueValidator(queryset=Client.objects.all())],
        help_text=(
            '<span style="color: red;"><code>unique</code></span>'
            "Номер телефона клиента"
        ),
    )
    groups = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ClientGroup.objects.all(),
        required=False,
        help_text="ID групп, в которые входит клиент",
    )

    class Meta:
        model = Client
        fields = "__all__"


class SpecialistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialist
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    scenario = serializers.PrimaryKeyRelatedField(
        queryset=Scenario.objects.all(),
        required=False,
        allow_null=True,
        help_text="ID сценария, к которому относится услуга. Необязательное поле.",
    )
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),
        required=False,
        allow_null=True,
        help_text="ID комнаты, к которой относится услуга. Необязательное поле.",
    )

    class Meta:
        model = Service
        fields = "__all__"


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = "__all__"


class ScenarioSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(
        required=True,
        help_text="Активен ли сценарий. True — доступен для выбора, False — скрыт.",
    )

    class Meta:
        model = Scenario
        fields = "__all__"


class TariffUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = TariffUnit
        fields = "__all__"


class ServiceGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceGroup
        fields = "__all__"


class ClientGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientGroup
        fields = "__all__"


class ClientRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRating
        fields = "__all__"


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = "__all__"


class RoomSerializer(serializers.ModelSerializer):
    area = serializers.PrimaryKeyRelatedField(
        queryset=Area.objects.all(),
        required=True,
        allow_null=False,
        help_text="ID помещения",
    )
    scenario = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Scenario.objects.all(),
        required=False,
        allow_empty=True,
        help_text="ID сценариев, назначенных комнате (только из сценариев помещения). Необязательное поле.",
    )

    def validate(self, attrs):
        area = attrs.get("area") or getattr(self.instance, "area", None)
        scenarios = attrs.get("scenario", [])
        if area is None:
            raise serializers.ValidationError({"area": "Необходимо выбрать помещение."})
        # Если сценарии не выбраны — это допустимо (поле опционально)
        if scenarios:
            allowed_scenarios = set(area.scenario.values_list("id", flat=True))
            scenario_ids = set([s.id for s in scenarios])
            if not scenario_ids.issubset(allowed_scenarios):
                raise serializers.ValidationError(
                    {
                        "scenario": "Можно выбрать только сценарии, назначенные у выбранного помещения."
                    }
                )
        return attrs

    class Meta:
        model = Room
        fields = "__all__"


class SpecialistColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpecialistColor
        fields = "__all__"


class CancellationPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationPolicy
        fields = "__all__"


class CancellationReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = CancellationReason
        fields = "__all__"


class PaymentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentType
        fields = "__all__"


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"
