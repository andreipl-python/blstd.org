// Закрытие модального окна редактирования и открытие модального окна информации по кнопке "назад"
    function switchToInfoFromEditModal() {
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editBookingModal'));
        if (editModal) {
            editModal.hide();
        }
    }

    /**
     * Адаптация UI модалки редактирования под разные сценарии.
     * - "Репетиционная точка" и "Музыкальный класс": скрываем Направление и Преподаватель, показываем Тариф
     * - "Музыкальная школа": стандартный вид
     * @param {string} scenarioName - название сценария
     */
    function adaptEditModalForScenario(scenarioName) {
        console.log('[adaptEditModalForScenario] scenarioName:', scenarioName);
        var isRepPoint = (scenarioName === 'Репетиционная точка');
        var isMusicClass = (scenarioName === 'Музыкальный класс');
        var isMusicSchool = (scenarioName === 'Музыкальная школа');
        var isSimplifiedScenario = isRepPoint || isMusicClass;
        console.log('[adaptEditModalForScenario] isSimplifiedScenario:', isSimplifiedScenario);

        var directionContainer = document.getElementById('edit-direction-container');
        var roomContainer = document.getElementById('edit-room-container');
        var contactPersonContainer = document.getElementById('edit-contact-person-field-container');
        var peopleCountFieldContainer = document.getElementById('edit-people-count-field-container');
        var teacherContainer = document.getElementById('edit-teacher-container');
        var tariffContainer = document.getElementById('edit-tariff-container');
        var trialLessonRow = document.getElementById('edit-trial-lesson-row');
        console.log('[adaptEditModalForScenario] trialLessonRow:', trialLessonRow);

        // Скрыть/показать Направление
        if (directionContainer) {
            directionContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }

        if (roomContainer) {
            roomContainer.classList.remove('col-md-6', 'col-md-5');
            roomContainer.classList.add(isRepPoint ? 'col-md-5' : 'col-md-6');
        }

        if (contactPersonContainer) {
            contactPersonContainer.style.display = isRepPoint ? '' : 'none';
            contactPersonContainer.classList.remove('col-md-3', 'col-md-5');
            contactPersonContainer.classList.add(isRepPoint ? 'col-md-5' : 'col-md-3');
        }

        if (peopleCountFieldContainer) {
            peopleCountFieldContainer.style.display = isSimplifiedScenario ? '' : 'none';
            peopleCountFieldContainer.classList.remove('col-md-3', 'col-md-2');
            peopleCountFieldContainer.classList.add(isRepPoint ? 'col-md-2' : 'col-md-3');
        }

        // Скрыть/показать Преподаватель
        if (teacherContainer) {
            teacherContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }

        // Показать/скрыть Тариф (вместо Преподавателя)
        if (tariffContainer) {
            tariffContainer.classList.toggle('d-none', !isSimplifiedScenario);
        }

        // Задача 1: Показать/скрыть "Услуги преподавателей" (только для Музыкальной школы)
        var specialistServiceContainer = document.getElementById('edit-specialist-service-container');
        if (specialistServiceContainer) {
            specialistServiceContainer.style.display = isMusicSchool ? '' : 'none';
        }

        // Задача 3: Перемещение "Дополнительные услуги" для Музыкальной школы
        var servicesContainer = document.getElementById('edit-services-container');
        var additionalServicesRow = document.getElementById('edit-additional-services-row');
        var additionalServicesCol = document.getElementById('edit-additional-services-col');
        var teacherServicesRow = document.getElementById('edit-teacher-services-row');

        if (servicesContainer && additionalServicesRow && additionalServicesCol && teacherServicesRow) {
            if (isMusicSchool) {
                // Для Музыкальной школы: перемещаем "Дополнительные услуги" в отдельный ряд под "Услуги преподавателей"
                additionalServicesRow.style.display = '';
                // Убираем col-md-6 чтобы занять всю ширину родительского контейнера (который уже col-md-6)
                servicesContainer.classList.remove('col-md-6');
                additionalServicesCol.appendChild(servicesContainer);
            } else {
                // Для остальных сценариев: "Дополнительные услуги" остаётся в ряду с Преподавателем/Тарифом
                additionalServicesRow.style.display = 'none';
                // Возвращаем col-md-6 для корректной сетки в ряду
                servicesContainer.classList.add('col-md-6');
                teacherServicesRow.appendChild(servicesContainer);
            }
        }

        // Скрыть/показать чекбокс "Пробное занятие"
        if (trialLessonRow) {
            trialLessonRow.classList.toggle('d-none', isSimplifiedScenario);
            console.log('[adaptEditModalForScenario] trialLessonRow.classList:', trialLessonRow.classList.toString());
        }

        var peopleCountInput = document.getElementById('edit-people-count');
        if (peopleCountInput && !isSimplifiedScenario) {
            peopleCountInput.value = '';
        }
    }

    window.adaptEditModalForScenario = adaptEditModalForScenario;

    // Обработчики для editBookingModal: закрытие и инициализация custom-select
    const editModal = document.getElementById('editBookingModal');
    editModal.addEventListener('hidden.bs.modal', function () {
        var peopleCountInput = document.getElementById('edit-people-count');
        if (peopleCountInput) {
            peopleCountInput.value = '';
        }
        if (window._editModalShouldOpenInfo === false) {
            window._editModalShouldOpenInfo = true;
            return;
        }
        const infoModal = new bootstrap.Modal(document.getElementById('infoBookingModal'));
        infoModal.show();
    });

    editModal.addEventListener('shown.bs.modal', function () {
        if (!window._editModalSelectsInitialized) {
            window._editModalSelectsInitialized = true;
            initializeEditModalSelects();
        }
        loadAndPrefillEditBookingModal();
    });

    function getSelectedValue(selectEl) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.getSelectedValue === 'function') {
            return window.BookingModalUtils.getSelectedValue(selectEl);
        }
        if (!selectEl) return '';
        const selectedLi = selectEl.querySelector('ul.options li.selected');
        return selectedLi ? (selectedLi.getAttribute('data-value') || '') : '';
    }

    function setCustomSelectValue(selectEl, value, placeholderText) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.setCustomSelectValue === 'function') {
            window.BookingModalUtils.setCustomSelectValue(selectEl, value, placeholderText);
            return;
        }
        if (!selectEl) return;
        const selectedSpan = selectEl.querySelector('.selected');
        const options = Array.from(selectEl.querySelectorAll('ul.options li'));
        options.forEach(li => li.classList.toggle('selected', String(li.getAttribute('data-value')) === String(value)));
        const chosen = options.find(li => String(li.getAttribute('data-value')) === String(value));
        if (selectedSpan) {
            selectedSpan.textContent = chosen ? chosen.textContent : (placeholderText || selectedSpan.textContent);
        }
        // Добавляем класс has-selection для показа крестика сброса (только для clearable)
        if (selectEl.classList && selectEl.classList.contains('custom-select--clearable')) {
            if (chosen) {
                selectEl.classList.add('has-selection');
            } else {
                selectEl.classList.remove('has-selection');
            }
        }
    }

    function setMultiSelectedValues(selectEl, values) {
        if (window.BookingServicesUtils && typeof window.BookingServicesUtils.setMultiSelectedValues === 'function') {
            window.BookingServicesUtils.setMultiSelectedValues({
                selectEl: selectEl,
                values: values,
                placeholderText: 'Выберите услугу'
            });
            updateEditServicesBadges();
            return;
        }
        if (!selectEl) return;
        const selectedSpan = selectEl.querySelector('.selected');
        const options = Array.from(selectEl.querySelectorAll('ul.options li'));
        const valuesSet = new Set((values || []).map(String));
        selectEl._selectedOptions = new Set();

        options.forEach(li => {
            const isSelected = valuesSet.has(String(li.getAttribute('data-value')));
            li.classList.toggle('selected', isSelected);
            if (isSelected) {
                selectEl._selectedOptions.add(li);
            }
        });

        updateEditServicesBadges();
    }

    function updateEditServicesBadges() {
        if (window.BookingServicesUtils && typeof window.BookingServicesUtils.renderServicesBadges === 'function') {
            window.BookingServicesUtils.renderServicesBadges({
                containerId: 'edit-selected-services',
                selectId: 'edit-services',
                resetBtnId: 'reset-services',
                showResetWhenCountGreaterThan: 0,
                onSelectionChanged: function () {
                    calculateAndUpdateEditBookingCost();
                    var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                    if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                        ctrl.updateSubmitButtonState();
                    }
                }
            });
            return;
        }
        const container = document.getElementById('edit-selected-services');
        const servicesSelect = document.getElementById('edit-services');
        const resetBtn = document.getElementById('reset-services');
        if (!container || !servicesSelect) return;
        container.innerHTML = '';
        const selectedLis = Array.from(servicesSelect.querySelectorAll('ul.options li.selected'));
        servicesSelect._selectedOptions = new Set(selectedLis);

        // Показываем/скрываем кнопку "Сбросить всё" в зависимости от количества услуг
        if (resetBtn) {
            resetBtn.style.display = selectedLis.length > 0 ? 'inline' : 'none';
        }

        selectedLis.forEach(li => {
            const badge = document.createElement('span');
            badge.className = 'service-badge';
            // Используем data-name для получения только названия услуги (без стоимости)
            badge.textContent = li.getAttribute('data-name') || li.textContent.split('\n')[0].trim();

            // Крестик удаления услуги
            const removeBtn = document.createElement('span');
            removeBtn.className = 'service-badge-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.marginLeft = '6px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // Убираем услугу из выбранных
                li.classList.remove('selected');
                const remainingLis = Array.from(servicesSelect.querySelectorAll('ul.options li.selected'));
                servicesSelect._selectedOptions = new Set(remainingLis);
                updateEditServicesBadges();
                calculateAndUpdateEditBookingCost();
                // Обновляем текст в селекте
                const selected = servicesSelect.querySelector('span.selected');
                const count = remainingLis.length;
                if (selected) {
                    if (count === 0) {
                        selected.textContent = 'Выберите услугу';
                    } else if (count === 1) {
                        selected.textContent = remainingLis[0] ? remainingLis[0].textContent : 'Выберите услугу';
                    } else {
                        selected.textContent = count + ' выбрано';
                    }
                }
                var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                    ctrl.updateSubmitButtonState();
                }
            });
            badge.appendChild(removeBtn);
            container.appendChild(badge);
        });
    }

    function parseHmToMinutes(hm) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.parseHmToMinutes === 'function') {
            return window.BookingModalUtils.parseHmToMinutes(hm);
        }
        if (!hm) return null;
        const parts = String(hm).split(':');
        if (parts.length < 2) return null;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
    }

    function formatMinutesToHm(totalMinutes) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.formatMinutesToHm === 'function') {
            return window.BookingModalUtils.formatMinutesToHm(totalMinutes);
        }
        const m = parseInt(totalMinutes, 10);
        if (!Number.isFinite(m) || m < 0) return '';
        const h = Math.floor(m / 60) % 24;
        const mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    function getScenarioWorkStartMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 0;
        const s = window.SCENARIOS.find(x => String(x.pk) === String(scenarioId));
        if (!s || !s.fields || !s.fields.work_time_start) return 0;
        return parseHmToMinutes(String(s.fields.work_time_start).slice(0, 5)) || 0;
    }

    function getScenarioWorkEndMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 24 * 60;
        const s = window.SCENARIOS.find(x => String(x.pk) === String(scenarioId));
        if (!s || !s.fields || !s.fields.work_time_end) return 24 * 60;
        return parseHmToMinutes(String(s.fields.work_time_end).slice(0, 5)) || (24 * 60);
    }

    function getScenarioMinDurationMinutes(scenarioId) {
        const fallback = 60;
        if (!scenarioId || !Array.isArray(window.TARIFF_UNITS)) return fallback;
        const tu = window.TARIFF_UNITS.find(t => t.fields && String(t.fields.scenario) === String(scenarioId));
        if (!tu || !tu.fields || !tu.fields.min_reservation_time) return fallback;
        const parts = String(tu.fields.min_reservation_time).split(':');
        if (parts.length < 2) return fallback;
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;
        const total = h * 60 + m;
        return total > 0 ? total : fallback;
    }

    function getScenarioTariffUnitCost(scenarioId) {
        if (!scenarioId || !Array.isArray(window.TARIFF_UNITS)) return 0;
        const tu = window.TARIFF_UNITS.find(t => t.fields && String(t.fields.scenario) === String(scenarioId));
        if (!tu || !tu.fields || tu.fields.tariff_unit_cost === undefined || tu.fields.tariff_unit_cost === null) return 0;
        const v = parseFloat(String(tu.fields.tariff_unit_cost));
        return Number.isFinite(v) ? v : 0;
    }

    // Получить суммарную стоимость выбранных услуг
    function getEditSelectedServicesCost() {
        if (window.BookingServicesUtils && typeof window.BookingServicesUtils.getSelectedServicesCost === 'function') {
            return window.BookingServicesUtils.getSelectedServicesCost(document.getElementById('edit-services'));
        }
        var servicesSelect = document.getElementById('edit-services');
        if (!servicesSelect) return 0;
        var total = 0;
        var selectedLis = Array.from(servicesSelect.querySelectorAll('ul.options li.selected'));
        selectedLis.forEach(function(li) {
            var cost = parseFloat(li.getAttribute('data-cost') || '0');
            if (Number.isFinite(cost)) total += cost;
        });
        return total;
    }

    // Рассчитать и обновить стоимость брони
    function calculateAndUpdateEditBookingCost() {
        if (window.BookingServicesUtils && typeof window.BookingServicesUtils.calculateAndUpdateTotalCost === 'function') {
            var modalEl0 = document.getElementById('editBookingModal');
            var scenarioId0 = modalEl0 ? modalEl0.getAttribute('data-scenario-id') : null;
            var ctrl0 = modalEl0 ? modalEl0._editTimeController : null;
            var currentSelectedPeriods0 = ctrl0 ? ctrl0._currentSelectedPeriods : null;
            window.BookingServicesUtils.calculateAndUpdateTotalCost({
                costElementId: 'editBookingCostValue',
                servicesSelectId: 'edit-services',
                selectedPeriods: currentSelectedPeriods0,
                periodCost: getScenarioTariffUnitCost(scenarioId0)
            });
            return;
        }
        var costElement = document.getElementById('editBookingCostValue');
        if (!costElement) return;

        var modalEl = document.getElementById('editBookingModal');
        var scenarioId = modalEl ? modalEl.getAttribute('data-scenario-id') : null;
        var ctrl = modalEl ? modalEl._editTimeController : null;
        var currentSelectedPeriods = ctrl ? ctrl._currentSelectedPeriods : null;

        // Базовая стоимость периодов (0 если периоды не выбраны)
        var periodCost = getScenarioTariffUnitCost(scenarioId);
        var periodsTotalCost = (currentSelectedPeriods !== null && currentSelectedPeriods !== undefined)
            ? currentSelectedPeriods * periodCost
            : 0;

        // Стоимость услуг всегда учитывается
        var servicesCost = getEditSelectedServicesCost();
        var totalCost = periodsTotalCost + servicesCost;

        // Форматируем с 2 знаками после запятой, убираем лишние нули
        var formatted = totalCost.toFixed(2).replace(/\.00$/, '');
        costElement.textContent = formatted + ' BYN';
    }

    function buildTimeSlots(scenarioId) {
        const start = getScenarioWorkStartMinutes(scenarioId);
        const end = getScenarioWorkEndMinutes(scenarioId);
        const result = [];
        for (let t = start; t <= end; t += 15) {
            result.push(formatMinutesToHm(t));
        }
        return result;
    }

    // Форматирование номера телефона с разделителями (+375 44 444 44 44)
    function formatPhoneNumber(phone) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.formatPhoneNumber === 'function') {
            return window.BookingModalUtils.formatPhoneNumber(phone);
        }
        if (!phone) return '';
        // Убираем всё кроме цифр и +
        var cleaned = phone.replace(/[^\d+]/g, '');
        // Формат для белорусских номеров: +375 XX XXX XX XX
        if (cleaned.startsWith('+375') && cleaned.length === 13) {
            return cleaned.slice(0, 4) + ' ' + cleaned.slice(4, 6) + ' ' + cleaned.slice(6, 9) + ' ' + cleaned.slice(9, 11) + ' ' + cleaned.slice(11);
        }
        // Формат для номеров без +: 375 XX XXX XX XX
        if (cleaned.startsWith('375') && cleaned.length === 12) {
            return '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 5) + ' ' + cleaned.slice(5, 8) + ' ' + cleaned.slice(8, 10) + ' ' + cleaned.slice(10);
        }
        // Для других форматов возвращаем как есть
        return phone;
    }

    function rebuildTimeSelect(selectEl, timesHm, placeholderText) {
        if (!selectEl) return;
        const ul = selectEl.querySelector('ul.options');
        const selectedSpan = selectEl.querySelector('.selected');
        if (!ul || !selectedSpan) return;
        ul.innerHTML = '';
        selectedSpan.textContent = placeholderText;
        timesHm.forEach(hm => {
            const li = document.createElement('li');
            li.textContent = hm;
            li.setAttribute('data-value', hm);
            ul.appendChild(li);
        });
    }

    function ensureEditTimeController() {
        const modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return null;
        if (modalEl._editTimeController) return modalEl._editTimeController;
        if (!window.BookingTimeUtils) return null;

        const utils = window.BookingTimeUtils;

        const startTimeSelect = document.getElementById('edit-start-time');
        const endTimeSelect = document.getElementById('edit-end-time');
        const durationSelect = document.getElementById('edit-duration');
        const startWarn = document.getElementById('edit-start-time-warning-icon');
        const endWarn = document.getElementById('edit-end-time-warning-icon');
        const submitBtn = document.getElementById('editBookingSubmitBtn');
        const dateInput = document.getElementById('edit-date');

        let scenarioId = null;
        let roomId = null;
        let dateIso = null;
        let bookingId = null;

        let minMinutes = 60;
        let workStart = 0;
        let workEnd = 24 * 60;

        let roomBookings = [];
        let currentStartTimeMinutes = null;
        let currentEndTimeMinutes = null;
        let currentSelectedPeriods = null;

        let tariffBaseDurationMinutes = null;
        let tariffWeeklyIntervals = [];
        let tariffTimeFrozen = false;

        function getCurrentScenarioName() {
            var currentScenarioId = scenarioId || (modalEl ? modalEl.getAttribute('data-scenario-id') : null);
            var scenarioName = '';
            if (currentScenarioId && Array.isArray(window.SCENARIOS)) {
                var scenario = window.SCENARIOS.find(function(s) { return String(s.pk) === String(currentScenarioId); });
                scenarioName = scenario && scenario.fields ? scenario.fields.name : '';
            }
            return scenarioName;
        }

        function getSelectedSpecialistServiceDurationMinutes() {
            var specialistServiceSelect = document.getElementById('edit-specialist-service');
            if (!specialistServiceSelect) return null;
            var selectedLi = specialistServiceSelect.querySelector('ul.options li.selected');
            if (!selectedLi) return null;
            var raw = selectedLi.getAttribute('data-duration-minutes') || '0';
            var n = parseInt(raw, 10);
            return Number.isFinite(n) && n > 0 ? n : null;
        }

        function isTariffScenarioName(scenarioName) {
            return scenarioName === 'Репетиционная точка' || scenarioName === 'Музыкальный класс';
        }

        function getSelectedTariffDomDataOrNull() {
            var tariffSelect = document.getElementById('edit-tariff');
            if (!tariffSelect) return null;

            var optionsCount = tariffSelect.querySelectorAll('ul.options li').length;
            var selectedLi = tariffSelect.querySelector('ul.options li.selected');

            if (!selectedLi) {
                if (tariffSelect.classList.contains('disabled') || optionsCount > 0) {
                    return { cleared: true };
                }
                return null;
            }

            var durRaw = selectedLi.getAttribute('data-base-duration-minutes') || '0';
            var dur = parseInt(String(durRaw), 10);
            var dayIntervalsRaw = selectedLi.getAttribute('data-day-intervals') || '[]';
            var dayIntervals = [];
            try {
                dayIntervals = JSON.parse(dayIntervalsRaw);
            } catch (e) {
                dayIntervals = [];
            }

            return {
                baseDurationMinutes: Number.isFinite(dur) && dur > 0 ? dur : null,
                dayIntervals: Array.isArray(dayIntervals) ? dayIntervals : []
            };
        }

        function getWeekdayFromIso(dateIsoStr) {
            if (!dateIsoStr) return null;
            var dt = new Date(String(dateIsoStr) + 'T00:00:00');
            if (!Number.isFinite(dt.getTime())) return null;
            var jsDay = dt.getDay();
            return (jsDay + 6) % 7;
        }

        function getTariffDayIntervalsMinutesOrNull() {
            var scenarioName = getCurrentScenarioName();
            if (!isTariffScenarioName(scenarioName)) return null;
            if (!Array.isArray(tariffWeeklyIntervals) || tariffWeeklyIntervals.length === 0) return null;
            var hasWeekday = tariffWeeklyIntervals.some(function (it) {
                return it && it.weekday !== undefined && it.weekday !== null && String(it.weekday).trim() !== '';
            });

            var wd = null;
            if (hasWeekday) {
                wd = getWeekdayFromIso(dateIso);
                if (wd === null) return null;
            }

            var intervals = [];
            tariffWeeklyIntervals.forEach(function (it) {
                if (!it) return;
                if (hasWeekday) {
                    var itW = parseInt(it.weekday, 10);
                    if (!Number.isFinite(itW) || itW !== wd) return;
                }
                var s = utils.parseTimeToMinutes ? utils.parseTimeToMinutes(it.start_time) : null;
                var e = utils.parseTimeToMinutes ? utils.parseTimeToMinutes(it.end_time) : null;
                if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
                    intervals.push({ startMinutes: s, endMinutes: e });
                }
            });
            return intervals.length ? intervals : null;
        }

        function filterStartSlotsByTariffDayIntervals(slotsMinutes, requiredPeriods) {
            var slots = Array.isArray(slotsMinutes) ? slotsMinutes : [];
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return slots;
            var req = (Number.isFinite(requiredPeriods) ? requiredPeriods : 1) * minMinutes;
            if (!Number.isFinite(req) || req <= 0) return [];
            return slots.filter(function (s) {
                for (var i = 0; i < intervals.length; i++) {
                    var it = intervals[i];
                    if (s >= it.startMinutes && (s + req) <= it.endMinutes) {
                        return true;
                    }
                }
                return false;
            });
        }

        function filterEndTimesByTariffForStart(endTimesMinutes, startTimeMinutes) {
            var endTimes = Array.isArray(endTimesMinutes) ? endTimesMinutes : [];
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return endTimes;

            var matched = null;
            for (var i = 0; i < intervals.length; i++) {
                var it = intervals[i];
                if (startTimeMinutes >= it.startMinutes && startTimeMinutes < it.endMinutes) {
                    matched = it;
                    break;
                }
            }
            if (!matched) return [];

            return endTimes.filter(function (e) {
                return e > startTimeMinutes && e <= matched.endMinutes;
            });
        }

        function filterEndTimesByTariffForPeriods(endTimesMinutes, requiredPeriods) {
            var endTimes = Array.isArray(endTimesMinutes) ? endTimesMinutes : [];
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return endTimes;
            var req = (Number.isFinite(requiredPeriods) ? requiredPeriods : 1) * minMinutes;
            if (!Number.isFinite(req) || req <= 0) return [];
            return endTimes.filter(function (e) {
                for (var i = 0; i < intervals.length; i++) {
                    var it = intervals[i];
                    if (e >= (it.startMinutes + req) && e <= it.endMinutes) {
                        return true;
                    }
                }
                return false;
            });
        }

        function filterStartTimesByTariffForEnd(startTimesMinutes, endTimeMinutes) {
            var startTimes = Array.isArray(startTimesMinutes) ? startTimesMinutes : [];
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return startTimes;

            var matched = null;
            for (var i = 0; i < intervals.length; i++) {
                var it = intervals[i];
                if (endTimeMinutes > it.startMinutes && endTimeMinutes <= it.endMinutes) {
                    matched = it;
                    break;
                }
            }
            if (!matched) return [];

            return startTimes.filter(function (s) {
                return s >= matched.startMinutes && s < endTimeMinutes;
            });
        }

        function limitMaxPeriodsByTariffForStart(startTimeMinutes, baseMaxPeriods) {
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return baseMaxPeriods;
            if (!Number.isFinite(minMinutes) || minMinutes <= 0) return 0;

            for (var i = 0; i < intervals.length; i++) {
                var it = intervals[i];
                if (startTimeMinutes >= it.startMinutes && startTimeMinutes < it.endMinutes) {
                    var maxByTariff = Math.floor((it.endMinutes - startTimeMinutes) / minMinutes);
                    if (!Number.isFinite(maxByTariff) || maxByTariff < 0) maxByTariff = 0;
                    return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
                }
            }
            return 0;
        }

        function limitMaxPeriodsByTariffForEnd(endTimeMinutes, baseMaxPeriods) {
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return baseMaxPeriods;
            if (!Number.isFinite(minMinutes) || minMinutes <= 0) return 0;

            for (var i = 0; i < intervals.length; i++) {
                var it = intervals[i];
                if (endTimeMinutes > it.startMinutes && endTimeMinutes <= it.endMinutes) {
                    var maxByTariff = Math.floor((endTimeMinutes - it.startMinutes) / minMinutes);
                    if (!Number.isFinite(maxByTariff) || maxByTariff < 0) maxByTariff = 0;
                    return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
                }
            }
            return 0;
        }

        function limitGlobalMaxPeriodsByTariff(baseMaxPeriods) {
            var intervals = getTariffDayIntervalsMinutesOrNull();
            if (!intervals) return baseMaxPeriods;
            if (!Number.isFinite(minMinutes) || minMinutes <= 0) return 0;

            var maxByTariff = 0;
            for (var i = 0; i < intervals.length; i++) {
                var it = intervals[i];
                var mp = Math.floor((it.endMinutes - it.startMinutes) / minMinutes);
                if (Number.isFinite(mp) && mp > maxByTariff) {
                    maxByTariff = mp;
                }
            }
            return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
        }

        function setCustomSelectDisabled(selectEl, disabled) {
            if (!selectEl) return;
            if (disabled) {
                selectEl.classList.add('disabled');
                selectEl.classList.remove('open');
                selectEl.classList.remove('has-selection');
                selectEl.querySelectorAll('ul.options li.selected').forEach(function(li) {
                    li.classList.remove('selected');
                });
            } else {
                selectEl.classList.remove('disabled');
            }
        }

        function setCustomSelectFrozenDisabled(selectEl, disabled) {
            if (!selectEl) return;
            if (disabled) {
                selectEl.classList.add('disabled');
                selectEl.classList.remove('open');
            } else {
                selectEl.classList.remove('disabled');
            }
        }

        function syncEditBookingMusicSchoolTimeFields(resetSelectionOnChange) {
            var scenarioName = getCurrentScenarioName();
            var isMusicSchool = scenarioName === 'Музыкальная школа';

            if (!isMusicSchool) {
                setCustomSelectDisabled(durationSelect, false);
                setCustomSelectDisabled(endTimeSelect, false);
                return;
            }

            var baseScenarioId = scenarioId || (modalEl ? modalEl.getAttribute('data-scenario-id') : null);
            var baseMinMinutes = utils.getScenarioMinDurationMinutes(baseScenarioId);
            var serviceMinMinutes = getSelectedSpecialistServiceDurationMinutes();

            if (!serviceMinMinutes) {
                minMinutes = baseMinMinutes;
                currentSelectedPeriods = null;
                currentEndTimeMinutes = null;

                setCustomSelectDisabled(durationSelect, true);
                setCustomSelectDisabled(endTimeSelect, true);

                if (durationSelect) {
                    var durationSpan = durationSelect.querySelector('.selected');
                    if (durationSpan) durationSpan.textContent = durationSelect.getAttribute('data-placeholder') || 'Выберите длительность';
                }
                if (endTimeSelect) {
                    var endSpan = endTimeSelect.querySelector('.selected');
                    if (endSpan) endSpan.textContent = endTimeSelect.getAttribute('data-placeholder') || 'Выберите время окончания';
                }
                return;
            }

            var prevMinMinutes = minMinutes;
            minMinutes = serviceMinMinutes;

            setCustomSelectDisabled(durationSelect, false);
            setCustomSelectDisabled(endTimeSelect, false);

            if (resetSelectionOnChange !== false && prevMinMinutes !== minMinutes) {
                currentSelectedPeriods = null;
                currentEndTimeMinutes = null;
            }
        }

        function syncEditBookingTariffTimeFields(resetSelectionOnChange) {
            var scenarioName = getCurrentScenarioName();
            if (!isTariffScenarioName(scenarioName)) {
                return;
            }

            var domTariff = getSelectedTariffDomDataOrNull();
            if (domTariff) {
                if (domTariff.cleared) {
                    tariffBaseDurationMinutes = null;
                    tariffWeeklyIntervals = [];
                } else {
                    tariffBaseDurationMinutes = domTariff.baseDurationMinutes;
                    tariffWeeklyIntervals = domTariff.dayIntervals;
                }
            }

            var baseScenarioId = scenarioId || (modalEl ? modalEl.getAttribute('data-scenario-id') : null);
            var baseMinMinutes = utils.getScenarioMinDurationMinutes(baseScenarioId);
            var tariffMin = tariffBaseDurationMinutes;
            var hasTariffMin = !!(tariffMin && Number.isFinite(tariffMin) && tariffMin > 0);

            if (!hasTariffMin) {
                tariffTimeFrozen = true;
                minMinutes = baseMinMinutes;
                setCustomSelectFrozenDisabled(durationSelect, true);
                setCustomSelectFrozenDisabled(endTimeSelect, true);
                return;
            }

            tariffTimeFrozen = false;
            setCustomSelectFrozenDisabled(durationSelect, false);
            setCustomSelectFrozenDisabled(endTimeSelect, false);

            var prevMinMinutes = minMinutes;
            minMinutes = hasTariffMin ? tariffMin : baseMinMinutes;

            if (resetSelectionOnChange !== false && prevMinMinutes !== minMinutes) {
                currentSelectedPeriods = null;
                currentEndTimeMinutes = null;
            }
        }

        function hideWarnings() {
            if (startWarn) startWarn.style.display = 'none';
            if (endWarn) endWarn.style.display = 'none';
        }

        function updateSubmitButtonState() {
            if (!submitBtn) return;

            var checklist = [];
            var hasStartTime = currentStartTimeMinutes !== null;
            var hasEndTime = currentEndTimeMinutes !== null;

            // Определяем сценарий для условной валидации
            var modalEl = document.getElementById('editBookingModal');
            var currentScenarioId = modalEl ? modalEl.getAttribute('data-scenario-id') : null;
            var scenarioName = '';
            if (currentScenarioId && Array.isArray(window.SCENARIOS)) {
                var scenario = window.SCENARIOS.find(function(s) { return String(s.pk) === String(currentScenarioId); });
                scenarioName = scenario && scenario.fields ? scenario.fields.name : '';
            }
            var isSimplifiedScenario = (scenarioName === 'Репетиционная точка' || scenarioName === 'Музыкальный класс');
            console.log('[updateSubmitButtonState] scenarioId:', currentScenarioId, 'scenarioName:', JSON.stringify(scenarioName), 'isSimplifiedScenario:', isSimplifiedScenario);

            // Проверяем наличие предупреждений
            var teacherWarning = document.getElementById('edit-teacher-warning-icon');
            var hasStartWarning = startWarn && startWarn.style.display !== 'none';
            var hasEndWarning = endWarn && endWarn.style.display !== 'none';
            var hasTeacherWarning = teacherWarning && teacherWarning.style.display !== 'none';

            if (startTimeSelect) {
                startTimeSelect.classList.toggle('has-warning', !!hasStartWarning);
            }
            if (endTimeSelect) {
                endTimeSelect.classList.toggle('has-warning', !!hasEndWarning);
            }
            var teacherSelectForWarning = document.getElementById('edit-teacher');
            if (teacherSelectForWarning) {
                teacherSelectForWarning.classList.toggle('has-warning', !isSimplifiedScenario && !!hasTeacherWarning);
            }

            // Проверяем преподавателя и направление (только для Музыкальной школы)
            var teacherSelect = document.getElementById('edit-teacher');
            var directionSelect = document.getElementById('edit-direction');
            var teacherSelectedLi = teacherSelect ? teacherSelect.querySelector('ul.options li.selected') : null;
            var directionSelectedLi = directionSelect ? directionSelect.querySelector('ul.options li.selected') : null;

            var hasTeacher = teacherSelectedLi !== null;
            var hasDirection = directionSelectedLi !== null;

            // Формируем чек-лист
            if (!hasStartTime) {
                checklist.push('Выберите время начала');
            } else if (hasStartWarning) {
                checklist.push('Выберите доступное время начала');
            }

            if (!hasEndTime) {
                checklist.push('Выберите время окончания');
            } else if (hasEndWarning) {
                checklist.push('Выберите доступное время окончания');
            }

            if (currentSelectedPeriods === null) {
                checklist.push('Выберите длительность');
            }

            // Преподаватель и направление обязательны только для Музыкальной школы
            if (!isSimplifiedScenario) {
                if (!hasTeacher) {
                    checklist.push('Выберите преподавателя');
                } else if (hasTeacherWarning) {
                    checklist.push('Выберите доступного преподавателя');
                }

                if (!hasDirection) {
                    checklist.push('Выберите направление');
                }

                var specialistServiceSelect = document.getElementById('edit-specialist-service');
                var specialistServiceSelectedLi = specialistServiceSelect ? specialistServiceSelect.querySelector('ul.options li.selected') : null;
                var hasSpecialistService = specialistServiceSelectedLi !== null;
                if (!hasSpecialistService) {
                    checklist.push('Выберите услугу преподавателя');
                }
            }

            if (isSimplifiedScenario) {
                var peopleCountInput = document.getElementById('edit-people-count');
                var peopleCountVal = peopleCountInput ? String(peopleCountInput.value || '').trim() : '';
                var pcInt = null;
                if (!peopleCountVal) {
                    checklist.push('Укажите количество людей');
                } else {
                    pcInt = parseInt(peopleCountVal, 10);
                    if (!Number.isFinite(pcInt) || pcInt < 1 || pcInt > 99) {
                        checklist.push('Количество людей должно быть от 1 до 99');
                    }
                }

                var tariffSelect = document.getElementById('edit-tariff');
                var tariffSelectedLi = tariffSelect ? tariffSelect.querySelector('ul.options li.selected') : null;
                if (!tariffSelect || tariffSelect.classList.contains('disabled')) {
                    var ts = tariffSelect ? tariffSelect.querySelector('span.selected') : null;
                    var msg = ts ? String(ts.textContent || '').trim() : '';
                    var text = msg || 'Выберите тариф';
                    if (text && checklist.indexOf(text) === -1) {
                        checklist.push(text);
                    }
                } else if (!tariffSelectedLi) {
                    checklist.push('Выберите тариф');
                } else {
                    var maxPeopleRaw = tariffSelectedLi.getAttribute('data-max-people') || '0';
                    var maxPeople = parseInt(String(maxPeopleRaw), 10);
                    if (Number.isFinite(pcInt) && pcInt > 0 && Number.isFinite(maxPeople) && maxPeople > 0 && pcInt > maxPeople) {
                        checklist.push('Количество людей превышает максимум для выбранного тарифа');
                    }
                }
            }

            var hasChanges = typeof window.hasEditChanges === 'function' ? window.hasEditChanges() : true;
            if (!hasChanges) {
                submitBtn.disabled = true;
                var submitWarning = document.getElementById('edit-submit-warning-icon');
                var submitChecklist = document.getElementById('edit-submit-checklist');
                if (submitWarning) submitWarning.style.display = 'none';
                if (submitChecklist) submitChecklist.innerHTML = '';
                return;
            }

            // Обновляем чек-лист в тултипе
            var submitWarning = document.getElementById('edit-submit-warning-icon');
            var submitChecklist = document.getElementById('edit-submit-checklist');

            if (checklist.length > 0) {
                // Кнопка неактивна
                submitBtn.disabled = true;
                if (submitWarning) submitWarning.style.display = 'inline-block';
                if (submitChecklist) {
                    submitChecklist.innerHTML = checklist.map(function(item) {
                        return '<li>' + item + '</li>';
                    }).join('');
                }
            } else {
                // Все условия выполнены
                submitBtn.disabled = false;
                if (submitWarning) submitWarning.style.display = 'none';
            }
        }

        function validateWarnings() {
            if (!utils) return;
            hideWarnings();
            let startValid = true;
            let endValid = true;

            if (currentStartTimeMinutes !== null) {
                const baseMp = utils.getMaxPeriodsForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes);
                const mp = limitMaxPeriodsByTariffForStart(currentStartTimeMinutes, baseMp);
                if (mp < 1) {
                    startValid = false;
                    if (startWarn) startWarn.style.display = 'inline-block';
                }
            }

            if (currentEndTimeMinutes !== null) {
                if (!startValid) {
                    endValid = false;
                    if (endWarn) endWarn.style.display = 'inline-block';
                } else if (currentStartTimeMinutes !== null) {
                    const baseMpStart = utils.getMaxPeriodsForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes);
                    const mpStart = limitMaxPeriodsByTariffForStart(currentStartTimeMinutes, baseMpStart);
                    const maxEndTime = currentStartTimeMinutes + (minMinutes * mpStart);
                    if (currentEndTimeMinutes > maxEndTime) {
                        endValid = false;
                        if (endWarn) endWarn.style.display = 'inline-block';
                    }
                } else {
                    const possibleStartsBase = utils.getStartTimesForEndTime(currentEndTimeMinutes, roomBookings, workStart, workEnd, minMinutes);
                    const possibleStarts = filterStartTimesByTariffForEnd(possibleStartsBase, currentEndTimeMinutes);
                    if (!possibleStarts || possibleStarts.length === 0) {
                        endValid = false;
                        if (endWarn) endWarn.style.display = 'inline-block';
                    }
                }
            }

            if (startValid && endValid && currentSelectedPeriods !== null && currentStartTimeMinutes !== null) {
                const baseMpStart = utils.getMaxPeriodsForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes);
                const mpStart = limitMaxPeriodsByTariffForStart(currentStartTimeMinutes, baseMpStart);
                if (currentSelectedPeriods > mpStart) {
                    if (endWarn) endWarn.style.display = 'inline-block';
                }
            }
        }

        function rebuildAll() {
            if (!utils || !durationSelect || !startTimeSelect || !endTimeSelect) return;

            syncEditBookingMusicSchoolTimeFields();
            syncEditBookingTariffTimeFields();

            var scenarioName = getCurrentScenarioName();
            var isMusicSchool = scenarioName === 'Музыкальная школа';
            var serviceMinMinutes = isMusicSchool ? getSelectedSpecialistServiceDurationMinutes() : null;
            var isMusicSchoolNoService = isMusicSchool && !serviceMinMinutes;

            if (isMusicSchoolNoService) {
                const filteredStartSlots = utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
                utils.rebuildStartTimeSelect(startTimeSelect, filteredStartSlots, currentStartTimeMinutes, function (minutes) {
                    hideWarnings();
                    currentStartTimeMinutes = minutes;
                    currentSelectedPeriods = null;
                    currentEndTimeMinutes = null;
                    rebuildAll();
                    calculateAndUpdateEditBookingCost();
                    if (typeof applyEditTeacherDirectionFilters === 'function') {
                        applyEditTeacherDirectionFilters();
                    }
                });

                validateWarnings();
                updateSubmitButtonState();
                return;
            }

            if (tariffTimeFrozen) {
                setCustomSelectFrozenDisabled(durationSelect, true);
                setCustomSelectFrozenDisabled(endTimeSelect, true);

                const startSlotsFrozen = filterStartSlotsByTariffDayIntervals(
                    utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes),
                    1
                );

                utils.rebuildStartTimeSelect(startTimeSelect, startSlotsFrozen, currentStartTimeMinutes, function (minutes) {
                    hideWarnings();
                    currentStartTimeMinutes = minutes;
                    rebuildAll();
                    calculateAndUpdateEditBookingCost();
                    if (typeof window.syncEditBookingTariffs === 'function') {
                        window.syncEditBookingTariffs();
                    }
                });

                validateWarnings();
                updateSubmitButtonState();
                return;
            }

            const maxPeriods = (currentStartTimeMinutes !== null)
                ? limitMaxPeriodsByTariffForStart(
                    currentStartTimeMinutes,
                    utils.getMaxPeriodsForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes)
                )
                : (currentEndTimeMinutes !== null)
                    ? limitMaxPeriodsByTariffForEnd(
                        currentEndTimeMinutes,
                        utils.getMaxPeriodsForEndTime(currentEndTimeMinutes, roomBookings, workStart, workEnd, minMinutes)
                    )
                    : limitGlobalMaxPeriodsByTariff(
                        utils.getGlobalMaxPeriods(roomBookings, workStart, workEnd, minMinutes)
                    );

            utils.rebuildDurationSelect(durationSelect, currentSelectedPeriods, maxPeriods, minMinutes, function (periods) {
                currentSelectedPeriods = periods;
                hideWarnings();

                const durationMinutes = minMinutes * currentSelectedPeriods;
                if (currentStartTimeMinutes !== null) {
                    const mpStart = utils.getMaxPeriodsForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes);
                    if (currentSelectedPeriods <= mpStart) {
                        currentEndTimeMinutes = currentStartTimeMinutes + durationMinutes;
                    } else {
                        currentStartTimeMinutes = null;
                        currentEndTimeMinutes = null;
                    }
                } else if (currentEndTimeMinutes !== null) {
                    const potentialStart = currentEndTimeMinutes - durationMinutes;
                    const filteredStart = utils.getStartTimeSlotsForPeriods(currentSelectedPeriods, roomBookings, workStart, workEnd, minMinutes);
                    if (filteredStart.indexOf(potentialStart) !== -1) {
                        currentStartTimeMinutes = potentialStart;
                    } else {
                        currentEndTimeMinutes = null;
                    }
                }

                rebuildAll();
                calculateAndUpdateEditBookingCost();
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
            });

            const filteredStartSlots = (currentSelectedPeriods !== null)
                ? filterStartSlotsByTariffDayIntervals(
                    utils.getStartTimeSlotsForPeriods(currentSelectedPeriods, roomBookings, workStart, workEnd, minMinutes),
                    currentSelectedPeriods
                )
                : (currentEndTimeMinutes !== null)
                    ? filterStartTimesByTariffForEnd(
                        utils.getStartTimesForEndTime(currentEndTimeMinutes, roomBookings, workStart, workEnd, minMinutes),
                        currentEndTimeMinutes
                    )
                    : filterStartSlotsByTariffDayIntervals(
                        utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes),
                        1
                    );

            const filteredEndTimes = (currentSelectedPeriods !== null)
                ? filterEndTimesByTariffForPeriods(
                    utils.getAllEndTimesForPeriods(currentSelectedPeriods, roomBookings, workStart, workEnd, minMinutes),
                    currentSelectedPeriods
                )
                : (currentStartTimeMinutes !== null)
                    ? filterEndTimesByTariffForStart(
                        utils.getEndTimesForStartTime(currentStartTimeMinutes, roomBookings, workEnd, minMinutes),
                        currentStartTimeMinutes
                    )
                    : filterEndTimesByTariffForPeriods(
                        utils.getAllEndTimesForPeriods(1, roomBookings, workStart, workEnd, minMinutes),
                        1
                    );

            if (currentEndTimeMinutes !== null && filteredEndTimes.indexOf(currentEndTimeMinutes) === -1) {
                currentEndTimeMinutes = null;
            }

            utils.rebuildStartTimeSelect(startTimeSelect, filteredStartSlots, currentStartTimeMinutes, function (minutes) {
                hideWarnings();
                currentStartTimeMinutes = minutes;

                const maxPeriodsForStartBase = utils.getMaxPeriodsForStartTime(minutes, roomBookings, workEnd, minMinutes);
                const maxPeriodsForStart = limitMaxPeriodsByTariffForStart(minutes, maxPeriodsForStartBase);
                const endTimesForStartBase = utils.getEndTimesForStartTime(minutes, roomBookings, workEnd, minMinutes);
                const endTimesForStart = filterEndTimesByTariffForStart(endTimesForStartBase, minutes);

                if (currentSelectedPeriods !== null) {
                    const newEnd = minutes + (minMinutes * currentSelectedPeriods);
                    if (currentSelectedPeriods <= maxPeriodsForStart && endTimesForStart.indexOf(newEnd) !== -1) {
                        currentEndTimeMinutes = newEnd;
                    } else {
                        currentEndTimeMinutes = null;
                    }
                } else if (currentEndTimeMinutes !== null) {
                    const periodsBetween = Math.round((currentEndTimeMinutes - minutes) / minMinutes);
                    if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForStart && endTimesForStart.indexOf(currentEndTimeMinutes) !== -1) {
                        currentSelectedPeriods = periodsBetween;
                    } else if (maxPeriodsForStart === 1) {
                        currentSelectedPeriods = 1;
                        currentEndTimeMinutes = minutes + minMinutes;
                    } else {
                        currentEndTimeMinutes = null;
                        currentSelectedPeriods = null;
                    }
                } else {
                    if (maxPeriodsForStart === 1) {
                        currentSelectedPeriods = 1;
                        currentEndTimeMinutes = minutes + minMinutes;
                    }
                }

                rebuildAll();
                calculateAndUpdateEditBookingCost();
                // Проверяем занятость специалиста при изменении времени начала
                if (typeof applyEditTeacherDirectionFilters === 'function') {
                    applyEditTeacherDirectionFilters();
                }
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
            });

            utils.rebuildEndTimeSelect(endTimeSelect, filteredEndTimes, currentEndTimeMinutes, function (minutes) {
                hideWarnings();
                currentEndTimeMinutes = minutes;

                const startTimesForEndBase = utils.getStartTimesForEndTime(minutes, roomBookings, workStart, workEnd, minMinutes);
                const startTimesForEnd = filterStartTimesByTariffForEnd(startTimesForEndBase, minutes);
                const maxPeriodsForEndBase = utils.getMaxPeriodsForEndTime(minutes, roomBookings, workStart, workEnd, minMinutes);
                const maxPeriodsForEnd = limitMaxPeriodsByTariffForEnd(minutes, maxPeriodsForEndBase);

                if (currentSelectedPeriods !== null) {
                    const newStart = minutes - (minMinutes * currentSelectedPeriods);
                    if (startTimesForEnd.indexOf(newStart) !== -1) {
                        currentStartTimeMinutes = newStart;
                    } else {
                        currentStartTimeMinutes = null;
                    }
                } else if (currentStartTimeMinutes !== null) {
                    const periodsBetween = Math.round((minutes - currentStartTimeMinutes) / minMinutes);
                    if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForEnd && startTimesForEnd.indexOf(currentStartTimeMinutes) !== -1) {
                        currentSelectedPeriods = periodsBetween;
                    } else if (maxPeriodsForEnd === 1) {
                        currentSelectedPeriods = 1;
                        currentStartTimeMinutes = minutes - minMinutes;
                    } else {
                        currentStartTimeMinutes = null;
                        currentSelectedPeriods = null;
                    }
                } else {
                    if (maxPeriodsForEnd === 1) {
                        currentSelectedPeriods = 1;
                        currentStartTimeMinutes = minutes - minMinutes;
                    }
                }

                rebuildAll();
                calculateAndUpdateEditBookingCost();
                // Проверяем занятость специалиста при изменении времени окончания
                if (typeof applyEditTeacherDirectionFilters === 'function') {
                    applyEditTeacherDirectionFilters();
                }
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
            });

            validateWarnings();
            updateSubmitButtonState();
        }

        function loadRoomBookingsAndRebuild() {
            if (!roomId || !dateIso) {
                roomBookings = [];
                rebuildAll();
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
                return;
            }

            // Принудительно перезагружаем данные при смене даты (forceReload=true)
            utils.loadRoomBookingsForDate(roomId, dateIso, bookingId, function (bookings) {
                roomBookings = bookings || [];
                rebuildAll();
                // После загрузки данных вызываем валидацию и обновление кнопки
                validateWarnings();
                updateSubmitButtonState();
                // Также обновляем фильтры преподавателей
                if (typeof applyEditTeacherDirectionFilters === 'function') {
                    applyEditTeacherDirectionFilters();
                }
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
            }, true);
        }

        function resetStartTime() {
            currentStartTimeMinutes = null;
            if (startWarn) startWarn.style.display = 'none';

            if (currentEndTimeMinutes !== null) {
                currentSelectedPeriods = null;
            } else {
                currentSelectedPeriods = null;
                currentEndTimeMinutes = null;
            }
            rebuildAll();
            calculateAndUpdateEditBookingCost();
            if (typeof window.syncEditBookingTariffs === 'function') {
                window.syncEditBookingTariffs();
            }
        }

        function resetEndTime() {
            currentEndTimeMinutes = null;
            if (endWarn) endWarn.style.display = 'none';

            if (currentStartTimeMinutes !== null) {
                currentSelectedPeriods = null;
            } else {
                currentSelectedPeriods = null;
                currentStartTimeMinutes = null;
            }
            rebuildAll();
            calculateAndUpdateEditBookingCost();
            if (typeof window.syncEditBookingTariffs === 'function') {
                window.syncEditBookingTariffs();
            }
        }

        function resetDuration() {
            currentSelectedPeriods = null;
            hideWarnings();

            if (currentStartTimeMinutes !== null) {
                currentEndTimeMinutes = null;
            } else if (currentEndTimeMinutes !== null) {
                currentStartTimeMinutes = null;
            }

            rebuildAll();
            calculateAndUpdateEditBookingCost();
            if (typeof window.syncEditBookingTariffs === 'function') {
                window.syncEditBookingTariffs();
            }
        }

        function bindClearButtons() {
            const startClear = startTimeSelect ? startTimeSelect.querySelector('.custom-select-clear') : null;
            const endClear = endTimeSelect ? endTimeSelect.querySelector('.custom-select-clear') : null;
            const durationClear = durationSelect ? durationSelect.querySelector('.custom-select-clear') : null;

            if (startClear && !startClear._bound) {
                startClear._bound = true;
                startClear.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    resetStartTime();
                    if (startTimeSelect) startTimeSelect.classList.remove('open');
                });
            }

            if (endClear && !endClear._bound) {
                endClear._bound = true;
                endClear.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    resetEndTime();
                    if (endTimeSelect) endTimeSelect.classList.remove('open');
                });
            }

            if (durationClear && !durationClear._bound) {
                durationClear._bound = true;
                durationClear.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    resetDuration();
                    if (durationSelect) durationSelect.classList.remove('open');
                });
            }
        }

        bindClearButtons();

        const controller = {
            // Геттеры для доступа к текущим значениям извне
            get _currentSelectedPeriods() { return currentSelectedPeriods; },
            get _currentStartTimeMinutes() { return currentStartTimeMinutes; },
            get _currentEndTimeMinutes() { return currentEndTimeMinutes; },
            get _minMinutes() { return minMinutes; },
            updateSubmitButtonState: updateSubmitButtonState,
            syncMusicSchoolTimeFields: function () {
                syncEditBookingMusicSchoolTimeFields();
                rebuildAll();
            },
            syncTariffTimeFields: function (resetSelectionOnChange) {
                syncEditBookingTariffTimeFields(resetSelectionOnChange);
                rebuildAll();
            },
            loadFromBooking: function (booking) {
                bookingId = booking && booking.id ? booking.id : null;
                scenarioId = booking && booking.scenario_id ? String(booking.scenario_id) : modalEl.getAttribute('data-scenario-id');
                roomId = booking && booking.room_id ? String(booking.room_id) : getSelectedValue(document.getElementById('edit-room'));
                dateIso = booking && booking.date_iso ? String(booking.date_iso) : (dateInput ? dateInput.value : null);

                tariffBaseDurationMinutes = null;
                if (booking && booking.tariff_base_duration_minutes !== undefined && booking.tariff_base_duration_minutes !== null) {
                    var tdm = parseInt(String(booking.tariff_base_duration_minutes), 10);
                    tariffBaseDurationMinutes = Number.isFinite(tdm) && tdm > 0 ? tdm : null;
                }
                tariffWeeklyIntervals = Array.isArray(booking && booking.tariff_weekly_intervals)
                    ? booking.tariff_weekly_intervals
                    : [];

                minMinutes = utils.getScenarioMinDurationMinutes(scenarioId);
                workStart = utils.getScenarioWorkTimeStartMinutes(scenarioId);
                workEnd = utils.getScenarioWorkTimeEndMinutes(scenarioId);

                currentStartTimeMinutes = booking && booking.start_time_hm ? utils.parseTimeToMinutes(booking.start_time_hm) : null;
                currentEndTimeMinutes = booking && booking.end_time_hm ? utils.parseTimeToMinutes(booking.end_time_hm) : null;

                syncEditBookingMusicSchoolTimeFields(false);
                syncEditBookingTariffTimeFields(false);

                currentSelectedPeriods = null;
                if (booking && booking.duration_hhmm && !(durationSelect && durationSelect.classList.contains('disabled'))) {
                    const durMin = utils.parseTimeToMinutes(booking.duration_hhmm);
                    if (durMin && minMinutes && durMin % minMinutes === 0) {
                        currentSelectedPeriods = durMin / minMinutes;
                    }
                }

                loadRoomBookingsAndRebuild();
            },
            handleRoomOrDateChange: function () {
                roomId = getSelectedValue(document.getElementById('edit-room'));
                dateIso = dateInput ? dateInput.value : null;
                loadRoomBookingsAndRebuild();
            }
        };

        modalEl._editTimeController = controller;
        return controller;
    }

    // --- Кэш занятых специалистов на дату ---
    // Endpoint возвращает интервалы "busy" как от броней, так и от расписания
    // (недоступность вне рабочих интервалов специалиста).
    var editBusySpecialistsCache = {
        date: null,
        specialists: [] // [{id, name, intervals: [{startMinutes, endMinutes}]}]
    };

    // Загрузить занятых специалистов на дату через AJAX
    function loadEditBusySpecialistsForDate(dateIso, callback) {
        if (editBusySpecialistsCache.date === dateIso) {
            if (callback) callback(editBusySpecialistsCache.specialists);
            return;
        }

        var url = '/booking/busy-specialists-for-date/?date=' + encodeURIComponent(dateIso);

        fetch(url, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success && Array.isArray(data.busy_specialists)) {
                editBusySpecialistsCache.date = dateIso;
                editBusySpecialistsCache.specialists = data.busy_specialists;
                if (callback) callback(data.busy_specialists);
            } else {
                if (callback) callback([]);
            }
        })
        .catch(function(error) {
            console.error('Ошибка загрузки занятых специалистов:', error);
            if (callback) callback([]);
        });
    }

    // Проверить, занят ли специалист в указанное время
    function isEditSpecialistBusy(specialistId, startMinutes, endMinutes, excludeBookingId) {
        var busySpecs = editBusySpecialistsCache.specialists || [];
        for (var i = 0; i < busySpecs.length; i++) {
            if (busySpecs[i].id === specialistId) {
                var intervals = busySpecs[i].intervals || [];
                for (var j = 0; j < intervals.length; j++) {
                    var interval = intervals[j];
                    if (excludeBookingId && interval.booking_id && interval.booking_id === excludeBookingId) {
                        continue;
                    }
                    // Интервалы могут означать как реальную занятость бронью,
                    // так и "не работает" по расписанию (gaps).
                    if (startMinutes < interval.endMinutes && endMinutes > interval.startMinutes) {
                        return true;
                    }
                }
                break;
            }
        }
        return false;
    }
    window.isEditSpecialistBusy = isEditSpecialistBusy;

    // Переменная для отслеживания последнего изменённого селекта (преподаватель или направление)
    var editTeacherDirectionLastChanged = 'edit-teacher';
    window.setEditTeacherDirectionLastChanged = function(id) { editTeacherDirectionLastChanged = id; };

    // Применить фильтры преподавателей и направлений по доступности и взаимосвязи
    function applyEditTeacherDirectionFilters() {
        var modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return;

        var teacherSelect = modalEl.querySelector('#edit-teacher');
        var directionSelect = modalEl.querySelector('#edit-direction');
        if (!teacherSelect || !directionSelect) return;

        var selectedTeacherId = getSelectedValue(teacherSelect);
        var selectedDirectionId = getSelectedValue(directionSelect);
        var teacherLis = teacherSelect.querySelectorAll('ul.options li');
        var directionLis = directionSelect.querySelectorAll('ul.options li');

        var ctrl = modalEl._editTimeController;
        var startMinutes = ctrl && ctrl._currentStartTimeMinutes !== undefined ? ctrl._currentStartTimeMinutes : null;
        var endMinutes = ctrl && ctrl._currentEndTimeMinutes !== undefined ? ctrl._currentEndTimeMinutes : null;
        var currentBookingId = window.currentBookingId;
        var teacherWarning = document.getElementById('edit-teacher-warning-icon');

        var checkStartMinutes = startMinutes;
        var checkEndMinutes = endMinutes;
        if (startMinutes !== null && endMinutes === null) {
            var minCheckMinutes = (ctrl && ctrl._minMinutes) ? ctrl._minMinutes : 30;
            checkEndMinutes = startMinutes + minCheckMinutes;
        } else if (startMinutes === null && endMinutes !== null) {
            var minCheckMinutes2 = (ctrl && ctrl._minMinutes) ? ctrl._minMinutes : 30;
            checkStartMinutes = endMinutes - minCheckMinutes2;
        }

        // 0) Получаем выбранную услугу преподавателя и маппинг услуга→специалисты
        var specialistServiceSelect = modalEl.querySelector('#edit-specialist-service');
        var selectedServiceId = specialistServiceSelect ? getSelectedValue(specialistServiceSelect) : '';
        var mappingEl = document.getElementById('edit_specialist_service_to_specialists_json');
        var serviceToSpecialists = {};
        if (mappingEl) {
            try {
                serviceToSpecialists = JSON.parse(mappingEl.textContent || '{}');
            } catch (e) {
                console.warn('Не удалось распарсить edit_specialist_service_to_specialists_json:', e);
            }
        }
        // Список специалистов, оказывающих выбранную услугу (если услуга выбрана)
        var specialistsForSelectedService = (selectedServiceId && !selectedTeacherId) ? (serviceToSpecialists[selectedServiceId] || []) : null;

        // 1) Собираем доступных специалистов и их направления
        var availableTeacherIds = [];
        var availableDirectionIds = new Set();
        teacherLis.forEach(function(li) {
            var tid = parseInt(li.getAttribute('data-value'), 10);
            var dirsRaw = li.getAttribute('data-directions') || '';
            var dirs = dirsRaw ? dirsRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];
            var timeOk = true;
            if (checkStartMinutes !== null && checkEndMinutes !== null) {
                timeOk = !isEditSpecialistBusy(tid, checkStartMinutes, checkEndMinutes, currentBookingId);
            }
            // Проверяем, оказывает ли специалист выбранную услугу (если услуга выбрана)
            var serviceMatch = true;
            if (specialistsForSelectedService !== null) {
                serviceMatch = specialistsForSelectedService.indexOf(tid) !== -1;
            }
            if (timeOk && serviceMatch && !isNaN(tid)) {
                availableTeacherIds.push(tid);
                dirs.forEach(function(d) { availableDirectionIds.add(d); });
            }
        });

        // 2) Проверка на конфликт: если оба выбраны, но не совместимы — сбрасываем один
        if (selectedTeacherId && selectedDirectionId) {
            var selTeacherLi = teacherSelect.querySelector('ul.options li.selected');
            var tDirsRaw = selTeacherLi ? (selTeacherLi.getAttribute('data-directions') || '') : '';
            var tDirs = tDirsRaw ? tDirsRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];
            if (tDirs.indexOf(String(selectedDirectionId)) === -1) {
                if (editTeacherDirectionLastChanged === 'edit-direction') {
                    teacherLis.forEach(function(li) { li.classList.remove('selected'); });
                    var ts = teacherSelect.querySelector('.selected');
                    if (ts) ts.textContent = 'Выберите преподавателя';
                    selectedTeacherId = '';
                } else {
                    directionLis.forEach(function(li) { li.classList.remove('selected'); });
                    var ds = directionSelect.querySelector('.selected');
                    if (ds) ds.textContent = 'Выберите направление';
                    selectedDirectionId = '';
                }
            }
        }

        // 3) Фильтрация направлений
        var visibleDirCount = 0, lastVisibleDirLi = null;
        var dirSpan = directionSelect.querySelector('span.selected');
        if (selectedTeacherId) {
            var tLi = teacherSelect.querySelector('ul.options li.selected');
            var dRaw = tLi ? (tLi.getAttribute('data-directions') || '') : '';
            var allowedDirs = dRaw ? dRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];
            directionLis.forEach(function(li) {
                var dirId = li.getAttribute('data-value') || '';
                var vis = allowedDirs.indexOf(String(dirId)) !== -1;
                li.style.display = vis ? '' : 'none';
                if (vis) { visibleDirCount++; lastVisibleDirLi = li; }
            });
        } else {
            directionLis.forEach(function(li) {
                var dirId = li.getAttribute('data-value') || '';
                var vis = availableDirectionIds.has(dirId);
                li.style.display = vis ? '' : 'none';
                if (vis) { visibleDirCount++; lastVisibleDirLi = li; }
            });
        }
        // Авто-подстановка единственного направления
        if (visibleDirCount === 1 && !selectedDirectionId && lastVisibleDirLi) {
            lastVisibleDirLi.classList.add('selected');
            if (dirSpan) dirSpan.textContent = lastVisibleDirLi.textContent;
            selectedDirectionId = lastVisibleDirLi.getAttribute('data-value');
        }

        // 4) Фильтрация преподавателей
        var visibleTeacherCount = 0, lastVisibleTeacherLi = null;
        var teacherSpan = teacherSelect.querySelector('.selected');
        teacherLis.forEach(function(li) {
            var tid = parseInt(li.getAttribute('data-value'), 10);
            var dRaw = li.getAttribute('data-directions') || '';
            var dirs = dRaw ? dRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];
            var dirMatch = !selectedDirectionId || dirs.indexOf(String(selectedDirectionId)) !== -1;
            var timeOk = availableTeacherIds.indexOf(tid) !== -1;
            var vis = dirMatch && timeOk;
            li.style.display = vis ? '' : 'none';
            if (vis) { visibleTeacherCount++; lastVisibleTeacherLi = li; }
        });

        if (selectedTeacherId) {
            var selectedTeacherLi2 = teacherSelect.querySelector('ul.options li.selected');
            if (selectedTeacherLi2 && selectedTeacherLi2.style.display === 'none') {
                teacherLis.forEach(function(li) { li.classList.remove('selected'); });
                var ts = teacherSelect.querySelector('.selected');
                if (ts) ts.textContent = 'Выберите преподавателя';
                selectedTeacherId = '';
                teacherSelect.classList.remove('open');
                teacherSelect.classList.remove('has-selection');
            }
        }

        if (visibleTeacherCount === 0) {
            teacherSelect.classList.add('disabled');
            teacherSelect.classList.remove('open');
            teacherSelect.classList.remove('has-selection');
            teacherLis.forEach(function(li) { li.classList.remove('selected'); });
            selectedTeacherId = '';
            if (teacherSpan) teacherSpan.textContent = 'Нет доступных преподавателей';
            if (teacherWarning) teacherWarning.style.display = 'none';
        } else {
            teacherSelect.classList.remove('disabled');
            if (!selectedTeacherId && teacherSpan) {
                teacherSpan.textContent = 'Выберите преподавателя';
            }

            // Авто-подстановка единственного специалиста
            if (visibleTeacherCount === 1 && !selectedTeacherId && lastVisibleTeacherLi) {
                lastVisibleTeacherLi.classList.add('selected');
                if (teacherSpan) teacherSpan.textContent = lastVisibleTeacherLi.textContent;
                teacherSelect.classList.add('has-selection');
                selectedTeacherId = lastVisibleTeacherLi.getAttribute('data-value');
                var sDirsRaw = lastVisibleTeacherLi.getAttribute('data-directions') || '';
                var sDirs = sDirsRaw ? sDirsRaw.split(',').map(function(v) { return v.trim(); }).filter(Boolean) : [];
                if (sDirs.length === 1 && !selectedDirectionId) {
                    directionLis.forEach(function(li) {
                        if (li.getAttribute('data-value') === sDirs[0]) {
                            li.classList.add('selected');
                            if (dirSpan) dirSpan.textContent = li.textContent;
                        }
                    });
                }
            }
        }

        // 5) Предупреждение о занятости преподавателя
        if (selectedTeacherId && checkStartMinutes !== null && checkEndMinutes !== null) {
            var teacherIdInt = parseInt(selectedTeacherId, 10);
            if (isEditSpecialistBusy(teacherIdInt, checkStartMinutes, checkEndMinutes, currentBookingId)) {
                if (teacherWarning) teacherWarning.style.display = 'inline-block';
            } else {
                if (teacherWarning) teacherWarning.style.display = 'none';
            }
        } else {
            if (teacherWarning) teacherWarning.style.display = 'none';
        }

        applyEditSpecialistServicesFilter(availableTeacherIds, selectedTeacherId);

        // 6) Обновляем состояние кнопки сохранения
        var ctrl2 = modalEl._editTimeController;
        if (ctrl2 && typeof ctrl2.updateSubmitButtonState === 'function') {
            ctrl2.updateSubmitButtonState();
        }

    }
    window.applyEditTeacherDirectionFilters = applyEditTeacherDirectionFilters;

    function applyEditSpecialistServicesFilter(availableTeacherIds, selectedTeacherId) {
        var modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return;

        var specialistServiceSelect = modalEl.querySelector('#edit-specialist-service');
        if (!specialistServiceSelect) return;

        var mappingEl = document.getElementById('edit_specialist_service_to_specialists_json');
        var serviceToSpecialists = {};
        if (mappingEl) {
            try {
                serviceToSpecialists = JSON.parse(mappingEl.textContent || '{}');
            } catch (e) {
                console.warn('Не удалось распарсить edit_specialist_service_to_specialists_json:', e);
            }
        }

        var serviceLis = specialistServiceSelect.querySelectorAll('ul.options li');
        var visibleCount = 0;
        var lastVisibleLi = null;
        var selectedServiceId = getSelectedValue(specialistServiceSelect);

        var relevantSpecialistIds = [];
        if (selectedTeacherId) {
            relevantSpecialistIds = [parseInt(selectedTeacherId, 10)];
        } else {
            relevantSpecialistIds = availableTeacherIds || [];
        }
        var relevantSet = new Set(relevantSpecialistIds.map(function(x) { return String(x); }));

        serviceLis.forEach(function(li) {
            var serviceId = li.getAttribute('data-value');
            var specialistsForService = serviceToSpecialists[serviceId] || [];

            var isVisible = specialistsForService.some(function(specId) {
                return relevantSet.has(String(specId));
            });

            li.style.display = isVisible ? '' : 'none';
            if (isVisible) {
                visibleCount++;
                lastVisibleLi = li;
            }
        });

        var selectedSpan = specialistServiceSelect.querySelector('span.selected');
        var placeholder = specialistServiceSelect.getAttribute('data-placeholder') || 'Выберите услугу преподавателя';

        if (selectedServiceId) {
            var selectedLi = specialistServiceSelect.querySelector('ul.options li.selected');
            if (selectedLi && selectedLi.style.display === 'none') {
                selectedLi.classList.remove('selected');
                selectedServiceId = '';
                if (selectedSpan) selectedSpan.textContent = placeholder;
                specialistServiceSelect.classList.remove('has-selection');
            }
        }

        if (visibleCount === 0) {
            specialistServiceSelect.classList.add('disabled');
            if (selectedSpan) selectedSpan.textContent = 'Нет доступных услуг';
            specialistServiceSelect.classList.remove('has-selection');
        } else if (visibleCount === 1 && !selectedServiceId && lastVisibleLi) {
            specialistServiceSelect.classList.remove('disabled');
            lastVisibleLi.classList.add('selected');
            if (selectedSpan) {
                var serviceName = lastVisibleLi.querySelector('.service-name');
                selectedSpan.textContent = serviceName ? serviceName.textContent : lastVisibleLi.textContent;
            }
            specialistServiceSelect.classList.add('has-selection');
        } else {
            specialistServiceSelect.classList.remove('disabled');
            if (!selectedServiceId && selectedSpan) {
                selectedSpan.textContent = placeholder;
            }
            if (!selectedServiceId) {
                specialistServiceSelect.classList.remove('has-selection');
            }
        }
        var ctrl = document.getElementById('editBookingModal')?._editTimeController;
        if (ctrl && typeof ctrl.syncMusicSchoolTimeFields === 'function') {
            ctrl.syncMusicSchoolTimeFields();
        }
        if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
            ctrl.updateSubmitButtonState();
        }

    }

    // =====================================================
    // МОДУЛЬ КАЛЕНДАРЯ (DATEPICKER) ДЛЯ РЕДАКТИРОВАНИЯ
    // =====================================================
    var editDatepickerCurrentMonth = new Date();
    var editDatepickerSelectedDate = new Date();
    var editMonthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    var editMonthNamesGenitive = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    function formatEditDateDisplay(date) {
        return date.getDate() + ' ' + editMonthNamesGenitive[date.getMonth()] + ' ' + date.getFullYear();
    }

    function formatEditDateIso(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function initEditDatepicker(initialDateIso) {
        var trigger = document.getElementById('edit-datepicker-trigger');
        var popup = document.getElementById('edit-datepicker-popup');
        var display = document.getElementById('edit-datepicker-display');
        var grid = document.getElementById('edit-datepicker-grid');
        var monthSel = document.getElementById('edit-datepicker-month');
        var yearSel = document.getElementById('edit-datepicker-year');
        var prevBtn = document.getElementById('edit-datepicker-prev');
        var nextBtn = document.getElementById('edit-datepicker-next');
        var todayBtn = document.getElementById('edit-datepicker-today');
        var input = document.getElementById('edit-date');
        if (!trigger || !popup || !grid) return;

        if (initialDateIso) {
            editDatepickerSelectedDate = new Date(initialDateIso);
            editDatepickerCurrentMonth = new Date(initialDateIso);
        }

        function populateMonthSelect() {
            if (!monthSel) return;
            monthSel.innerHTML = '';
            for (var i = 0; i < 12; i++) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = editMonthNames[i];
                if (i === editDatepickerCurrentMonth.getMonth()) opt.selected = true;
                monthSel.appendChild(opt);
            }
        }

        function populateYearSelect() {
            if (!yearSel) return;
            yearSel.innerHTML = '';
            var currentYear = new Date().getFullYear();
            for (var y = currentYear - 2; y <= currentYear + 3; y++) {
                var opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                if (y === editDatepickerCurrentMonth.getFullYear()) opt.selected = true;
                yearSel.appendChild(opt);
            }
        }

        function buildGrid() {
            grid.innerHTML = '';
            var year = editDatepickerCurrentMonth.getFullYear();
            var month = editDatepickerCurrentMonth.getMonth();
            var firstDay = new Date(year, month, 1);
            var startDow = (firstDay.getDay() + 6) % 7;
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var prevLast = new Date(year, month, 0).getDate();
            var today = new Date(); today.setHours(0,0,0,0);

            for (var i = startDow - 1; i >= 0; i--) {
                var cell = document.createElement('div');
                cell.className = 'modal-datepicker__day modal-datepicker__day--outside';
                cell.textContent = prevLast - i;
                grid.appendChild(cell);
            }
            for (var d = 1; d <= daysInMonth; d++) {
                var cell = document.createElement('div');
                cell.className = 'modal-datepicker__day';
                cell.textContent = d;
                var cellDate = new Date(year, month, d); cellDate.setHours(0,0,0,0);
                if (cellDate.getTime() === today.getTime()) cell.classList.add('modal-datepicker__day--today');
                if (editDatepickerSelectedDate && cellDate.getFullYear() === editDatepickerSelectedDate.getFullYear() &&
                    cellDate.getMonth() === editDatepickerSelectedDate.getMonth() && cellDate.getDate() === editDatepickerSelectedDate.getDate()) {
                    cell.classList.add('modal-datepicker__day--selected');
                }
                (function(dt) { cell.addEventListener('click', function() { onDateSelected(dt); }); })(cellDate);
                grid.appendChild(cell);
            }
            var total = grid.children.length;
            var remaining = (7 - (total % 7)) % 7;
            for (var n = 1; n <= remaining; n++) {
                var cell = document.createElement('div');
                cell.className = 'modal-datepicker__day modal-datepicker__day--outside';
                cell.textContent = n;
                grid.appendChild(cell);
            }
        }

        function render() { populateMonthSelect(); populateYearSelect(); buildGrid(); }

        function onDateSelected(newDate) {
            editDatepickerSelectedDate = newDate;
            var iso = formatEditDateIso(newDate);
            if (display) display.textContent = formatEditDateDisplay(newDate);
            if (input) input.value = iso;
            popup.classList.remove('open');
            var ctrl = ensureEditTimeController();
            if (ctrl && ctrl.handleRoomOrDateChange) ctrl.handleRoomOrDateChange();
            loadEditBusySpecialistsForDate(iso, function() { applyEditTeacherDirectionFilters(); });
        }

        if (!trigger._bound) {
            trigger._bound = true;
            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                popup.classList.toggle('open');
                if (popup.classList.contains('open')) {
                    editDatepickerCurrentMonth = new Date(editDatepickerSelectedDate.getFullYear(), editDatepickerSelectedDate.getMonth(), 1);
                    render();
                }
            });
        }
        if (prevBtn && !prevBtn._bound) {
            prevBtn._bound = true;
            prevBtn.addEventListener('click', function(e) { e.stopPropagation(); editDatepickerCurrentMonth.setMonth(editDatepickerCurrentMonth.getMonth() - 1); render(); });
        }
        if (nextBtn && !nextBtn._bound) {
            nextBtn._bound = true;
            nextBtn.addEventListener('click', function(e) { e.stopPropagation(); editDatepickerCurrentMonth.setMonth(editDatepickerCurrentMonth.getMonth() + 1); render(); });
        }
        if (monthSel && !monthSel._bound) {
            monthSel._bound = true;
            monthSel.addEventListener('change', function() { editDatepickerCurrentMonth.setMonth(parseInt(this.value, 10)); render(); });
        }
        if (yearSel && !yearSel._bound) {
            yearSel._bound = true;
            yearSel.addEventListener('change', function() { editDatepickerCurrentMonth.setFullYear(parseInt(this.value, 10)); render(); });
        }
        if (todayBtn && !todayBtn._bound) {
            todayBtn._bound = true;
            todayBtn.addEventListener('click', function(e) { e.stopPropagation(); onDateSelected(new Date()); });
        }
        if (!window._editDatepickerClickHandler) {
            window._editDatepickerClickHandler = true;
            document.addEventListener('click', function(e) {
                var p = document.getElementById('edit-datepicker-popup');
                var t = document.getElementById('edit-datepicker-trigger');
                if (p && p.classList.contains('open') && !p.contains(e.target) && t && !t.contains(e.target)) {
                    p.classList.remove('open');
                }
            });
        }
        if (display) display.textContent = formatEditDateDisplay(editDatepickerSelectedDate);
        if (input) input.value = formatEditDateIso(editDatepickerSelectedDate);
    }
