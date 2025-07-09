from django.core.management.base import BaseCommand
from booking.models import Scenario, CancellationPolicy, Reservation, Subscription, TariffUnit
from django.db import transaction

class Command(BaseCommand):
    help = 'Автоматически заполняет новые поля scenario для CancellationPolicy, Reservation, Subscription, TariffUnit.'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Создать три сценария, если их нет
            scenario_names = ['Муз. школа', 'Реп. точка', 'Муз+Реп']
            scenarios = []
            for name in scenario_names:
                try:
                    scenario = Scenario.objects.get(name=name)
                except Scenario.DoesNotExist:
                    self.stderr.write(self.style.ERROR(f'Сценарий "{name}" не найден! Создайте его вручную через админку или shell.'))
                    return
                scenarios.append(scenario)

            # 1. CancellationPolicy: назначить сценарии по очереди
            policies = list(CancellationPolicy.objects.filter(scenario__isnull=True))
            for idx, policy in enumerate(policies):
                scenario = scenarios[idx % len(scenarios)]
                policy.scenario = scenario
                policy.save()
                self.stdout.write(f'CancellationPolicy {policy.pk} → Scenario {scenario.name}')

            # 2. Reservation: если не задано, присвоить первый сценарий
            main_scenario = scenarios[0]
            for reservation in Reservation.objects.filter(scenario__isnull=True):
                reservation.scenario = main_scenario
                reservation.save()
                self.stdout.write(f'Reservation {reservation.pk} → Scenario {main_scenario.name}')

            # 3. Subscription: аналогично
            for sub in Subscription.objects.filter(scenario__isnull=True):
                sub.scenario = main_scenario
                sub.save()
                self.stdout.write(f'Subscription {sub.pk} → Scenario {main_scenario.name}')

            # 4. TariffUnit: аналогично
            for tu in TariffUnit.objects.filter(scenario__isnull=True):
                tu.scenario = main_scenario
                tu.save()
                self.stdout.write(f'TariffUnit {tu.pk} → Scenario {main_scenario.name}')

        self.stdout.write(self.style.SUCCESS('Поля scenario заполнены для всех моделей.'))
