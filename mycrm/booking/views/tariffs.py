import json

from datetime import datetime

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt

from .create_booking import get_available_tariffs_for_booking
from ..models import Room, Scenario


@csrf_exempt
def get_available_tariffs_view(request):
    if request.method not in ("GET", "POST"):
        return JsonResponse(
            {"success": False, "error": "Метод не поддерживается"}, status=405
        )

    payload = {}
    if request.method == "GET":
        payload = request.GET
    else:
        try:
            payload = json.loads(request.body or "{}")
        except Exception:
            payload = request.POST

    scenario_id = payload.get("scenario_id")
    room_id = payload.get("room_id")
    date_iso = payload.get("date_iso") or payload.get("date")
    start_time_hm = payload.get("start_time_hm") or payload.get("start_time")
    end_time_hm = payload.get("end_time_hm") or payload.get("end_time")
    people_count_raw = payload.get("people_count")

    if not all([scenario_id, room_id, date_iso, start_time_hm]):
        return JsonResponse(
            {
                "success": False,
                "error": "Не все обязательные поля заполнены",
            },
            status=400,
        )

    try:
        scenario_id_int = int(scenario_id)
        room_id_int = int(room_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {
                "success": False,
                "error": "Некорректный scenario_id или room_id",
            },
            status=400,
        )

    people_count = None
    if people_count_raw is not None and str(people_count_raw).strip() != "":
        try:
            people_count = int(people_count_raw)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "success": False,
                    "error": "Некорректное количество людей",
                },
                status=400,
            )

    scenario = get_object_or_404(Scenario, id=scenario_id_int)
    room = get_object_or_404(Room, id=room_id_int)

    tariffs = get_available_tariffs_for_booking(
        scenario=scenario,
        room=room,
        date_iso=str(date_iso),
        start_time_hm=str(start_time_hm),
        end_time_hm=(
            str(end_time_hm)
            if end_time_hm is not None and str(end_time_hm).strip() != ""
            else None
        ),
        people_count=people_count,
    )

    weekday = None
    try:
        weekday = int(datetime.strptime(str(date_iso), "%Y-%m-%d").date().weekday())
    except Exception:
        weekday = None

    return JsonResponse(
        {
            "success": True,
            "tariffs": [
                {
                    "id": t.id,
                    "name": t.name,
                    "base_cost": str(t.base_cost),
                    "base_duration_minutes": t.base_duration_minutes,
                    "max_people": t.max_people,
                    "day_intervals": [
                        {
                            "start_time": i.start_time.strftime("%H:%M"),
                            "end_time": i.end_time.strftime("%H:%M"),
                        }
                        for i in list(getattr(t, "weekly_intervals", []).all())
                        if weekday is not None and int(i.weekday) == weekday
                    ],
                }
                for t in tariffs
            ],
        }
    )
