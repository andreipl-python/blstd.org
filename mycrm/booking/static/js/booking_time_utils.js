/**
 * BookingTimeUtils — модуль утилит для работы со временем бронирования
 * 
 * Этот модуль предоставляет функции для:
 * - Парсинга и форматирования дат/времени
 * - Получения параметров сценариев бронирования (рабочие часы, тарифы)
 * - Загрузки и кэширования данных о бронированиях комнат
 * - Расчёта доступных временных слотов с учётом существующих бронирований
 * - Управления UI-селектами времени (длительность, начало, окончание)
 * 
 * Зависимости:
 * - window.SCENARIOS — массив сценариев бронирования (из Django контекста)
 * - window.TARIFF_UNITS — массив тарифных единиц (из Django контекста)
 * 
 * @namespace BookingTimeUtils
 */
(function () {
    // Предотвращаем повторную инициализацию
    if (window.BookingTimeUtils) {
        return;
    }

    /* =========================================================================
     * СЕКЦИЯ 1: Парсинг и форматирование дат/времени
     * ========================================================================= */

    /**
     * Парсит строку даты-времени в объект Date
     * @param {string} datetimeStr - Строка формата "YYYY-MM-DD HH:MM:SS" или "YYYY-MM-DD HH:MM"
     * @returns {Date|null} Объект Date или null при ошибке парсинга
     * @example
     * parseDatetimeStr("2025-12-22 14:30:00") // Date object
     * parseDatetimeStr("invalid") // null
     */
    function parseDatetimeStr(datetimeStr) {
        if (!datetimeStr) return null;
        var parts = String(datetimeStr).trim().split(' ');
        if (parts.length < 2) return null;
        var dateParts = parts[0].split('-');
        var timeParts = parts[1].split(':');
        if (dateParts.length < 3 || timeParts.length < 2) return null;
        return new Date(
            parseInt(dateParts[0], 10),
            parseInt(dateParts[1], 10) - 1,
            parseInt(dateParts[2], 10),
            parseInt(timeParts[0], 10),
            parseInt(timeParts[1], 10),
            timeParts[2] ? parseInt(timeParts[2], 10) : 0
        );
    }

    /**
     * Форматирует количество минут в строку времени HH:MM
     * @param {number} totalMinutes - Общее количество минут от начала суток
     * @returns {string} Строка формата "HH:MM" или пустая строка при ошибке
     * @example
     * formatTimeHHMM(90) // "01:30"
     * formatTimeHHMM(600) // "10:00"
     */
    function formatTimeHHMM(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m < 0) return '';
        var h = Math.floor(m / 60) % 24;
        var mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    /**
     * Парсит строку времени в количество минут от начала суток
     * @param {string} timeStr - Строка времени формата "HH:MM"
     * @returns {number} Количество минут от начала суток (0 при ошибке)
     *
     * Примечание: эта функция исторически возвращает `0` при ошибке/пустом вводе.
     * В местах, где нужно различать "00:00" и "время не выбрано", используется
     * отдельный парсер (например внутри `syncCreateBookingTariffs`) с возвратом `null`.
     * @example
     * parseTimeToMinutes("10:30") // 630
     * parseTimeToMinutes("14:00") // 840
     */
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        var parts = String(timeStr).split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    /**
     * Форматирует длительность в человекочитаемый формат
     * @param {number} totalMinutes - Длительность в минутах
     * @returns {string} Строка вида "1 ч 30 мин", "2 ч" или "45 мин"
     * @example
     * formatDurationHuman(90) // "1 ч 30 мин"
     * formatDurationHuman(120) // "2 ч"
     * formatDurationHuman(45) // "45 мин"
     */
    function formatDurationHuman(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m <= 0) return '';
        var h = Math.floor(m / 60);
        var mm = m % 60;
        if (h > 0 && mm > 0) return h + ' ч ' + mm + ' мин';
        if (h > 0) return h + ' ч';
        return mm + ' мин';
    }

    /**
     * Форматирует длительность в формат HH:MM
     * @param {number} totalMinutes - Длительность в минутах
     * @returns {string} Строка формата "HH:MM"
     * @example
     * formatDurationHHMM(90) // "01:30"
     * formatDurationHHMM(120) // "02:00"
     */
    function formatDurationHHMM(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m < 0) return '';
        var h = Math.floor(m / 60);
        var mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    /**
     * Возвращает правильное склонение слова "период" для числа
     * @param {number} n - Количество периодов
     * @returns {string} "период", "периода" или "периодов"
     * @example
     * formatPeriodsLabel(1) // "период"
     * formatPeriodsLabel(3) // "периода"
     * formatPeriodsLabel(5) // "периодов"
     */
    function formatPeriodsLabel(n) {
        var k = parseInt(n, 10);
        if (k === 1) return 'период';
        if (k >= 2 && k <= 4) return 'периода';
        return 'периодов';
    }

    /* =========================================================================
     * СЕКЦИЯ 2: Получение параметров сценариев бронирования
     * ========================================================================= */

    /**
     * Получает время начала рабочего дня для сценария в минутах
     * @param {number|string} scenarioId - ID сценария бронирования
     * @returns {number} Время начала в минутах от полуночи (0 по умолчанию)
     */
    function getScenarioWorkTimeStartMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 0;
        var s = window.SCENARIOS.find(function (x) {
            return String(x.pk) === String(scenarioId);
        });
        if (!s || !s.fields || !s.fields.work_time_start) return 0;
        return parseTimeToMinutes(String(s.fields.work_time_start).slice(0, 5)) || 0;
    }

    /**
     * Получает время окончания рабочего дня для сценария в минутах
     * @param {number|string} scenarioId - ID сценария бронирования
     * @returns {number} Время окончания в минутах от полуночи (1440 = 24:00 по умолчанию)
     */
    function getScenarioWorkTimeEndMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 24 * 60;
        var s = window.SCENARIOS.find(function (x) {
            return String(x.pk) === String(scenarioId);
        });
        if (!s || !s.fields || !s.fields.work_time_end) return 24 * 60;
        return parseTimeToMinutes(String(s.fields.work_time_end).slice(0, 5)) || (24 * 60);
    }

    /**
     * Получает минимальную длительность бронирования для сценария (один период)
     * @param {number|string} scenarioId - ID сценария бронирования
     * @returns {number} Минимальная длительность в минутах (60 по умолчанию)
     */
    function getScenarioMinDurationMinutes(scenarioId) {
        var fallback = 60;
        if (!scenarioId || !Array.isArray(window.TARIFF_UNITS)) return fallback;
        var tu = window.TARIFF_UNITS.find(function (t) {
            return t.fields && String(t.fields.scenario) === String(scenarioId);
        });
        if (!tu || !tu.fields || !tu.fields.min_reservation_time) return fallback;
        var parts = String(tu.fields.min_reservation_time).split(':');
        if (parts.length < 2) return fallback;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
        var total = h * 60 + m;
        return total > 0 ? total : fallback;
    }

    /**
     * Получает стоимость одного периода (тарифной единицы) для сценария
     * @param {number|string} scenarioId - ID сценария бронирования
     * @returns {number} Стоимость в валюте (0 по умолчанию)
     */
    function getScenarioTariffUnitCost(scenarioId) {
        if (!scenarioId || !Array.isArray(window.TARIFF_UNITS)) return 0;
        var tu = window.TARIFF_UNITS.find(function (t) {
            return t.fields && String(t.fields.scenario) === String(scenarioId);
        });
        if (!tu || !tu.fields || tu.fields.tariff_unit_cost === undefined || tu.fields.tariff_unit_cost === null) return 0;
        var v = parseFloat(String(tu.fields.tariff_unit_cost));
        return Number.isFinite(v) ? v : 0;
    }

    /* =========================================================================
     * СЕКЦИЯ 3: Загрузка и кэширование данных о бронированиях комнат
     * ========================================================================= */

    /**
     * Внутренний кэш для хранения загруженных бронирований комнат
     * Ключ: "roomId|dateIso|excludeBookingId"
     * Значение: массив интервалов {bookingId, startMinutes, endMinutes}
     * @private
     */
    var _roomBookingsCache = new Map();

    /**
     * Генерирует ключ для кэша бронирований
     * @private
     */
    function _cacheKey(roomId, dateIso, excludeBookingId) {
        return String(roomId) + '|' + String(dateIso) + '|' + (excludeBookingId === undefined || excludeBookingId === null ? '' : String(excludeBookingId));
    }

    /**
     * Очищает кэш бронирований комнат
     * Вызывается при необходимости принудительного обновления данных
     */
    function clearRoomBookingsCache() {
        _roomBookingsCache.clear();
    }

    /**
     * Нормализует массив бронирований в формат интервалов для указанной даты
     *
     * Входные данные (`bookings`) приходят с бэкенда и содержат `blocks_datetime_range`:
     * это последовательность тайм-слотов (обычно шаг 15 минут) в виде строк
     * "YYYY-MM-DD HH:MM:SS". Для расчёта занятости нам достаточно границ:
     *
     * - начало = первый элемент массива на нужную дату
     * - конец  = последний элемент массива на нужную дату
     *
     * Важно: последний элемент интерпретируется как **время окончания** брони,
     * поэтому здесь не добавляем дополнительные +15 минут.
     *
     * Этот формат используется и в bulk UI: к реальным бронированиям комнаты
     * могут добавляться «синтетические» интервалы занятости из других bulk-блоков.
     * @param {Array} bookings - Массив бронирований с blocks_datetime_range
     * @param {string} dateIso - Дата в формате ISO (YYYY-MM-DD)
     * @param {number|string} [excludeBookingId] - ID брони для исключения (при редактировании)
     * @returns {Array<{bookingId: number, startMinutes: number, endMinutes: number}>}
     */
    function normalizeRoomBookingsForDate(bookings, dateIso, excludeBookingId) {
        if (!Array.isArray(bookings)) return [];

        var parsed = [];
        bookings.forEach(function (booking) {
            if (!booking || !booking.blocks_datetime_range || !booking.blocks_datetime_range.length) return;
            if (excludeBookingId !== undefined && excludeBookingId !== null && String(booking.id) === String(excludeBookingId)) {
                return;
            }

            var blocksOnDate = booking.blocks_datetime_range.filter(function (block) {
                return String(block).startsWith(dateIso);
            });
            if (blocksOnDate.length === 0) return;

            var startDt = parseDatetimeStr(blocksOnDate[0]);
            var endDt = parseDatetimeStr(blocksOnDate[blocksOnDate.length - 1]);
            if (!startDt || !endDt) return;

            // Последний элемент в blocks_datetime_range - это время окончания брони,
            // не нужно добавлять +15 (раньше добавляли, т.к. думали что это начало последнего интервала)
            var endMinutes = endDt.getHours() * 60 + endDt.getMinutes();

            parsed.push({
                bookingId: booking.id,
                startMinutes: startDt.getHours() * 60 + startDt.getMinutes(),
                endMinutes: endMinutes
            });
        });

        return parsed;
    }

    /**
     * Загружает бронирования комнаты на указанную дату с сервера (AJAX)
     * Результат кэшируется для повторных запросов
     * 
     * @param {number|string} roomId - ID комнаты
     * @param {string} dateIso - Дата в формате ISO (YYYY-MM-DD)
     * @param {number|string} [excludeBookingId] - ID брони для исключения
     * @param {Function} [callback] - Колбэк, вызываемый с массивом интервалов
     * @param {boolean} [forceReload=false] - Принудительная перезагрузка с сервера
     */
    function loadRoomBookingsForDate(roomId, dateIso, excludeBookingId, callback, forceReload) {
        var key = _cacheKey(roomId, dateIso, excludeBookingId);
        
        // Если не требуется принудительная перезагрузка и данные есть в кэше - возвращаем из кэша
        if (!forceReload && _roomBookingsCache.has(key)) {
            if (callback) callback(_roomBookingsCache.get(key));
            return;
        }

        // Добавляем timestamp для обхода браузерного кэша
        var url = '/booking/room-bookings-for-date/?room_id=' + encodeURIComponent(roomId) + '&date=' + encodeURIComponent(dateIso) + '&_t=' + Date.now();
        fetch(url, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (data && data.success && Array.isArray(data.bookings)) {
                    var intervals = normalizeRoomBookingsForDate(data.bookings, dateIso, excludeBookingId);
                    _roomBookingsCache.set(key, intervals);
                    if (callback) callback(intervals);
                } else {
                    _roomBookingsCache.set(key, []);
                    if (callback) callback([]);
                }
            })
            .catch(function () {
                _roomBookingsCache.set(key, []);
                if (callback) callback([]);
            });
    }

    /* =========================================================================
     * СЕКЦИЯ 4: Расчёт доступных временных слотов
     * ========================================================================= */

    /**
     * Возвращает все доступные слоты времени начала бронирования
     * Учитывает существующие бронирования и рабочие часы
     * 
     * @param {Array} roomBookings - Массив интервалов занятости комнаты
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Минимальная длительность бронирования (один период)
     * @returns {Array<number>} Массив доступных времён начала в минутах
     */
    function getAvailableStartTimeSlots(roomBookings, workStart, workEnd, minMinutes) {
        // Сетка выбора времени сейчас 15 минут (с шагом по периодам в UI).
        // Интервалы занятости трактуются как half-open: [startMinutes, endMinutes).
        var gridStep = 15;
        var bookings = Array.isArray(roomBookings) ? roomBookings.slice() : [];
        bookings.sort(function (a, b) {
            return a.startMinutes - b.startMinutes;
        });

        var slots = [];
        for (var currentTime = workStart; currentTime + minMinutes <= workEnd; currentTime += gridStep) {
            var isBlocked = false;

            for (var i = 0; i < bookings.length; i++) {
                var booking = bookings[i];

                if (currentTime >= booking.startMinutes && currentTime < booking.endMinutes) {
                    isBlocked = true;
                    break;
                }

                // Нельзя начинать бронирование так, чтобы минимальная длительность пересекла
                // ближайшую бронь (даже если точка старта ещё не внутри занятости).
                if (currentTime < booking.startMinutes && currentTime + minMinutes > booking.startMinutes) {
                    isBlocked = true;
                    break;
                }
            }

            if (!isBlocked) {
                slots.push(currentTime);
            }
        }

        return slots;
    }

    /**
     * Вычисляет максимальное количество периодов для указанного времени начала
     * 
     * @param {number} startTimeMinutes - Время начала в минутах
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {number} Максимальное количество периодов (0 если слот занят)
     */
    function getMaxPeriodsForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes) {
        var bookings = Array.isArray(roomBookings) ? roomBookings : [];

        for (var i = 0; i < bookings.length; i++) {
            var booking = bookings[i];
            if (startTimeMinutes >= booking.startMinutes && startTimeMinutes < booking.endMinutes) {
                return 0;
            }
        }

        var minutesToWorkEnd = workEnd - startTimeMinutes;
        if (minutesToWorkEnd <= 0) return 0;

        var minutesToNextBooking = null;
        bookings.forEach(function (booking) {
            if (booking.startMinutes > startTimeMinutes) {
                var diff = booking.startMinutes - startTimeMinutes;
                if (minutesToNextBooking === null || diff < minutesToNextBooking) {
                    minutesToNextBooking = diff;
                }
            }
        });

        var availableMinutes = minutesToWorkEnd;
        if (minutesToNextBooking !== null) {
            availableMinutes = Math.min(availableMinutes, minutesToNextBooking);
        }

        return Math.floor(availableMinutes / minMinutes);
    }

    /**
     * Возвращает слоты времени начала, на которых возможно забронировать указанное количество периодов
     * 
     * @param {number} requiredPeriods - Требуемое количество периодов
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {Array<number>} Массив времён начала в минутах
     */
    function getStartTimeSlotsForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes) {
        var allSlots = getAvailableStartTimeSlots(roomBookings, workStart, workEnd, minMinutes);
        if (requiredPeriods <= 1) return allSlots;

        return allSlots.filter(function (slotMinutes) {
            var maxPeriods = getMaxPeriodsForStartTime(slotMinutes, roomBookings, workEnd, minMinutes);
            return maxPeriods >= requiredPeriods;
        });
    }

    /**
     * Возвращает все возможные времена окончания для указанного количества периодов
     * 
     * @param {number} requiredPeriods - Требуемое количество периодов
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {Array<number>} Отсортированный массив времён окончания в минутах
     */
    function getAllEndTimesForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes) {
        var slots = getStartTimeSlotsForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes);
        var endTimes = [];
        var duration = minMinutes * requiredPeriods;

        slots.forEach(function (startMinutes) {
            var endMinutes = startMinutes + duration;
            if (endTimes.indexOf(endMinutes) === -1) {
                endTimes.push(endMinutes);
            }
        });

        endTimes.sort(function (a, b) {
            return a - b;
        });
        return endTimes;
    }

    /**
     * Возвращает все возможные времена окончания для указанного времени начала
     * 
     * @param {number} startTimeMinutes - Время начала в минутах
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {Array<number>} Массив возможных времён окончания в минутах
     */
    function getEndTimesForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes) {
        var maxPeriods = getMaxPeriodsForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes);
        var endTimes = [];
        for (var p = 1; p <= maxPeriods; p++) {
            endTimes.push(startTimeMinutes + (minMinutes * p));
        }
        return endTimes;
    }

    /**
     * Возвращает все возможные времена начала для указанного времени окончания
     * 
     * @param {number} endTimeMinutes - Время окончания в минутах
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {Array<number>} Отсортированный массив времён начала в минутах
     */
    function getStartTimesForEndTime(endTimeMinutes, roomBookings, workStart, workEnd, minMinutes) {
        var allSlots = getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
        var startTimes = [];

        allSlots.forEach(function (slotMinutes) {
            if (slotMinutes < endTimeMinutes) {
                var maxPeriods = getMaxPeriodsForStartTime(slotMinutes, roomBookings, workEnd, minMinutes);
                var maxEndTime = slotMinutes + (minMinutes * maxPeriods);
                if (maxEndTime >= endTimeMinutes) {
                    startTimes.push(slotMinutes);
                }
            }
        });

        startTimes.sort(function (a, b) {
            return a - b;
        });
        return startTimes;
    }

    /**
     * Вычисляет глобальный максимум периодов для данного дня
     * Находит слот с максимально возможной длительностью
     * 
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {number} Максимальное количество периодов в любом доступном слоте
     */
    function getGlobalMaxPeriods(roomBookings, workStart, workEnd, minMinutes) {
        var allSlots = getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
        var maxPeriods = 0;
        allSlots.forEach(function (slotMinutes) {
            var mp = getMaxPeriodsForStartTime(slotMinutes, roomBookings, workEnd, minMinutes);
            if (mp > maxPeriods) maxPeriods = mp;
        });
        return maxPeriods;
    }

    /**
     * Вычисляет максимальное количество периодов для указанного времени окончания
     * 
     * @param {number} endTimeMinutes - Время окончания в минутах
     * @param {Array} roomBookings - Массив интервалов занятости
     * @param {number} workStart - Начало рабочего дня в минутах
     * @param {number} workEnd - Конец рабочего дня в минутах
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @returns {number} Максимальное количество периодов
     */
    function getMaxPeriodsForEndTime(endTimeMinutes, roomBookings, workStart, workEnd, minMinutes) {
        var startTimesForEnd = getStartTimesForEndTime(endTimeMinutes, roomBookings, workStart, workEnd, minMinutes);
        var maxPeriods = 0;
        for (var p = 1; p <= 20; p++) {
            var potentialStart = endTimeMinutes - (minMinutes * p);
            if (startTimesForEnd.indexOf(potentialStart) !== -1) {
                maxPeriods = p;
            }
        }
        return maxPeriods;
    }

    /* =========================================================================
     * СЕКЦИЯ 5: Управление UI-селектами времени
     * ========================================================================= */

    /**
     * Обновляет CSS-класс has-selection на селекте
     * Используется для показа/скрытия кнопки сброса
     * 
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта
     * @param {boolean} hasValue - Есть ли выбранное значение
     */
    function updateSelectHasSelection(selectEl, hasValue) {
        if (!selectEl) return;
        if (hasValue) {
            selectEl.classList.add('has-selection');
        } else {
            selectEl.classList.remove('has-selection');
        }
    }

    /**
     * Перестраивает селект выбора длительности (количества периодов)
     * Создаёт опции от 1 до maxPeriods периодов с человекочитаемыми метками
     * 
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта длительности
     * @param {number|null} selectedPeriods - Текущее выбранное количество периодов
     * @param {number} maxPeriods - Максимально доступное количество периодов
     * @param {number} minMinutes - Длительность одного периода в минутах
     * @param {Function} [onPeriodsSelected] - Колбэк при выборе периодов (periods: number)
     */
    function rebuildDurationSelect(selectEl, selectedPeriods, maxPeriods, minMinutes, onPeriodsSelected) {
        if (!selectEl) return;
        var durationSelectedSpan = selectEl.querySelector('.selected');
        var durationOptionsUl = selectEl.querySelector('ul.options');
        var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите период';

        if (durationOptionsUl) {
            durationOptionsUl.innerHTML = '';
        }

        if (maxPeriods <= 0) {
            // Если есть выбранная длительность - показываем её номинально
            if (selectedPeriods !== null && selectedPeriods >= 1) {
                var nominalTotal = minMinutes * selectedPeriods;
                var nominalHuman = formatDurationHuman(nominalTotal);
                var nominalLabel = selectedPeriods + ' ' + formatPeriodsLabel(selectedPeriods) + ' — ' + nominalHuman;
                if (durationSelectedSpan) {
                    durationSelectedSpan.textContent = nominalLabel;
                }
                updateSelectHasSelection(selectEl, true);
            } else {
                if (durationSelectedSpan) {
                    durationSelectedSpan.textContent = 'Нет доступных периодов';
                }
                updateSelectHasSelection(selectEl, false);
            }
            selectEl.classList.add('disabled');
            return;
        }

        selectEl.classList.remove('disabled');

        var isInRange = selectedPeriods !== null && selectedPeriods >= 1 && selectedPeriods <= maxPeriods;

        if (selectedPeriods === null) {
            if (durationSelectedSpan) {
                durationSelectedSpan.textContent = placeholder;
            }
        } else if (!isInRange) {
            var nominalTotal = minMinutes * selectedPeriods;
            var nominalHuman = formatDurationHuman(nominalTotal);
            var nominalLabel = selectedPeriods + ' ' + formatPeriodsLabel(selectedPeriods) + ' — ' + nominalHuman;
            if (durationSelectedSpan) {
                durationSelectedSpan.textContent = nominalLabel;
            }
        }

        for (var i = 1; i <= maxPeriods; i++) {
            var total = minMinutes * i;
            var human = formatDurationHuman(total);
            var value = formatDurationHHMM(total);
            var label = i + ' ' + formatPeriodsLabel(i) + ' — ' + human;

            var li = document.createElement('li');
            li.textContent = label;
            li.setAttribute('data-value', value);
            li.setAttribute('data-periods', i);

            if (i === selectedPeriods) {
                li.classList.add('selected');
                if (durationSelectedSpan) {
                    durationSelectedSpan.textContent = label;
                }
            }

            (function (liEl, liLabel, periods) {
                liEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (durationOptionsUl) {
                        durationOptionsUl.querySelectorAll('li').forEach(function (opt) {
                            opt.classList.remove('selected');
                        });
                    }
                    liEl.classList.add('selected');
                    if (durationSelectedSpan) {
                        durationSelectedSpan.textContent = liLabel;
                    }
                    selectEl.classList.remove('open');

                    updateSelectHasSelection(selectEl, true);
                    if (typeof onPeriodsSelected === 'function') {
                        onPeriodsSelected(periods);
                    }
                });
            })(li, label, i);

            if (durationOptionsUl) {
                durationOptionsUl.appendChild(li);
            }
        }

        updateSelectHasSelection(selectEl, selectedPeriods !== null);
    }

    /**
     * Перестраивает селект выбора времени начала
     * Создаёт опции для всех доступных временных слотов
     * 
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта времени начала
     * @param {Array<number>} slotsMinutes - Массив доступных времён начала в минутах
     * @param {number|null} selectedMinutes - Текущее выбранное время в минутах
     * @param {Function} [onTimeSelected] - Колбэк при выборе времени (minutes: number, timeStr: string)
     */
    function rebuildStartTimeSelect(selectEl, slotsMinutes, selectedMinutes, onTimeSelected) {
        if (!selectEl) return;

        var startSelectedSpan = selectEl.querySelector('.selected');
        var startOptionsUl = selectEl.querySelector('ul.options');

        if (startOptionsUl) {
            startOptionsUl.innerHTML = '';
        }

        var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите время';
        var hasValue = selectedMinutes !== null;

        if (slotsMinutes.length === 0) {
            if (startSelectedSpan) {
                startSelectedSpan.textContent = hasValue ? formatTimeHHMM(selectedMinutes) : placeholder;
            }
            selectEl.classList.remove('disabled');
            updateSelectHasSelection(selectEl, hasValue);
            return;
        }

        selectEl.classList.remove('disabled');

        if (startSelectedSpan) {
            startSelectedSpan.textContent = hasValue ? formatTimeHHMM(selectedMinutes) : placeholder;
        }

        slotsMinutes.forEach(function (slotMinutes) {
            var slotTimeStr = formatTimeHHMM(slotMinutes);
            var li = document.createElement('li');
            li.textContent = slotTimeStr;
            li.setAttribute('data-value', slotTimeStr);
            li.setAttribute('data-minutes', slotMinutes);

            if (slotMinutes === selectedMinutes) {
                li.classList.add('selected');
            }

            (function (liEl, liTimeStr, liMinutes) {
                liEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (startOptionsUl) {
                        startOptionsUl.querySelectorAll('li').forEach(function (opt) {
                            opt.classList.remove('selected');
                        });
                    }
                    liEl.classList.add('selected');
                    if (startSelectedSpan) {
                        startSelectedSpan.textContent = liTimeStr;
                    }
                    selectEl.classList.remove('open');
                    updateSelectHasSelection(selectEl, true);

                    if (typeof onTimeSelected === 'function') {
                        onTimeSelected(liMinutes, liTimeStr);
                    }
                });
            })(li, slotTimeStr, slotMinutes);

            if (startOptionsUl) {
                startOptionsUl.appendChild(li);
            }
        });

        updateSelectHasSelection(selectEl, hasValue);
    }

    /**
     * Перестраивает селект выбора времени окончания
     * Создаёт опции для всех доступных времён окончания
     * 
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта времени окончания
     * @param {Array<number>} endTimesMinutes - Массив доступных времён окончания в минутах
     * @param {number|null} selectedMinutes - Текущее выбранное время в минутах
     * @param {Function} [onTimeSelected] - Колбэк при выборе времени (minutes: number, timeStr: string)
     */
    function rebuildEndTimeSelect(selectEl, endTimesMinutes, selectedMinutes, onTimeSelected) {
        if (!selectEl) return;

        var endTimeSelectedSpan = selectEl.querySelector('.selected');
        var endTimeOptionsUl = selectEl.querySelector('ul.options');

        if (endTimeOptionsUl) {
            endTimeOptionsUl.innerHTML = '';
        }

        var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите время';
        var hasValue = selectedMinutes !== null;

        if (endTimesMinutes.length === 0) {
            if (endTimeSelectedSpan) {
                endTimeSelectedSpan.textContent = hasValue ? formatTimeHHMM(selectedMinutes) : placeholder;
            }
            selectEl.classList.remove('disabled');
            updateSelectHasSelection(selectEl, hasValue);
            return;
        }

        selectEl.classList.remove('disabled');

        if (endTimeSelectedSpan) {
            endTimeSelectedSpan.textContent = hasValue ? formatTimeHHMM(selectedMinutes) : placeholder;
        }

        updateSelectHasSelection(selectEl, hasValue);

        endTimesMinutes.forEach(function (endMinutes) {
            var endTimeStr = formatTimeHHMM(endMinutes);
            var li = document.createElement('li');
            li.textContent = endTimeStr;
            li.setAttribute('data-value', endTimeStr);
            li.setAttribute('data-minutes', endMinutes);

            if (endMinutes === selectedMinutes) {
                li.classList.add('selected');
            }

            (function (liEl, liTimeStr, liMinutes) {
                liEl.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (endTimeOptionsUl) {
                        endTimeOptionsUl.querySelectorAll('li').forEach(function (opt) {
                            opt.classList.remove('selected');
                        });
                    }
                    liEl.classList.add('selected');
                    if (endTimeSelectedSpan) {
                        endTimeSelectedSpan.textContent = liTimeStr;
                    }
                    selectEl.classList.remove('open');
                    updateSelectHasSelection(selectEl, true);

                    if (typeof onTimeSelected === 'function') {
                        onTimeSelected(liMinutes, liTimeStr);
                    }
                });
            })(li, endTimeStr, endMinutes);

            if (endTimeOptionsUl) {
                endTimeOptionsUl.appendChild(li);
            }
        });
    }

    /* =========================================================================
     * ЭКСПОРТ ПУБЛИЧНОГО API
     * ========================================================================= */

    /**
     * Публичный API модуля BookingTimeUtils
     * Все функции доступны через window.BookingTimeUtils
     */
    window.BookingTimeUtils = {
        parseDatetimeStr: parseDatetimeStr,
        formatTimeHHMM: formatTimeHHMM,
        parseTimeToMinutes: parseTimeToMinutes,
        formatDurationHuman: formatDurationHuman,
        formatDurationHHMM: formatDurationHHMM,
        formatPeriodsLabel: formatPeriodsLabel,
        getScenarioWorkTimeStartMinutes: getScenarioWorkTimeStartMinutes,
        getScenarioWorkTimeEndMinutes: getScenarioWorkTimeEndMinutes,
        getScenarioMinDurationMinutes: getScenarioMinDurationMinutes,
        getScenarioTariffUnitCost: getScenarioTariffUnitCost,
        normalizeRoomBookingsForDate: normalizeRoomBookingsForDate,
        loadRoomBookingsForDate: loadRoomBookingsForDate,
        clearRoomBookingsCache: clearRoomBookingsCache,
        getAvailableStartTimeSlots: getAvailableStartTimeSlots,
        getMaxPeriodsForStartTime: getMaxPeriodsForStartTime,
        getStartTimeSlotsForPeriods: getStartTimeSlotsForPeriods,
        getAllEndTimesForPeriods: getAllEndTimesForPeriods,
        getEndTimesForStartTime: getEndTimesForStartTime,
        getStartTimesForEndTime: getStartTimesForEndTime,
        getGlobalMaxPeriods: getGlobalMaxPeriods,
        getMaxPeriodsForEndTime: getMaxPeriodsForEndTime,
        updateSelectHasSelection: updateSelectHasSelection,
        rebuildDurationSelect: rebuildDurationSelect,
        rebuildStartTimeSelect: rebuildStartTimeSelect,
        rebuildEndTimeSelect: rebuildEndTimeSelect
    };
})();
