(function () {
    if (window.BookingTimeUtils) {
        return;
    }

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

    function formatTimeHHMM(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m < 0) return '';
        var h = Math.floor(m / 60) % 24;
        var mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        var parts = String(timeStr).split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function formatDurationHuman(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m <= 0) return '';
        var h = Math.floor(m / 60);
        var mm = m % 60;
        if (h > 0 && mm > 0) return h + ' ч ' + mm + ' мин';
        if (h > 0) return h + ' ч';
        return mm + ' мин';
    }

    function formatDurationHHMM(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (isNaN(m) || m < 0) return '';
        var h = Math.floor(m / 60);
        var mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    function formatPeriodsLabel(n) {
        var k = parseInt(n, 10);
        if (k === 1) return 'период';
        if (k >= 2 && k <= 4) return 'периода';
        return 'периодов';
    }

    function getScenarioWorkTimeStartMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 0;
        var s = window.SCENARIOS.find(function (x) {
            return String(x.pk) === String(scenarioId);
        });
        if (!s || !s.fields || !s.fields.work_time_start) return 0;
        return parseTimeToMinutes(String(s.fields.work_time_start).slice(0, 5)) || 0;
    }

    function getScenarioWorkTimeEndMinutes(scenarioId) {
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return 24 * 60;
        var s = window.SCENARIOS.find(function (x) {
            return String(x.pk) === String(scenarioId);
        });
        if (!s || !s.fields || !s.fields.work_time_end) return 24 * 60;
        return parseTimeToMinutes(String(s.fields.work_time_end).slice(0, 5)) || (24 * 60);
    }

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

    function getScenarioTariffUnitCost(scenarioId) {
        if (!scenarioId || !Array.isArray(window.TARIFF_UNITS)) return 0;
        var tu = window.TARIFF_UNITS.find(function (t) {
            return t.fields && String(t.fields.scenario) === String(scenarioId);
        });
        if (!tu || !tu.fields || tu.fields.tariff_unit_cost === undefined || tu.fields.tariff_unit_cost === null) return 0;
        var v = parseFloat(String(tu.fields.tariff_unit_cost));
        return Number.isFinite(v) ? v : 0;
    }

    var _roomBookingsCache = new Map();

    function _cacheKey(roomId, dateIso, excludeBookingId) {
        return String(roomId) + '|' + String(dateIso) + '|' + (excludeBookingId === undefined || excludeBookingId === null ? '' : String(excludeBookingId));
    }

    // Очистить кэш бронирований (вызывается при необходимости принудительного обновления)
    function clearRoomBookingsCache() {
        _roomBookingsCache.clear();
    }

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

    function getAvailableStartTimeSlots(roomBookings, workStart, workEnd, minMinutes) {
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

    function getStartTimeSlotsForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes) {
        var allSlots = getAvailableStartTimeSlots(roomBookings, workStart, workEnd, minMinutes);
        if (requiredPeriods <= 1) return allSlots;

        return allSlots.filter(function (slotMinutes) {
            var maxPeriods = getMaxPeriodsForStartTime(slotMinutes, roomBookings, workEnd, minMinutes);
            return maxPeriods >= requiredPeriods;
        });
    }

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

    function getEndTimesForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes) {
        var maxPeriods = getMaxPeriodsForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes);
        var endTimes = [];
        for (var p = 1; p <= maxPeriods; p++) {
            endTimes.push(startTimeMinutes + (minMinutes * p));
        }
        return endTimes;
    }

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

    function getGlobalMaxPeriods(roomBookings, workStart, workEnd, minMinutes) {
        var allSlots = getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
        var maxPeriods = 0;
        allSlots.forEach(function (slotMinutes) {
            var mp = getMaxPeriodsForStartTime(slotMinutes, roomBookings, workEnd, minMinutes);
            if (mp > maxPeriods) maxPeriods = mp;
        });
        return maxPeriods;
    }

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

    function updateSelectHasSelection(selectEl, hasValue) {
        if (!selectEl) return;
        if (hasValue) {
            selectEl.classList.add('has-selection');
        } else {
            selectEl.classList.remove('has-selection');
        }
    }

    function rebuildDurationSelect(selectEl, selectedPeriods, maxPeriods, minMinutes, onPeriodsSelected) {
        if (!selectEl) return;
        var durationSelectedSpan = selectEl.querySelector('.selected');
        var durationOptionsUl = selectEl.querySelector('ul.options');
        var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите период';

        if (durationOptionsUl) {
            durationOptionsUl.innerHTML = '';
        }

        if (maxPeriods <= 0) {
            if (durationSelectedSpan) {
                durationSelectedSpan.textContent = 'Нет доступных периодов';
            }
            selectEl.classList.add('disabled');
            updateSelectHasSelection(selectEl, false);
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
