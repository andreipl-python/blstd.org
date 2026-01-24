    (function () {
        var modalElement = document.getElementById('createBookingModal');
        if (!modalElement) {
            return;
        }

        var peopleCountInput = document.getElementById('people-count');
        if (peopleCountInput && !peopleCountInput._peopleCountBound) {
            peopleCountInput._peopleCountBound = true;
            peopleCountInput.addEventListener('input', function () {
                var raw = String(peopleCountInput.value || '');
                var digits = raw.replace(/\D+/g, '').slice(0, 2);
                if (digits) {
                    var n = parseInt(digits, 10);
                    if (Number.isFinite(n)) {
                        if (n <= 0) {
                            digits = '';
                        } else {
                        if (n > 99) n = 99;
                        digits = String(n);
                        }
                    }
                }
                if (peopleCountInput.value !== digits) {
                    peopleCountInput.value = digits;
                }
                if (typeof window.updateSubmitButtonState === 'function') {
                    window.updateSubmitButtonState();
                }
                if (typeof window.syncCreateBookingTariffs === 'function') {
                    window.syncCreateBookingTariffs();
                }
                if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                    window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                }
            });
        }

        var teacherDirectionLastChanged = null;

        // --------------------------
        // Вспомогательные функции
        // --------------------------

        function getSelectedValue(selectEl) {
            if (window.BookingModalUtils && typeof window.BookingModalUtils.getSelectedValue === 'function') {
                return window.BookingModalUtils.getSelectedValue(selectEl);
            }
            var selectedLi = selectEl.querySelector('ul.options li.selected');
            return selectedLi ? (selectedLi.getAttribute('data-value') || '') : '';
        }

        function syncClearableSelectState(selectEl) {
            if (!selectEl || !selectEl.classList.contains('custom-select--clearable')) {
                return;
            }

            var hasValue = Boolean(getSelectedValue(selectEl));
            if (window.BookingModalUtils && typeof window.BookingModalUtils.updateSelectHasSelection === 'function') {
                window.BookingModalUtils.updateSelectHasSelection(selectEl, hasValue);
                return;
            }

            if (hasValue) {
                selectEl.classList.add('has-selection');
            } else {
                selectEl.classList.remove('has-selection');
            }
        }

        function resetSelect(selectEl) {
            if (window.BookingModalUtils && typeof window.BookingModalUtils.resetSelect === 'function') {
                window.BookingModalUtils.resetSelect(selectEl);
                syncClearableSelectState(selectEl);
                return;
            }
            var selectedSpan = selectEl.querySelector('.selected');
            var placeholder = selectEl.getAttribute('data-placeholder') || (selectedSpan ? selectedSpan.textContent : '');
            var options = selectEl.querySelectorAll('ul.options li');

            options.forEach(function (li) {
                li.classList.remove('selected');
            });

            if (selectedSpan) {
                selectedSpan.textContent = placeholder;
            }

            syncClearableSelectState(selectEl);
        }

        function resetTeacherDirectionUI() {
            var teacherSelect = modalElement.querySelector('#teacher');
            var directionSelect = modalElement.querySelector('#field-direction');
            if (!teacherSelect || !directionSelect) {
                return;
            }

            resetSelect(teacherSelect);
            resetSelect(directionSelect);

            teacherSelect.querySelectorAll('ul.options li').forEach(function (li) {
                li.style.display = '';
            });
            directionSelect.querySelectorAll('ul.options li').forEach(function (li) {
                li.style.display = '';
            });
        }

        function isTariffScenario() {
            return window.currentScenarioName === 'Репетиционная точка' || window.currentScenarioName === 'Музыкальный класс';
        }

        function formatMinutesToHHMM(totalMinutes) {
            if (window.BookingTimeUtils && typeof window.BookingTimeUtils.formatTimeHHMM === 'function') {
                return window.BookingTimeUtils.formatTimeHHMM(totalMinutes);
            }
            var hours = Math.floor(totalMinutes / 60);
            var mins = totalMinutes % 60;
            return String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
        }

        function setTariffSelectDisabled(selectEl, text, blockEl) {
            if (!selectEl) return;
            selectEl.classList.add('disabled');
            selectEl.classList.remove('open');

            var span = selectEl.querySelector('span.selected');
            if (span) {
                span.textContent = text || (selectEl.getAttribute('data-placeholder') || 'Выберите тариф');
            }

            selectEl.querySelectorAll('ul.options li').forEach(function (li) {
                li.classList.remove('selected');
            });

            syncClearableSelectState(selectEl);

            if (blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                blockEl._bulkOnTariffChanged();
            } else {
                if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                    window.syncCreateBookingTariffTimeFields();
                }
            }
        }

        function renderTariffOptions(selectEl, tariffs, blockEl) {
            if (!selectEl) return;

            var optionsEl = selectEl.querySelector('ul.options');
            if (!optionsEl) return;

            var prevSelected = getSelectedValue(selectEl);

            optionsEl.innerHTML = '';
            (tariffs || []).forEach(function (t) {
                var li = document.createElement('li');
                li.setAttribute('data-value', String(t.id));
                li.setAttribute('data-base-cost', String(t.base_cost || '0'));
                li.setAttribute('data-base-duration-minutes', String(t.base_duration_minutes || 0));
                li.setAttribute('data-max-people', String(t.max_people || 0));
                li.setAttribute('data-day-intervals', JSON.stringify(t.day_intervals || []));
                li.textContent = String(t.name || '') + ' (' + String(t.base_cost || '0') + ' BYN / ' + String(t.base_duration_minutes || 0) + ' мин)';
                optionsEl.appendChild(li);
            });

            selectEl.classList.remove('disabled');

            var selectedSpan = selectEl.querySelector('span.selected');
            var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите тариф';

            var restore = prevSelected
                ? optionsEl.querySelector('li[data-value="' + String(prevSelected) + '"]')
                : null;
            if (restore) {
                restore.classList.add('selected');
                if (selectedSpan) selectedSpan.textContent = restore.textContent;
                syncClearableSelectState(selectEl);

                if (blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                    blockEl._bulkOnTariffChanged();
                } else {
                    if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                        window.syncCreateBookingTariffTimeFields();
                    }
                }
                return;
            }

            resetSelect(selectEl);
            if (selectedSpan) {
                selectedSpan.textContent = placeholder;
            }

            if (blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                blockEl._bulkOnTariffChanged();
            } else {
                if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                    window.syncCreateBookingTariffTimeFields();
                }
            }

            if ((tariffs || []).length === 1) {
                var onlyLi = optionsEl.querySelector('li');
                if (onlyLi && window.BookingSelectsUtils && typeof window.BookingSelectsUtils.selectOption === 'function') {
                    window.BookingSelectsUtils.selectOption({
                        selectEl: selectEl,
                        optionEl: onlyLi,
                        onSelected: function () {
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }

                            if (blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                                blockEl._bulkOnTariffChanged();
                            } else {
                                if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                    window.calculateAndUpdateBookingCost();
                                }
                                if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                                    window.syncCreateBookingTariffTimeFields();
                                }
                            }
                        }
                    });
                }
            }
        }

        function syncCreateBookingTariffs(blockEl) {
            if (!isTariffScenario()) {
                return;
            }

            function parseTimeToMinutes(hm) {
                if (window.BookingModalUtils && typeof window.BookingModalUtils.parseHmToMinutes === 'function') {
                    return window.BookingModalUtils.parseHmToMinutes(hm);
                }
                var s = String(hm || '').trim();
                if (!s) return null;
                var parts = s.split(':');
                if (parts.length < 2) return null;
                var h = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
                return (h * 60) + m;
            }

            function syncTariffsInBlock(b) {
                if (!b || typeof b.querySelector !== 'function') return;

                var selectEl = b.querySelector('.custom-select[id^="tariff"]');
                if (!selectEl) return;

                var roomIdField = document.getElementById('roomIdField');
                var roomId = roomIdField ? String(roomIdField.value || '').trim() : '';
                var scenarioId = (window.currentScenarioFilterId !== undefined && window.currentScenarioFilterId !== null)
                    ? String(window.currentScenarioFilterId)
                    : '';

                var dateInput = b.querySelector('input[id^="modal-create-date"]');
                var dateIso = dateInput ? String(dateInput.value || '').trim() : '';

                var state = b._bulkTimeState || {};
                var startMinutes = (state.startMinutes !== undefined) ? state.startMinutes : null;
                var endMinutes = (state.endMinutes !== undefined) ? state.endMinutes : null;

                if ((startMinutes === null || startMinutes === undefined)) {
                    var startSelect = b.querySelector('.custom-select[id^="start-time"]');
                    var startLi = startSelect ? startSelect.querySelector('ul.options li.selected') : null;
                    if (startLi) {
                        var smRaw = startLi.getAttribute('data-minutes');
                        var sm = smRaw !== null && smRaw !== undefined ? parseInt(smRaw, 10) : null;
                        if (!Number.isFinite(sm)) {
                            sm = parseTimeToMinutes(startLi.getAttribute('data-value') || startLi.textContent);
                        }
                        startMinutes = Number.isFinite(sm) ? sm : startMinutes;
                    }
                }
                if ((endMinutes === null || endMinutes === undefined)) {
                    var endSelect = b.querySelector('.custom-select[id^="end-time"]');
                    var endLi = endSelect ? endSelect.querySelector('ul.options li.selected') : null;
                    if (endLi) {
                        var emRaw = endLi.getAttribute('data-minutes');
                        var em = emRaw !== null && emRaw !== undefined ? parseInt(emRaw, 10) : null;
                        if (!Number.isFinite(em)) {
                            em = parseTimeToMinutes(endLi.getAttribute('data-value') || endLi.textContent);
                        }
                        endMinutes = Number.isFinite(em) ? em : endMinutes;
                    }
                }

                var startHm = (startMinutes !== null && startMinutes !== undefined) ? formatMinutesToHHMM(startMinutes) : '';
                var endHm = (endMinutes !== null && endMinutes !== undefined) ? formatMinutesToHHMM(endMinutes) : '';

                var peopleCountEl = document.getElementById('people-count');
                var peopleCount = peopleCountEl ? String(peopleCountEl.value || '').trim() : '';

                if (!scenarioId || !roomId || !dateIso || !startHm) {
                    selectEl._tariffsLastRequestKey = null;
                    setTariffSelectDisabled(selectEl, 'Выберите время начала', b);
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    return;
                }

                var peopleCountInt = peopleCount ? parseInt(peopleCount, 10) : NaN;
                if (!peopleCount || !Number.isFinite(peopleCountInt) || peopleCountInt < 1) {
                    selectEl._tariffsLastRequestKey = null;
                    setTariffSelectDisabled(selectEl, 'Укажите количество людей', b);
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    return;
                }

                var qs = new URLSearchParams({
                    scenario_id: scenarioId,
                    room_id: roomId,
                    date_iso: dateIso,
                    start_time_hm: startHm,
                    people_count: peopleCount
                });
                if (endHm) {
                    qs.set('end_time_hm', endHm);
                }

                var requestKey = qs.toString();
                if (selectEl._tariffsLastRequestKey === requestKey) {
                    return;
                }
                selectEl._tariffsLastRequestKey = requestKey;

                fetch('/booking/get-available-tariffs/?' + requestKey, {
                    method: 'GET'
                })
                .then(function (resp) { return resp.json(); })
                .then(function (data) {
                    if (!data || !data.success) {
                        setTariffSelectDisabled(selectEl, 'Нет доступных тарифов', b);
                        return;
                    }

                    var tariffs = Array.isArray(data.tariffs) ? data.tariffs : [];
                    if (!tariffs.length) {
                        setTariffSelectDisabled(selectEl, 'Нет доступных тарифов', b);
                        return;
                    }

                    renderTariffOptions(selectEl, tariffs, b);
                })
                .catch(function () {
                    setTariffSelectDisabled(selectEl, 'Нет доступных тарифов', b);
                })
                .finally(function () {
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                });
            }

            if (blockEl && typeof blockEl.querySelector === 'function') {
                syncTariffsInBlock(blockEl);
                return;
            }

            var blocksContainer = document.getElementById('bookingBlocksContainer');
            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
            if (!blocks.length) {
                var rootTariffSelect = document.getElementById('tariff');
                if (rootTariffSelect) {
                    syncTariffsInBlock(document);
                }
                return;
            }

            blocks.forEach(function (b) {
                syncTariffsInBlock(b);
            });
        }

        window.syncCreateBookingTariffs = syncCreateBookingTariffs;

        function applyTeacherDirectionFilters() {
            var teacherSelect = modalElement.querySelector('#teacher');
            var directionSelect = modalElement.querySelector('#field-direction');
            if (!teacherSelect || !directionSelect) {
                return;
            }

            var selectedTeacherId = getSelectedValue(teacherSelect);
            var selectedDirectionId = getSelectedValue(directionSelect);

            var teacherLis = teacherSelect.querySelectorAll('ul.options li');
            var directionLis = directionSelect.querySelectorAll('ul.options li');
            
            // Получаем текущее время начала и окончания для проверки доступности (из глобальных переменных)
            var startMinutes = window.currentStartTimeMinutes;
            var endMinutes = window.currentEndTimeMinutes;
            var teacherWarning = document.getElementById('teacher-warning-icon');
            
            // Вычисляем время для проверки доступности
            var checkStartMinutes = startMinutes;
            var checkEndMinutes = endMinutes;
            if (startMinutes !== null && endMinutes === null) {
                var minCheckMinutes = window.currentMinMinutes || 30;
                checkEndMinutes = startMinutes + minCheckMinutes;
            } else if (startMinutes === null && endMinutes !== null) {
                var minCheckMinutes2 = window.currentMinMinutes || 30;
                checkStartMinutes = endMinutes - minCheckMinutes2;
            }

            // 0) Получаем выбранную услугу преподавателя и маппинг услуга→специалисты
            var specialistServiceSelect = modalElement.querySelector('#specialist-service');
            var selectedServiceId = specialistServiceSelect ? getSelectedValue(specialistServiceSelect) : '';
            var mappingEl = document.getElementById('specialist_service_to_specialists_json');
            var serviceToSpecialists = {};
            if (mappingEl) {
                try {
                    serviceToSpecialists = JSON.parse(mappingEl.textContent || '{}');
                } catch (e) {
                    console.warn('Не удалось распарсить specialist_service_to_specialists_json:', e);
                }
            }
            // Список специалистов, оказывающих выбранную услугу (если услуга выбрана)
            var specialistsForSelectedService = selectedServiceId ? (serviceToSpecialists[selectedServiceId] || []) : null;

            // 1) Сначала определяем доступных специалистов
            var availableTeacherIds = [];
            var availableDirectionIds = new Set();
            
            teacherLis.forEach(function (li) {
                var teacherId = parseInt(li.getAttribute('data-value'), 10);
                var dirsRaw = li.getAttribute('data-directions') || '';
                var dirs = dirsRaw ? dirsRaw.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];
                
                // Проверяем доступность по времени
                var timeAvailable = true;
                if (checkStartMinutes !== null && checkEndMinutes !== null) {
                    if (typeof window.isSpecialistBusy === 'function') {
                        timeAvailable = !window.isSpecialistBusy(teacherId, checkStartMinutes, checkEndMinutes);
                    }
                }
                
                // Проверяем, оказывает ли специалист выбранную услугу (если услуга выбрана)
                var serviceMatch = true;
                if (specialistsForSelectedService !== null) {
                    serviceMatch = specialistsForSelectedService.indexOf(teacherId) !== -1;
                }
                
                if (timeAvailable && serviceMatch && !isNaN(teacherId)) {
                    availableTeacherIds.push(teacherId);
                    // Собираем направления доступных специалистов
                    dirs.forEach(function(dirId) {
                        availableDirectionIds.add(dirId);
                    });
                }
            });

            // 2) Проверка на конфликт: если оба выбраны, но не совместимы — сбрасываем противоположный
            if (selectedTeacherId && selectedDirectionId) {
                var selectedTeacherLi = teacherSelect.querySelector('ul.options li.selected');
                var teacherDirectionsRaw = selectedTeacherLi ? (selectedTeacherLi.getAttribute('data-directions') || '') : '';
                var teacherDirections = teacherDirectionsRaw ? teacherDirectionsRaw.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];

                if (teacherDirections.indexOf(String(selectedDirectionId)) === -1) {
                    if (teacherDirectionLastChanged === 'field-direction') {
                        resetSelect(teacherSelect);
                        selectedTeacherId = '';
                    } else {
                        resetSelect(directionSelect);
                        selectedDirectionId = '';
                    }
                }
            }

            // 3) Фильтрация направлений
            var visibleDirectionCount = 0;
            var lastVisibleDirectionLi = null;
            
            if (selectedTeacherId) {
                // Если выбран преподаватель — показываем только его направления
                var teacherLi = teacherSelect.querySelector('ul.options li.selected');
                var dirsRaw = teacherLi ? (teacherLi.getAttribute('data-directions') || '') : '';
                var allowedDirs = dirsRaw ? dirsRaw.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];

                directionLis.forEach(function (li) {
                    var dirId = li.getAttribute('data-value') || '';
                    var isVisible = allowedDirs.indexOf(String(dirId)) !== -1;
                    li.style.display = isVisible ? '' : 'none';
                    if (isVisible) {
                        visibleDirectionCount++;
                        lastVisibleDirectionLi = li;
                    }
                });
            } else {
                // Если преподаватель не выбран — показываем только направления доступных специалистов
                directionLis.forEach(function (li) {
                    var dirId = li.getAttribute('data-value') || '';
                    var isVisible = availableDirectionIds.has(dirId);
                    li.style.display = isVisible ? '' : 'none';
                    if (isVisible) {
                        visibleDirectionCount++;
                        lastVisibleDirectionLi = li;
                    }
                });
            }
            
            // 4) Обновляем состояние селекта направлений
            var dirSelectedSpan = directionSelect.querySelector('span.selected');
            if (visibleDirectionCount === 0) {
                // Нет доступных направлений
                directionSelect.classList.add('disabled');
                if (dirSelectedSpan) dirSelectedSpan.textContent = 'Нет доступных направлений';
            } else {
                directionSelect.classList.remove('disabled');
                if (!selectedDirectionId && dirSelectedSpan) {
                    dirSelectedSpan.textContent = 'Выберите направление';
                }
                
                // Авто-подстановка единственного направления
                if (visibleDirectionCount === 1 && !selectedDirectionId && lastVisibleDirectionLi) {
                    lastVisibleDirectionLi.classList.add('selected');
                    if (dirSelectedSpan) {
                        dirSelectedSpan.textContent = lastVisibleDirectionLi.textContent;
                    }
                    selectedDirectionId = lastVisibleDirectionLi.getAttribute('data-value');
                    syncClearableSelectState(directionSelect);
                }
            }

            // 5) Фильтрация преподавателей по выбранному направлению и доступности времени
            var visibleTeacherCount = 0;
            var lastVisibleTeacherLi = null;
            
            teacherLis.forEach(function (li) {
                var teacherId = parseInt(li.getAttribute('data-value'), 10);
                var dirsRaw = li.getAttribute('data-directions') || '';
                var dirs = dirsRaw ? dirsRaw.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];
                
                // Фильтр по направлению
                var directionMatch = !selectedDirectionId || dirs.indexOf(String(selectedDirectionId)) !== -1;
                
                // Фильтр по доступности времени
                var timeAvailable = availableTeacherIds.indexOf(teacherId) !== -1;
                
                var isVisible = directionMatch && timeAvailable;
                li.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    visibleTeacherCount++;
                    lastVisibleTeacherLi = li;
                }
            });
            
            // 6) Обновляем состояние селекта преподавателей
            var teacherSelectedSpan = teacherSelect.querySelector('span.selected');
            if (visibleTeacherCount === 0) {
                // Нет доступных специалистов
                teacherSelect.classList.add('disabled');
                teacherSelect.classList.remove('open');
                if (selectedTeacherId) {
                    teacherSelect.classList.add('has-selection');
                    var selectedLiStill = teacherSelect.querySelector('ul.options li.selected');
                    if (teacherSelectedSpan && selectedLiStill) {
                        teacherSelectedSpan.textContent = selectedLiStill.textContent;
                    }
                    syncClearableSelectState(teacherSelect);
                } else {
                    teacherSelect.classList.remove('has-selection');
                    teacherLis.forEach(function (li) {
                        li.classList.remove('selected');
                    });
                    selectedTeacherId = '';
                    if (teacherSelectedSpan) teacherSelectedSpan.textContent = 'Нет доступных преподавателей';
                    syncClearableSelectState(teacherSelect);
                    if (teacherWarning) teacherWarning.style.display = 'none';
                }
            } else {
                teacherSelect.classList.remove('disabled');
                if (!selectedTeacherId && teacherSelectedSpan) {
                    teacherSelectedSpan.textContent = 'Выберите преподавателя';
                }
                
                // Авто-подстановка единственного специалиста.
                // ВАЖНО: автоподстановка происходит ТОЛЬКО если время установлено и по временным
                // ограничениям доступен только один преподаватель. Без выбранного времени
                // автоподстановка не должна срабатывать.
                var timeIsSet = checkStartMinutes !== null && checkEndMinutes !== null;
                if (visibleTeacherCount === 1 && !selectedTeacherId && lastVisibleTeacherLi && timeIsSet) {
                    lastVisibleTeacherLi.classList.add('selected');
                    if (teacherSelectedSpan) {
                        teacherSelectedSpan.textContent = lastVisibleTeacherLi.textContent;
                    }
                    selectedTeacherId = lastVisibleTeacherLi.getAttribute('data-value');
                    syncClearableSelectState(teacherSelect);
                    
                    // Если у единственного специалиста одно направление — подставляем его тоже
                    var singleTeacherDirsRaw = lastVisibleTeacherLi.getAttribute('data-directions') || '';
                    var singleTeacherDirs = singleTeacherDirsRaw ? singleTeacherDirsRaw.split(',').map(function (v) { return v.trim(); }).filter(Boolean) : [];
                    if (singleTeacherDirs.length === 1 && !selectedDirectionId) {
                        var singleDirId = singleTeacherDirs[0];
                        directionLis.forEach(function (li) {
                            if (li.getAttribute('data-value') === singleDirId) {
                                li.classList.add('selected');
                                if (dirSelectedSpan) {
                                    dirSelectedSpan.textContent = li.textContent;
                                }
                                syncClearableSelectState(directionSelect);
                            }
                        });
                    }
                }
            }
            
            // 7) Проверка выбранного преподавателя на доступность
            if (selectedTeacherId && checkStartMinutes !== null && checkEndMinutes !== null) {
                var teacherIdInt = parseInt(selectedTeacherId, 10);
                var reasonInfo = null;
                if (typeof window.getSpecialistBusyReason === 'function') {
                    reasonInfo = window.getSpecialistBusyReason(teacherIdInt, checkStartMinutes, checkEndMinutes);
                }
                var isBusy = false;
                if (reasonInfo && reasonInfo.busy === true) {
                    isBusy = true;
                } else if (typeof window.isSpecialistBusy === 'function') {
                    isBusy = window.isSpecialistBusy(teacherIdInt, checkStartMinutes, checkEndMinutes);
                }

                if (isBusy) {
                    if (teacherWarning) teacherWarning.style.display = 'inline-block';
                    var tooltipEl = teacherWarning ? teacherWarning.querySelector('.warning-tooltip') : null;
                    if (tooltipEl) {
                        var msg = 'Этот преподаватель занят в выбранное время.';
                        if (reasonInfo && reasonInfo.reason === 'schedule') {
                            msg = reasonInfo.is_day_off ? 'Этот преподаватель не работает в выбранный день.' : 'Этот преподаватель не работает в выбранное время.';
                        }
                        tooltipEl.textContent = msg;
                    }
                } else {
                    if (teacherWarning) teacherWarning.style.display = 'none';
                }
            } else {
                if (teacherWarning) teacherWarning.style.display = 'none';
            }
            
            // Вызываем глобальную функцию для обновления состояния кнопки
            if (typeof window.updateSubmitButtonState === 'function') {
                window.updateSubmitButtonState();
            }
            
            // Фильтруем услуги преподавателей по доступным специалистам
            applySpecialistServicesFilter(availableTeacherIds, selectedTeacherId);
        }
        // Делаем функцию доступной глобально для вызова из других блоков кода
        window.applyTeacherDirectionFilters = applyTeacherDirectionFilters;
        
        /**
         * Фильтрация списка "Услуги преподавателей" по доступным специалистам.
         * 
         * Логика:
         * 1. Если выбран конкретный преподаватель — показываем только его услуги
         * 2. Если преподаватель не выбран — показываем услуги всех доступных специалистов
         * 3. Если у выбранного преподавателя только одна услуга — автоподстановка без плейсхолдера
         * 
         * @param {Array<number>} availableTeacherIds - ID доступных специалистов (по времени)
         * @param {string|number} selectedTeacherId - ID выбранного преподавателя (или пусто)
         */
        function applySpecialistServicesFilter(availableTeacherIds, selectedTeacherId) {
            var specialistServiceSelect = modalElement.querySelector('#specialist-service');
            if (!specialistServiceSelect) return;
            
            // Получаем маппинг услуга → специалисты из скрытого JSON элемента
            var mappingEl = document.getElementById('specialist_service_to_specialists_json');
            var serviceToSpecialists = {};
            if (mappingEl) {
                try {
                    serviceToSpecialists = JSON.parse(mappingEl.textContent || '{}');
                } catch (e) {
                    console.warn('Не удалось распарсить specialist_service_to_specialists_json:', e);
                }
            }
            
            var serviceLis = specialistServiceSelect.querySelectorAll('ul.options li');
            var visibleCount = 0;
            var lastVisibleLi = null;
            var selectedServiceId = getSelectedValue(specialistServiceSelect);
            
            // Определяем, какие специалисты учитываются при фильтрации услуг
            var relevantSpecialistIds = [];
            if (selectedTeacherId) {
                // Если выбран преподаватель — фильтруем по его услугам
                relevantSpecialistIds = [parseInt(selectedTeacherId, 10)];
            } else {
                // Иначе — по всем доступным специалистам
                relevantSpecialistIds = availableTeacherIds || [];
            }
            
            serviceLis.forEach(function(li) {
                var serviceId = li.getAttribute('data-value');
                // Получаем список специалистов, оказывающих эту услугу
                var specialistsForService = serviceToSpecialists[serviceId] || [];
                
                // Услуга видима, если хотя бы один из её специалистов доступен
                var isVisible = specialistsForService.some(function(specId) {
                    return relevantSpecialistIds.indexOf(specId) !== -1;
                });
                
                li.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    visibleCount++;
                    lastVisibleLi = li;
                }
            });
            
            var selectedSpan = specialistServiceSelect.querySelector('span.selected');
            var placeholder = specialistServiceSelect.getAttribute('data-placeholder') || 'Выберите услугу преподавателя';
            
            // Сбрасываем выбор, если выбранная услуга больше не видима
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
                // Нет доступных услуг
                specialistServiceSelect.classList.add('disabled');
                if (selectedSpan) selectedSpan.textContent = 'Нет доступных услуг';
                specialistServiceSelect.classList.remove('has-selection');
            } else if (visibleCount === 1 && !selectedServiceId) {
                // Автоподстановка единственной услуги (без плейсхолдера)
                specialistServiceSelect.classList.remove('disabled');
                lastVisibleLi.classList.add('selected');
                if (selectedSpan) {
                    // Берём только название услуги (без стоимости)
                    var serviceName = lastVisibleLi.querySelector('.service-name');
                    selectedSpan.textContent = serviceName ? serviceName.textContent : lastVisibleLi.textContent;
                }
                specialistServiceSelect.classList.add('has-selection');
                syncClearableSelectState(specialistServiceSelect);
            } else {
                // Несколько услуг доступно
                specialistServiceSelect.classList.remove('disabled');
                if (!selectedServiceId && selectedSpan) {
                    selectedSpan.textContent = placeholder;
                }
            }

            if (typeof window.updateSubmitButtonState === 'function') {
                window.updateSubmitButtonState();
            }

            if (typeof window.syncCreateBookingMusicSchoolTimeFields === 'function') {
                window.syncCreateBookingMusicSchoolTimeFields();
            }

            var blocksContainer = document.getElementById('bookingBlocksContainer');
            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
            blocks.forEach(function (b) {
                if (b && typeof b._bulkOnTariffChanged === 'function') {
                    b._bulkOnTariffChanged();
                }
            });
        }
        window.applySpecialistServicesFilter = applySpecialistServicesFilter;

        function applyServicesFilters() {
            var servicesSelect = modalElement.querySelector('#services');
            if (!servicesSelect) {
                return;
            }

            var roomIdField = modalElement.querySelector('#roomIdField');
            var currentRoomId = roomIdField ? String(roomIdField.value || '') : '';
            var currentScenarioId = (window.currentScenarioFilterId !== undefined && window.currentScenarioFilterId !== null)
                ? String(window.currentScenarioFilterId)
                : '';

            // Фильтрация + защита от дублей:
            // Если по какой-то причине одинаковые услуги оказались добавлены несколько раз, оставляем только одну.
            // Ключ: service_id + room_id + scenario_id
            var options = servicesSelect.querySelectorAll('ul.options li');
            var seen = new Map();

            Array.from(options).forEach(function (li) {
                if (!li) return;
                if (li.classList.contains('search-option') || String(li.id || '') === 'services-search-option') {
                    return;
                }
                var liRoomId = String(li.getAttribute('data-room-id') || '');
                var liScenarioId = String(li.getAttribute('data-scenario-id') || '');
                var liValue = String(li.getAttribute('data-value') || '');

                var dedupeKey = liValue + '|' + liRoomId + '|' + liScenarioId;
                if (seen.has(dedupeKey)) {
                    var kept = seen.get(dedupeKey);

                    // Если выбран дубль, а сохранённый элемент не выбран — переносим выбранность на сохранённый.
                    if (li.classList.contains('selected') && kept && !kept.classList.contains('selected')) {
                        kept.classList.add('selected');

                        if (servicesSelect._selectedOptions) {
                            servicesSelect._selectedOptions.add(kept);
                            servicesSelect._selectedOptions.delete(li);
                        }
                    }

                    if (li.parentNode) {
                        li.parentNode.removeChild(li);
                    }
                    return;
                }
                seen.set(dedupeKey, li);

                var roomOk = !liRoomId || !currentRoomId || liRoomId === currentRoomId;
                var scenarioOk = !currentScenarioId || liScenarioId === currentScenarioId;

                if (roomOk && scenarioOk) {
                    li.removeAttribute('data-filter-hidden');
                } else {
                    li.setAttribute('data-filter-hidden', '1');
                }
            });

            if (servicesSelect._selectedOptions && servicesSelect._selectedOptions.size) {
                var changed = false;
                Array.from(servicesSelect._selectedOptions).forEach(function (opt) {
                    if (String(opt.getAttribute('data-filter-hidden') || '') === '1') {
                        opt.classList.remove('selected');
                        servicesSelect._selectedOptions.delete(opt);
                        changed = true;
                    }
                });

                if (changed && typeof servicesSelect._updateSelectedText === 'function') {
                    servicesSelect._updateSelectedText();
                }
            }

            if (typeof servicesSelect._applyServicesSearchFilter === 'function') {
                servicesSelect._applyServicesSearchFilter();
            } else {
                if (typeof servicesSelect._applyServicesVisibility === 'function') {
                    servicesSelect._applyServicesVisibility();
                }
                if (typeof servicesSelect._reorderServicesOptions === 'function') {
                    servicesSelect._reorderServicesOptions();
                }
            }
        }

        applyServicesFilters();

        // --------------------------
        // Инициализация кастомных селектов
        // --------------------------
        // Один глобальный обработчик закрытия по клику вне селекта (без навешивания N одинаковых слушателей)
        if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.ensureCloseOnOutsideClick === 'function') {
            window.BookingSelectsUtils.ensureCloseOnOutsideClick({
                key: 'createBookingModal',
                rootEl: modalElement
            });
        }

        var closeAll = function () {
            modalElement.querySelectorAll('.custom-select.open').forEach(function (s) {
                s.classList.remove('open');
            });
        };

        ['start-time', 'end-time', 'duration'].forEach(function (selectId) {
            var timeSelectEl = modalElement.querySelector('#' + selectId);
            if (!timeSelectEl) return;
            if (timeSelectEl._bookingTimeOpenBound) return;
            timeSelectEl._bookingTimeOpenBound = true;

            timeSelectEl.addEventListener('click', function (e) {
                if (timeSelectEl.classList.contains('disabled')) return;

                // Не перехватываем крестик очистки — у time-select'ов свой обработчик reset*
                var clearBtn = e.target && (e.target.closest ? e.target.closest('.custom-select-clear') : null);
                if (clearBtn) return;

                // Клик по li обрабатывается внутри BookingTimeUtils.*rebuild* (там же e.stopPropagation)
                if (e.target && e.target.tagName === 'LI') return;

                var wasOpen = timeSelectEl.classList.contains('open');
                closeAll();
                if (!wasOpen) {
                    timeSelectEl.classList.add('open');
                }
            });
        });

        var servicesSelect = modalElement.querySelector('#services');
        if (servicesSelect) {
            var servicesOptionsContainer = servicesSelect.querySelector('.options');
            if (servicesOptionsContainer) {
                if (window.BookingServicesUtils && typeof window.BookingServicesUtils.bindServicesMultiSelect === 'function') {
                    window.BookingServicesUtils.bindServicesMultiSelect({
                        selectEl: servicesSelect,
                        optionsContainerEl: servicesOptionsContainer,
                        placeholderText: 'Выберите услугу',
                        resetBtnId: 'create-reset-services',
                        searchInputSelector: '#services-search-input',
                        searchOptionId: 'services-search-option',
                        focusSearchOnOpen: true,
                        onSelectionChanged: function () {
                            if (typeof window.updateServicesBadges === 'function') {
                                window.updateServicesBadges();
                            }
                            if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                window.calculateAndUpdateBookingCost();
                            }
                        }
                    });
                    if (typeof window.updateServicesBadges === 'function') {
                        window.updateServicesBadges();
                    }
                    if (typeof window.calculateAndUpdateBookingCost === 'function') {
                        window.calculateAndUpdateBookingCost();
                    }

                    applyServicesFilters();
                }
            }
        }

        if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.bindSelectsInRoot === 'function') {
            window.BookingSelectsUtils.bindSelectsInRoot({
                rootEl: modalElement,
                closeAll: closeAll,
                closeOthersOnOpen: false,
                skipSelectIds: ['services', 'start-time', 'end-time', 'duration'],
                selectConfigs: {
                    'client': {
                        ignoreOptionIds: ['search-option'],
                        searchInputSelector: '#client-search-input',
                        searchOptionId: 'search-option',
                        focusSearchOnOpen: true,
                        clearSearchOnSelect: true,
                        onSelected: function () {
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        },
                        onCleared: function () {
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        }
                    },
                    'contact-person': {
                        onSelected: function () {
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        },
                        onCleared: function () {
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        }
                    },
                    'teacher': {
                        onSelected: function () {
                            teacherDirectionLastChanged = 'teacher';
                            var blocksContainer = document.getElementById('bookingBlocksContainer');
                            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
                            blocks.forEach(function (b) {
                                if (b && typeof b._bulkTimeControllerRebuildAll === 'function') {
                                    b._bulkTimeControllerRebuildAll();
                                }
                            });
                            var modalEl = document.getElementById('createBookingModal');
                            var singleCtrl = modalEl ? modalEl._createSingleTimeController : null;
                            if (singleCtrl && typeof singleCtrl.rebuildAll === 'function') {
                                singleCtrl.rebuildAll();
                            }
                            applyTeacherDirectionFilters();
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        },
                        onCleared: function () {
                            teacherDirectionLastChanged = 'teacher';
                            var blocksContainer = document.getElementById('bookingBlocksContainer');
                            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
                            blocks.forEach(function (b) {
                                if (b && typeof b._bulkTimeControllerRebuildAll === 'function') {
                                    b._bulkTimeControllerRebuildAll();
                                }
                            });
                            var modalEl = document.getElementById('createBookingModal');
                            var singleCtrl = modalEl ? modalEl._createSingleTimeController : null;
                            if (singleCtrl && typeof singleCtrl.rebuildAll === 'function') {
                                singleCtrl.rebuildAll();
                            }
                            applyTeacherDirectionFilters();
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        }
                    },
                    'field-direction': {
                        onSelected: function () {
                            teacherDirectionLastChanged = 'field-direction';
                            applyTeacherDirectionFilters();
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        },
                        onCleared: function () {
                            teacherDirectionLastChanged = 'field-direction';
                            applyTeacherDirectionFilters();
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        }
                    },
                    'specialist-service': {
                        onSelected: function () {
                            teacherDirectionLastChanged = 'specialist-service';
                            applyTeacherDirectionFilters();
                            if (typeof window.syncCreateBookingMusicSchoolTimeFields === 'function') {
                                window.syncCreateBookingMusicSchoolTimeFields();
                            }
                            var blocksContainer = document.getElementById('bookingBlocksContainer');
                            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
                            blocks.forEach(function (b) {
                                if (b && typeof b._bulkOnTariffChanged === 'function') {
                                    b._bulkOnTariffChanged();
                                }
                            });
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        },
                        beforeClear: function (ctx) {
                            var selectEl = ctx ? ctx.selectEl : null;
                            if (!selectEl) return;
                            var visibleServices = Array.from(selectEl.querySelectorAll('ul.options li')).filter(function (li) {
                                return li.style.display !== 'none';
                            });
                            if (visibleServices.length === 1) {
                                return false;
                            }
                        },
                        onCleared: function (ctx) {
                            teacherDirectionLastChanged = ctx && ctx.selectEl ? ctx.selectEl.id : 'specialist-service';
                            applyTeacherDirectionFilters();
                            if (typeof window.syncCreateBookingMusicSchoolTimeFields === 'function') {
                                window.syncCreateBookingMusicSchoolTimeFields();
                            }
                            var blocksContainer = document.getElementById('bookingBlocksContainer');
                            var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
                            blocks.forEach(function (b) {
                                if (b && typeof b._bulkOnTariffChanged === 'function') {
                                    b._bulkOnTariffChanged();
                                }
                            });
                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        }
                    },
                    'tariff': {
                        beforeClear: function (ctx) {
                            var selectEl = ctx ? ctx.selectEl : null;
                            if (!selectEl) return;
                            if (selectEl.classList.contains('disabled')) {
                                return false;
                            }
                            var visibleTariffs = Array.from(selectEl.querySelectorAll('ul.options li')).filter(function (li) {
                                return li.style.display !== 'none';
                            });
                            if (visibleTariffs.length === 1) {
                                return false;
                            }
                        },
                        onSelected: function () {
                            if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                window.calculateAndUpdateBookingCost();
                            }
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }

                            if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                                window.syncCreateBookingTariffTimeFields();
                            }

                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        },
                        onCleared: function () {
                            if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                window.calculateAndUpdateBookingCost();
                            }
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }

                            if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                                window.syncCreateBookingTariffTimeFields();
                            }

                            if (typeof window.refreshCreateBookingOpenDatepickersScenarioHighlight === 'function') {
                                window.refreshCreateBookingOpenDatepickersScenarioHighlight();
                            }
                        }
                    }
                }
            });
        }

        if (!window.__createBookingClientAddedListenerAttached) {
            window.__createBookingClientAddedListenerAttached = true;
            document.addEventListener('booking:client-added', function (event) {
                var clientData = event && event.detail ? event.detail : null;
                if (!clientData || !clientData.id || !clientData.name) {
                    return;
                }

                var clientSelect = document.getElementById('client');
                if (!clientSelect) {
                    return;
                }

                var optionsContainer = clientSelect.querySelector('ul.options');
                if (!optionsContainer) {
                    return;
                }

                var clientId = String(clientData.id);
                var existing = optionsContainer.querySelector('li[data-type="client"][data-value="' + clientId + '"]');

                if (!existing) {
                    existing = document.createElement('li');
                    existing.setAttribute('data-value', clientId);
                    existing.setAttribute('data-type', 'client');

                    var searchOption = optionsContainer.querySelector('#search-option');
                    var insertBeforeEl = searchOption ? searchOption.nextElementSibling : optionsContainer.firstElementChild;
                    if (insertBeforeEl) {
                        optionsContainer.insertBefore(existing, insertBeforeEl);
                    } else {
                        optionsContainer.appendChild(existing);
                    }
                }

                existing.textContent = clientData.name;

                var bookingModalEl = document.getElementById('createBookingModal');
                if (bookingModalEl && bookingModalEl.classList.contains('show')) {
                    if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.selectOption === 'function') {
                        window.BookingSelectsUtils.selectOption({
                            selectEl: clientSelect,
                            optionEl: existing,
                            ignoreOptionIds: ['search-option'],
                            onSelected: function () {
                                var searchInput = clientSelect.querySelector('#client-search-input');
                                if (searchInput) {
                                    searchInput.value = '';
                                }
                                optionsContainer.querySelectorAll('li').forEach(function (opt) {
                                    if (opt.id === 'search-option') return;
                                    opt.style.display = '';
                                });
                                if (typeof window.updateSubmitButtonState === 'function') {
                                    window.updateSubmitButtonState();
                                }
                            }
                        });
                    } else {
                        var selectedSpan = clientSelect.querySelector('span.selected');
                        if (selectedSpan) {
                            var currentOptionsList = optionsContainer.querySelectorAll('li');
                            currentOptionsList.forEach(function (opt) {
                                if (opt.id !== 'search-option') {
                                    opt.classList.remove('selected');
                                }
                            });
                            existing.classList.add('selected');
                            selectedSpan.textContent = existing.textContent;
                            if (typeof syncClearableSelectState === 'function') {
                                syncClearableSelectState(clientSelect);
                            }
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        }
                    }
                }
            });
        }

        // При закрытии модалки сбрасываем связанные селекты и фильтры, чтобы при следующем открытии не оставались скрытые элементы
        modalElement.addEventListener('hidden.bs.modal', function () {
            teacherDirectionLastChanged = null;
            resetTeacherDirectionUI();
            
            // Сбрасываем услугу преподавателя
            var specialistServiceSelect = document.getElementById('specialist-service');
            if (specialistServiceSelect) {
                var specOptions = specialistServiceSelect.querySelectorAll('ul.options li');
                specOptions.forEach(function (opt) {
                    opt.classList.remove('selected');
                });
                var specSelectedSpan = specialistServiceSelect.querySelector('span.selected');
                if (specSelectedSpan) {
                    specSelectedSpan.textContent = 'Выберите услугу преподавателя';
                }
                specialistServiceSelect.classList.remove('has-selection');
            }

            var peopleCountInput = document.getElementById('people-count');
            if (peopleCountInput) {
                peopleCountInput.value = '';
            }
        });

        // При открытии гарантируем корректную фильтрацию (на случай, если есть предустановленные значения)
        modalElement.addEventListener('shown.bs.modal', function () {
            applyTeacherDirectionFilters();
            applyServicesFilters();
            if (typeof window.syncCreateBookingTariffs === 'function') {
                window.syncCreateBookingTariffs();
            }
        });
        
        // Функция сброса всех селектов в модалке
        function resetAllSelects() {
            var selectsToReset = ['client', 'teacher', 'field-direction', 'tariff', 'duration', 'start-time', 'end-time'];
            selectsToReset.forEach(function (selectId) {
                var select = document.getElementById(selectId);
                if (!select) return;
                
                // Снимаем selected со всех опций
                var options = select.querySelectorAll('ul.options li');
                options.forEach(function (opt) {
                    if (opt.id !== 'search-option') {
                        opt.classList.remove('selected');
                    }
                });
                
                // Сбрасываем текст на placeholder
                var selectedSpan = select.querySelector('span.selected');
                var placeholder = select.getAttribute('data-placeholder');
                if (selectedSpan) {
                    if (selectId === 'client') {
                        selectedSpan.textContent = 'Выберите клиента';
                    } else if (selectId === 'teacher') {
                        selectedSpan.textContent = 'Выберите преподавателя';
                    } else if (selectId === 'field-direction') {
                        selectedSpan.textContent = 'Выберите направление';
                    } else if (selectId === 'tariff') {
                        selectedSpan.textContent = 'Выберите тариф';
                    } else if (selectId === 'duration') {
                        selectedSpan.textContent = 'Выберите длительность';
                    } else if (selectId === 'start-time') {
                        selectedSpan.textContent = 'Начало';
                    } else if (selectId === 'end-time') {
                        selectedSpan.textContent = 'Конец';
                    } else if (placeholder) {
                        selectedSpan.textContent = placeholder;
                    }
                }
                
                // Обновляем состояние кнопки очистки для clearable селектов
                if (typeof syncClearableSelectState === 'function') {
                    syncClearableSelectState(select);
                }
            });
            
            // Сбрасываем услуги
            var servicesSelect = document.getElementById('services');
            if (servicesSelect && servicesSelect._selectedOptions) {
                servicesSelect._selectedOptions.clear();
                var servicesOptions = servicesSelect.querySelectorAll('ul.options li');
                servicesOptions.forEach(function (opt) {
                    opt.classList.remove('selected');
                });
                var servicesSelectedSpan = servicesSelect.querySelector('span.selected');
                if (servicesSelectedSpan) {
                    servicesSelectedSpan.textContent = 'Выберите услугу';
                }
            }
            // Сбрасываем бейджи услуг
            var servicesBadgesContainer = document.getElementById('create-selected-services');
            if (servicesBadgesContainer) {
                servicesBadgesContainer.innerHTML = '';
            }
            var resetServicesBtn = document.getElementById('create-reset-services');
            if (resetServicesBtn) {
                resetServicesBtn.style.display = 'none';
            }
            
            // Сбрасываем услугу преподавателя
            var specialistServiceSelect = document.getElementById('specialist-service');
            if (specialistServiceSelect) {
                var specOptions = specialistServiceSelect.querySelectorAll('ul.options li');
                specOptions.forEach(function (opt) {
                    opt.classList.remove('selected');
                });
                var specSelectedSpan = specialistServiceSelect.querySelector('span.selected');
                if (specSelectedSpan) {
                    specSelectedSpan.textContent = 'Выберите услугу преподавателя';
                }
                specialistServiceSelect.classList.remove('has-selection');
            }
            
            // Сбрасываем комментарий
            var commentField = document.getElementById('bookingComment');
            if (commentField) {
                commentField.value = '';
            }

            var peopleCountInput = document.getElementById('people-count');
            if (peopleCountInput) {
                peopleCountInput.value = '';
            }
            // Сбрасываем счётчик символов
            var commentCounter = document.getElementById('bookingCommentCounter');
            if (commentCounter) {
                commentCounter.textContent = '0/1000';
            }

            var costElement = document.getElementById('bookingCostValue');
            if (costElement) {
                costElement.textContent = '0 BYN';
            }

            var startTimeWarning = document.getElementById('start-time-warning-icon');
            var endTimeWarning = document.getElementById('end-time-warning-icon');
            var teacherWarning = document.getElementById('teacher-warning-icon');
            var submitWarning = document.getElementById('submit-warning-icon');
            if (startTimeWarning) startTimeWarning.style.display = 'none';
            if (endTimeWarning) endTimeWarning.style.display = 'none';
            if (teacherWarning) teacherWarning.style.display = 'none';
            if (submitWarning) submitWarning.style.display = 'none';
            
            // Сбрасываем глобальные переменные времени
            window.currentStartTimeMinutes = null;
            window.currentEndTimeMinutes = null;
            window.currentSelectedPeriods = null;

            var tariffSelect = document.getElementById('tariff');
            if (tariffSelect) {
                tariffSelect._tariffsLastRequestKey = null;
                var tariffOptions = tariffSelect.querySelector('ul.options');
                if (tariffOptions) {
                    tariffOptions.innerHTML = '';
                }

                setTariffSelectDisabled(tariffSelect, 'Выберите время начала');
            }
        }

        window.resetCreateBookingModalSelects = resetAllSelects;

        // --- Обработчик отправки формы создания брони ---
        var submitBtn = document.getElementById('createBookingSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                submitCreateBookingForm();
            });
        }

        // Функция отправки формы создания брони
        function submitCreateBookingForm() {
            var form = document.getElementById('bookingForm');
            if (!form) return;

            function abortWithErrors() {
                if (typeof window.updateSubmitButtonState === 'function') {
                    window.updateSubmitButtonState();
                }
                if (typeof window.scrollToFirstBulkBookingError === 'function') {
                    window.scrollToFirstBulkBookingError();
                }
            }

            // Собираем данные формы
            var formData = new FormData();

            // CSRF token
            var csrfToken = form.querySelector('[name="csrfmiddlewaretoken"]');
            if (csrfToken) {
                formData.append('csrfmiddlewaretoken', csrfToken.value);
            }

            // Scenario ID (из глобальной переменной)
            if (window.currentScenarioFilterId) {
                formData.append('scenario_id', window.currentScenarioFilterId);
            }

            // Room ID
            var roomIdField = document.getElementById('roomIdField');
            if (roomIdField && roomIdField.value) {
                formData.append('room_id', roomIdField.value);
            }

            // Client ID или Client Group ID (в зависимости от типа выбранного элемента)
            var clientSelect = document.getElementById('client');
            if (clientSelect) {
                var selectedClient = clientSelect.querySelector('ul.options li.selected:not(#search-option)');
                if (selectedClient && selectedClient.getAttribute('data-value')) {
                    var selectionType = selectedClient.getAttribute('data-type') || 'client';
                    if (selectionType === 'group') {
                        formData.append('client_group_id', selectedClient.getAttribute('data-value'));
                    } else {
                        formData.append('client_id', selectedClient.getAttribute('data-value'));
                    }
                }
            }

            // Specialist ID (преподаватель)
            var teacherSelect = document.getElementById('teacher');
            if (teacherSelect) {
                var selectedTeacher = teacherSelect.querySelector('ul.options li.selected');
                if (selectedTeacher) {
                    formData.append('specialist_id', selectedTeacher.getAttribute('data-value'));
                }
            }

            // Direction ID (направление)
            var directionSelect = document.getElementById('field-direction');
            if (directionSelect) {
                var selectedDirection = directionSelect.querySelector('ul.options li.selected');
                if (selectedDirection) {
                    formData.append('direction_id', selectedDirection.getAttribute('data-value'));
                }
            }

            var specialistServiceSelect = document.getElementById('specialist-service');
            if (specialistServiceSelect) {
                var selectedSpecialistService = specialistServiceSelect.querySelector('ul.options li.selected');
                if (selectedSpecialistService) {
                    formData.append('specialist_service_id', selectedSpecialistService.getAttribute('data-value'));
                }
            }

            var peopleCountInput = document.getElementById('people-count');
            if (peopleCountInput) {
                var peopleCountVal = String(peopleCountInput.value || '').trim();
                if (peopleCountVal) {
                    var pcInt = parseInt(peopleCountVal, 10);
                    if (Number.isFinite(pcInt) && pcInt >= 1) {
                        formData.append('people_count', String(pcInt));
                    }
                }
            }

            function normalizeCostText(text) {
                return String(text || '').replace(/[^\d.,]/g, '').replace(',', '.');
            }

            function parseTimeToMinutes(hm) {
                if (window.BookingModalUtils && typeof window.BookingModalUtils.parseHmToMinutes === 'function') {
                    return window.BookingModalUtils.parseHmToMinutes(hm);
                }
                var s = String(hm || '').trim();
                if (!s) return null;
                var parts = s.split(':');
                if (parts.length < 2) return null;
                var h = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
                return (h * 60) + m;
            }

            function getBlockMinMinutes(blockEl) {
                var isRepPointScenario = window.currentScenarioName === 'Репетиционная точка';
                var isMusicClassScenario = window.currentScenarioName === 'Музыкальный класс';
                var isTariffScenario = isRepPointScenario || isMusicClassScenario;

                if (isTariffScenario) {
                    var tariffSelect = blockEl ? blockEl.querySelector('.custom-select[id^="tariff"]') : null;
                    var selectedTariff = tariffSelect ? tariffSelect.querySelector('ul.options li.selected') : null;
                    if (selectedTariff) {
                        var v = parseInt(selectedTariff.getAttribute('data-base-duration-minutes') || '0', 10);
                        if (Number.isFinite(v) && v > 0) {
                            return v;
                        }
                    }
                }

                var sid = (window.currentScenarioFilterId !== undefined && window.currentScenarioFilterId !== null)
                    ? String(window.currentScenarioFilterId)
                    : '';
                if (sid && window.BookingTimeUtils && typeof window.BookingTimeUtils.getScenarioMinDurationMinutes === 'function') {
                    var mm = window.BookingTimeUtils.getScenarioMinDurationMinutes(sid);
                    if (Number.isFinite(mm) && mm > 0) {
                        return mm;
                    }
                }
                if (typeof window.getScenarioMinDurationMinutes === 'function') {
                    var mm2 = window.getScenarioMinDurationMinutes();
                    if (Number.isFinite(mm2) && mm2 > 0) {
                        return mm2;
                    }
                }
                return 60;
            }

            function formatDurationMinutesToHHMM(totalMinutes) {
                var n = parseInt(totalMinutes || '0', 10);
                if (!Number.isFinite(n) || n <= 0) return '';
                if (window.BookingTimeUtils && typeof window.BookingTimeUtils.formatDurationHHMM === 'function') {
                    return window.BookingTimeUtils.formatDurationHHMM(n);
                }
                var h = Math.floor(n / 60);
                var m = n % 60;
                return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            }

            function buildBlockPayload(blockEl) {
                var dateInput = blockEl ? blockEl.querySelector('input[id^="modal-create-date"]') : null;
                var dateIso = dateInput ? String(dateInput.value || '').trim() : '';

                var state = (blockEl && blockEl._bulkTimeState) ? blockEl._bulkTimeState : {};
                var startMinutes = (state.startMinutes !== undefined) ? state.startMinutes : null;
                var endMinutes = (state.endMinutes !== undefined) ? state.endMinutes : null;
                var selectedPeriods = (state.selectedPeriods !== undefined) ? state.selectedPeriods : null;

                var startTimeSelectEl = blockEl ? blockEl.querySelector('.custom-select[id^="start-time"]') : null;
                var endTimeSelectEl = blockEl ? blockEl.querySelector('.custom-select[id^="end-time"]') : null;
                var durationSelectEl = blockEl ? blockEl.querySelector('.custom-select[id^="duration"]') : null;

                var startSelected = startTimeSelectEl ? startTimeSelectEl.querySelector('ul.options li.selected') : null;
                var endSelected = endTimeSelectEl ? endTimeSelectEl.querySelector('ul.options li.selected') : null;
                var durationSelected = durationSelectEl ? durationSelectEl.querySelector('ul.options li.selected') : null;

                if ((startMinutes === null || startMinutes === undefined) && startSelected) {
                    var smRaw = startSelected.getAttribute('data-minutes');
                    var sm = smRaw !== null && smRaw !== undefined ? parseInt(smRaw, 10) : null;
                    if (!Number.isFinite(sm)) {
                        sm = parseTimeToMinutes(startSelected.getAttribute('data-value') || startSelected.textContent);
                    }
                    startMinutes = Number.isFinite(sm) ? sm : startMinutes;
                }

                if ((endMinutes === null || endMinutes === undefined) && endSelected) {
                    var emRaw = endSelected.getAttribute('data-minutes');
                    var em = emRaw !== null && emRaw !== undefined ? parseInt(emRaw, 10) : null;
                    if (!Number.isFinite(em)) {
                        em = parseTimeToMinutes(endSelected.getAttribute('data-value') || endSelected.textContent);
                    }
                    endMinutes = Number.isFinite(em) ? em : endMinutes;
                }

                if ((selectedPeriods === null || selectedPeriods === undefined) && durationSelected) {
                    var p = parseInt(durationSelected.getAttribute('data-periods') || '', 10);
                    if (Number.isFinite(p) && p >= 1) {
                        selectedPeriods = p;
                    }
                }

                var fullDatetime = '';
                if (dateIso && startMinutes !== null && startMinutes !== undefined) {
                    fullDatetime = dateIso + ' ' + formatMinutesToHHMM(startMinutes) + ':00';
                }

                var durationStr = '';
                if (durationSelected) {
                    durationStr = durationSelected.getAttribute('data-value') || '';
                }
                if (!durationStr &&
                    startMinutes !== null && startMinutes !== undefined &&
                    endMinutes !== null && endMinutes !== undefined &&
                    endMinutes > startMinutes
                ) {
                    durationStr = formatDurationMinutesToHHMM(endMinutes - startMinutes);
                } else if (!durationStr && selectedPeriods !== null && selectedPeriods !== undefined) {
                    var minMinutes = getBlockMinMinutes(blockEl);
                    var totalMinutes = parseInt(selectedPeriods, 10) * parseInt(minMinutes, 10);
                    durationStr = formatDurationMinutesToHHMM(totalMinutes);
                }

                var services = [];
                var servicesSelect = blockEl ? blockEl.querySelector('.custom-select[id^="services"]') : null;
                if (servicesSelect && servicesSelect._selectedOptions) {
                    Array.from(servicesSelect._selectedOptions).forEach(function (li) {
                        var serviceId = li.getAttribute('data-value');
                        if (serviceId) {
                            services.push(String(serviceId));
                        }
                    });
                }

                var tariffId = '';
                var tariffSelect = blockEl ? blockEl.querySelector('.custom-select[id^="tariff"]') : null;
                if (tariffSelect) {
                    var selectedTariff = tariffSelect.querySelector('ul.options li.selected');
                    if (selectedTariff) {
                        tariffId = String(selectedTariff.getAttribute('data-value') || '');
                    }
                }

                var comment = '';
                var commentField = blockEl ? blockEl.querySelector('textarea[id^="bookingComment"]') : null;
                if (commentField && commentField.value) {
                    comment = String(commentField.value);
                }

                var totalCost = '';
                var costElement = blockEl ? blockEl.querySelector('[id^="bookingCostValue"]') : null;
                if (costElement) {
                    totalCost = normalizeCostText(costElement.textContent);
                }

                return {
                    full_datetime: fullDatetime,
                    duration: durationStr,
                    services: services,
                    tariff_id: tariffId,
                    total_cost: totalCost,
                    comment: comment
                };
            }

            var blocksContainer = document.getElementById('bookingBlocksContainer');
            var blockEls = blocksContainer ? blocksContainer.querySelectorAll('.booking-create-block') : [];
            var blocks = [];
            if (blockEls && blockEls.length) {
                Array.from(blockEls).forEach(function (blockEl) {
                    blocks.push(buildBlockPayload(blockEl));
                });
            }

            // Валидация обязательных полей
            // Для "Репетиционная точка" нужен либо клиент, либо группа
            var isRepPointScenario = window.currentScenarioName === 'Репетиционная точка';
            var hasClientOrGroup = formData.get('client_id') || formData.get('client_group_id');
            if (!hasClientOrGroup) {
                abortWithErrors();
                return;
            }

            var isMusicClassScenario = window.currentScenarioName === 'Музыкальный класс';
            var isPeopleCountScenario = isRepPointScenario || isMusicClassScenario;
            if (isPeopleCountScenario) {
                var peopleCountVal = formData.get('people_count');
                if (!peopleCountVal) {
                    abortWithErrors();
                    return;
                }
                var pcInt = parseInt(String(peopleCountVal), 10);
                if (!Number.isFinite(pcInt) || pcInt < 1 || pcInt > 99) {
                    abortWithErrors();
                    return;
                }
            }

            if (isPeopleCountScenario) {
                if (blocks && blocks.length) {
                    for (var bi = 0; bi < blocks.length; bi++) {
                        if (!blocks[bi] || !blocks[bi].tariff_id) {
                            abortWithErrors();
                            return;
                        }
                    }
                }
            }

            if (blocks && blocks.length) {
                for (var bi = 0; bi < blocks.length; bi++) {
                    if (!blocks[bi] || !blocks[bi].full_datetime) {
                        abortWithErrors();
                        return;
                    }
                    if (!blocks[bi] || !blocks[bi].duration) {
                        abortWithErrors();
                        return;
                    }
                }
            } else {
                abortWithErrors();
                return;
            }

            if (blocks.length > 1) {
                formData.append('blocks_json', JSON.stringify(blocks));
            } else {
                var b0 = blocks[0] || {};
                if (b0.full_datetime) {
                    formData.append('full_datetime', b0.full_datetime);
                }
                if (b0.duration) {
                    formData.append('duration', b0.duration);
                }
                if (b0.tariff_id) {
                    formData.append('tariff_id', b0.tariff_id);
                }
                if (Array.isArray(b0.services)) {
                    b0.services.forEach(function (serviceId) {
                        if (serviceId) {
                            formData.append('services', String(serviceId));
                        }
                    });
                }
                if (b0.total_cost) {
                    formData.append('total_cost', b0.total_cost);
                }
                if (b0.comment) {
                    formData.append('comment', b0.comment);
                }
            }

            // Отправка запроса
            var submitBtn = document.getElementById('createBookingSubmitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Сохранение...';
            }

            fetch('/create_booking/', {
                method: 'POST',
                body: formData
            })
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                if (data.success) {
                    if (typeof window.refreshBookingsGrid === 'function') {
                        try {
                            window.__suppressBookingsRefreshUntil = Date.now() + 6000;
                            window.refreshBookingsGrid({ silent: true });
                        } catch (e) {}
                    }

                    if (window.BookingModalUtils && typeof window.BookingModalUtils.refreshPendingRequestsCount === 'function') {
                        window.BookingModalUtils.refreshPendingRequestsCount();
                    }

                    // Закрываем модалку (данные обновятся автоматически через AJAX)
                    modalElement.addEventListener('hidden.bs.modal', function () {
                        var successEl = document.getElementById('bookingAddedSuccessModal');
                        if (!successEl) {
                            return;
                        }
                        var successModal = bootstrap.Modal.getOrCreateInstance(successEl);
                        successModal.show();
                    }, { once: true });

                    var modal = bootstrap.Modal.getOrCreateInstance(modalElement);
                    modal.hide();
                } else {
                    if (typeof window.applyBulkCreateBookingServerErrors === 'function') {
                        window.applyBulkCreateBookingServerErrors(data);
                    } else {
                        abortWithErrors();
                    }
                }
            })
            .catch(function (error) {
                if (typeof window.applyBulkCreateBookingServerErrors === 'function') {
                    window.applyBulkCreateBookingServerErrors({
                        success: false,
                        error: 'Ошибка сети: ' + (error && error.message ? error.message : 'Неизвестная ошибка'),
                        field: null,
                        errors: [
                            {
                                message: 'Ошибка сети: ' + (error && error.message ? error.message : 'Неизвестная ошибка'),
                                field: null,
                                block_index: null
                            }
                        ]
                    });
                } else {
                    abortWithErrors();
                }
            })
            .finally(function () {
                if (submitBtn) {
                    submitBtn.textContent = 'Добавить';
                }

                if (typeof window.updateSubmitButtonState === 'function') {
                    window.updateSubmitButtonState();
                } else if (submitBtn) {
                    submitBtn.disabled = false;
                }
            });
        }
    })();
