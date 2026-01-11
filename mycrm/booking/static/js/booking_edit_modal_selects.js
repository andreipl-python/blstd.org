    // Инициализация кастомных селектов модалки редактирования
    function getEditScenarioName() {
        var modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return '';
        var scenarioId = modalEl.getAttribute('data-scenario-id') || null;
        if (!scenarioId || !Array.isArray(window.SCENARIOS)) return '';
        var scenario = window.SCENARIOS.find(function (s) { return String(s.pk) === String(scenarioId); });
        return scenario && scenario.fields ? (scenario.fields.name || '') : '';
    }

    function isEditTariffScenario() {
        var name = getEditScenarioName();
        return name === 'Репетиционная точка' || name === 'Музыкальный класс';
    }

    function applyEditServicesFilters() {
        var modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return;

        var servicesSelect = modalEl.querySelector('#edit-services');
        if (!servicesSelect) return;

        var currentRoomId = '';
        try {
            if (typeof getSelectedValue === 'function') {
                currentRoomId = String(getSelectedValue(document.getElementById('edit-room')) || '').trim();
            }
        } catch (e) {
            currentRoomId = '';
        }

        var currentScenarioId = String(modalEl.getAttribute('data-scenario-id') || '').trim();

        var options = servicesSelect.querySelectorAll('ul.options li');
        Array.from(options).forEach(function (li) {
            if (!li) return;
            if (li.classList.contains('search-option') || String(li.id || '') === 'edit-services-search-option') {
                return;
            }

            var liRoomId = String(li.getAttribute('data-room-id') || '').trim();
            var liScenarioId = String(li.getAttribute('data-scenario-id') || '').trim();

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

    window.applyEditServicesFilters = applyEditServicesFilters;

    function syncEditClearableSelectState(selectEl) {
        if (!selectEl || !selectEl.classList || !selectEl.classList.contains('custom-select--clearable')) {
            return;
        }
        var hasSelected = !!selectEl.querySelector('ul.options li.selected');
        if (hasSelected) {
            selectEl.classList.add('has-selection');
        } else {
            selectEl.classList.remove('has-selection');
        }
    }

    function resetEditSelect(selectEl) {
        if (window.BookingModalUtils && typeof window.BookingModalUtils.resetSelect === 'function') {
            window.BookingModalUtils.resetSelect(selectEl);
            syncEditClearableSelectState(selectEl);
            return;
        }
        if (!selectEl) return;
        var span = selectEl.querySelector('span.selected');
        var placeholder = selectEl.getAttribute('data-placeholder') || (span ? span.textContent : '');
        selectEl.querySelectorAll('ul.options li.selected').forEach(function (li) {
            li.classList.remove('selected');
        });
        if (span) span.textContent = placeholder;
        syncEditClearableSelectState(selectEl);
    }

    function setEditTariffSelectDisabled(selectEl, text) {
        if (!selectEl) return;
        selectEl.classList.add('disabled');
        selectEl.classList.remove('open');
        selectEl.style.pointerEvents = 'none';
        var span = selectEl.querySelector('span.selected');
        if (span) {
            span.textContent = text || (selectEl.getAttribute('data-placeholder') || 'Выберите тариф');
        }
        selectEl.querySelectorAll('ul.options li').forEach(function (li) {
            li.classList.remove('selected');
        });
        syncEditClearableSelectState(selectEl);
        var ctrl = document.getElementById('editBookingModal')?._editTimeController;
        if (ctrl && typeof ctrl.syncTariffTimeFields === 'function') {
            ctrl.syncTariffTimeFields();
        }
    }

    function renderEditTariffOptions(selectEl, tariffs) {
        if (!selectEl) return;
        var optionsEl = selectEl.querySelector('ul.options');
        if (!optionsEl) return;

        var prevSelected = getSelectedValue(selectEl);
        var prefillId = selectEl._prefillTariffId ? String(selectEl._prefillTariffId) : '';

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
        selectEl.style.pointerEvents = '';

        var selectedSpan = selectEl.querySelector('span.selected');
        var placeholder = selectEl.getAttribute('data-placeholder') || 'Выберите тариф';

        var target = prevSelected || prefillId;
        var restore = target ? optionsEl.querySelector('li[data-value="' + String(target) + '"]') : null;
        if (restore) {
            selectEl._prefillTariffId = null;
            if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.selectOption === 'function') {
                window.BookingSelectsUtils.selectOption({
                    selectEl: selectEl,
                    optionEl: restore,
                    onSelected: function () {
                        var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                        if (ctrl && typeof ctrl.syncTariffTimeFields === 'function') {
                            ctrl.syncTariffTimeFields();
                        }
                        if (typeof calculateAndUpdateEditBookingCost === 'function') {
                            calculateAndUpdateEditBookingCost();
                        }
                        if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                            ctrl.updateSubmitButtonState();
                        }
                    }
                });
            } else {
                restore.classList.add('selected');
                if (selectedSpan) selectedSpan.textContent = restore.textContent;
                syncEditClearableSelectState(selectEl);
                var ctrl0 = document.getElementById('editBookingModal')?._editTimeController;
                if (ctrl0 && typeof ctrl0.syncTariffTimeFields === 'function') {
                    ctrl0.syncTariffTimeFields();
                }
            }
            return;
        }

        resetEditSelect(selectEl);
        if (selectedSpan) {
            selectedSpan.textContent = placeholder;
        }
        selectEl._prefillTariffId = null;

        var ctrl1 = document.getElementById('editBookingModal')?._editTimeController;
        if (ctrl1 && typeof ctrl1.syncTariffTimeFields === 'function') {
            ctrl1.syncTariffTimeFields();
        }

        if ((tariffs || []).length === 1) {
            var onlyLi = optionsEl.querySelector('li');
            if (onlyLi && window.BookingSelectsUtils && typeof window.BookingSelectsUtils.selectOption === 'function') {
                window.BookingSelectsUtils.selectOption({
                    selectEl: selectEl,
                    optionEl: onlyLi,
                    onSelected: function () {
                        var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                        if (ctrl && typeof ctrl.syncTariffTimeFields === 'function') {
                            ctrl.syncTariffTimeFields();
                        }
                        if (typeof calculateAndUpdateEditBookingCost === 'function') {
                            calculateAndUpdateEditBookingCost();
                        }
                        if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                            ctrl.updateSubmitButtonState();
                        }
                    }
                });
            }
        }
    }

    function syncEditBookingTariffs() {
        var selectEl = document.getElementById('edit-tariff');
        if (!selectEl) return;
        if (!isEditTariffScenario()) return;

        var modalEl = document.getElementById('editBookingModal');
        var scenarioId = modalEl ? String(modalEl.getAttribute('data-scenario-id') || '').trim() : '';
        var roomId = String(getSelectedValue(document.getElementById('edit-room')) || '').trim();
        var dateIso = String(document.getElementById('edit-date')?.value || '').trim();
        var startHm = String(getSelectedValue(document.getElementById('edit-start-time')) || '').trim();
        var peopleCount = String(document.getElementById('edit-people-count')?.value || '').trim();

        if (!scenarioId || !roomId || !dateIso || !startHm) {
            selectEl._tariffsLastRequestKey = null;
            setEditTariffSelectDisabled(selectEl, 'Выберите время начала');
            var ctrl0 = document.getElementById('editBookingModal')?._editTimeController;
            if (ctrl0 && typeof ctrl0.updateSubmitButtonState === 'function') {
                ctrl0.updateSubmitButtonState();
            }
            return;
        }

        if (!peopleCount) {
            selectEl._tariffsLastRequestKey = null;
            setEditTariffSelectDisabled(selectEl, 'Укажите количество людей');
            var ctrl1 = document.getElementById('editBookingModal')?._editTimeController;
            if (ctrl1 && typeof ctrl1.updateSubmitButtonState === 'function') {
                ctrl1.updateSubmitButtonState();
            }
            return;
        }

        var pcInt = parseInt(String(peopleCount), 10);
        if (!Number.isFinite(pcInt) || pcInt < 1) {
            selectEl._tariffsLastRequestKey = null;
            setEditTariffSelectDisabled(selectEl, 'Укажите количество людей');
            var ctrl1a = document.getElementById('editBookingModal')?._editTimeController;
            if (ctrl1a && typeof ctrl1a.updateSubmitButtonState === 'function') {
                ctrl1a.updateSubmitButtonState();
            }
            return;
        }

        var baseParams = {
            scenario_id: scenarioId,
            room_id: roomId,
            date_iso: dateIso,
            start_time_hm: startHm
        };

        var qs = new URLSearchParams(baseParams);
        qs.set('people_count', String(pcInt));

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
                setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
                return;
            }

            var tariffs = Array.isArray(data.tariffs) ? data.tariffs : [];
            if (!tariffs.length) {
                var fallbackKey = (new URLSearchParams(baseParams)).toString() + '|pc=' + String(pcInt);
                if (selectEl._tariffsLastFallbackKey === fallbackKey) {
                    setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
                    return;
                }
                selectEl._tariffsLastFallbackKey = fallbackKey;

                fetch('/booking/get-available-tariffs/?' + (new URLSearchParams(baseParams)).toString(), { method: 'GET' })
                    .then(function (r2) { return r2.json(); })
                    .then(function (d2) {
                        var tariffsAny = (d2 && d2.success && Array.isArray(d2.tariffs)) ? d2.tariffs : [];
                        if (!tariffsAny.length) {
                            setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
                            return;
                        }
                        var maxPeopleAny = 0;
                        tariffsAny.forEach(function (t) {
                            var mp = parseInt(String(t && t.max_people !== undefined ? t.max_people : '0'), 10);
                            if (Number.isFinite(mp) && mp > maxPeopleAny) maxPeopleAny = mp;
                        });
                        if (Number.isFinite(maxPeopleAny) && maxPeopleAny > 0 && pcInt > maxPeopleAny) {
                            setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов для такого количества людей');
                            return;
                        }
                        setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
                    })
                    .catch(function () {
                        setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
                    });
                return;
            }

            renderEditTariffOptions(selectEl, tariffs);
        })
        .catch(function () {
            setEditTariffSelectDisabled(selectEl, 'Нет доступных тарифов');
        })
        .finally(function () {
            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                ctrl.updateSubmitButtonState();
            }
        });
    }

    window.syncEditBookingTariffs = syncEditBookingTariffs;

    function initializeEditModalSelects() {
        const modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return;

        const closeAll = function () {
            modalEl.querySelectorAll('.custom-select.open').forEach(function (s) {
                s.classList.remove('open');
            });
        };

        if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.ensureCloseOnOutsideClick === 'function') {
            window.BookingSelectsUtils.ensureCloseOnOutsideClick({
                key: 'editBookingModal',
                rootEl: modalEl
            });
        }

        ['edit-start-time', 'edit-end-time', 'edit-duration'].forEach(function (selectId) {
            var timeSelectEl = modalEl.querySelector('#' + selectId);
            if (!timeSelectEl) return;
            if (timeSelectEl._bookingTimeOpenBound) return;
            timeSelectEl._bookingTimeOpenBound = true;

            timeSelectEl.addEventListener('click', function (e) {
                if (timeSelectEl.classList.contains('disabled')) return;

                var clearBtn = e.target && (e.target.closest ? e.target.closest('.custom-select-clear') : null);
                if (clearBtn) return;

                if (e.target && e.target.tagName === 'LI') return;

                var wasOpen = timeSelectEl.classList.contains('open');
                closeAll();
                if (!wasOpen) {
                    timeSelectEl.classList.add('open');
                }
            });
        });

        var servicesSelect = modalEl.querySelector('#edit-services');
        if (servicesSelect) {
            var servicesOptionsContainer = servicesSelect.querySelector('.options');
            if (servicesOptionsContainer) {
                if (window.BookingServicesUtils && typeof window.BookingServicesUtils.bindServicesMultiSelect === 'function') {
                    window.BookingServicesUtils.bindServicesMultiSelect({
                        selectEl: servicesSelect,
                        optionsContainerEl: servicesOptionsContainer,
                        placeholderText: 'Выберите услугу',
                        resetBtnId: 'reset-services',
                        searchInputSelector: '#edit-services-search-input',
                        searchOptionId: 'edit-services-search-option',
                        focusSearchOnOpen: true,
                        closeAll: closeAll,
                        onSelectionChanged: function () {
                            updateEditServicesBadges();
                            calculateAndUpdateEditBookingCost();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        }
                    });
                    updateEditServicesBadges();
                    calculateAndUpdateEditBookingCost();

                    applyEditServicesFilters();
                }
            }
        }

        if (window.BookingSelectsUtils && typeof window.BookingSelectsUtils.bindSelectsInRoot === 'function') {
            window.BookingSelectsUtils.bindSelectsInRoot({
                rootEl: modalEl,
                closeAll: closeAll,
                closeOthersOnOpen: true,
                skipSelectIds: ['edit-services', 'edit-start-time', 'edit-end-time', 'edit-duration'],
                selectConfigs: {
                    'edit-room': {
                        onSelected: function () {
                            const controller = ensureEditTimeController();
                            if (controller && typeof controller.handleRoomOrDateChange === 'function') {
                                controller.handleRoomOrDateChange();
                            }
                            applyEditServicesFilters();
                        }
                    },
                    'edit-direction': {
                        onSelected: function () {
                            if (typeof window.setEditTeacherDirectionLastChanged === 'function') {
                                window.setEditTeacherDirectionLastChanged('edit-direction');
                            }
                            applyEditTeacherDirectionFilters();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        },
                        onCleared: function () {
                            if (typeof window.setEditTeacherDirectionLastChanged === 'function') {
                                window.setEditTeacherDirectionLastChanged('edit-direction');
                            }
                            applyEditTeacherDirectionFilters();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        }
                    },
                    'edit-teacher': {
                        onSelected: function () {
                            if (typeof window.setEditTeacherDirectionLastChanged === 'function') {
                                window.setEditTeacherDirectionLastChanged('edit-teacher');
                            }
                            applyEditTeacherDirectionFilters();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        },
                        onCleared: function () {
                            if (typeof window.setEditTeacherDirectionLastChanged === 'function') {
                                window.setEditTeacherDirectionLastChanged('edit-teacher');
                            }
                            applyEditTeacherDirectionFilters();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        }
                    },
                    'edit-tariff': {
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
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.syncTariffTimeFields === 'function') {
                                ctrl.syncTariffTimeFields();
                            }
                            if (typeof calculateAndUpdateEditBookingCost === 'function') {
                                calculateAndUpdateEditBookingCost();
                            }
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        },
                        onCleared: function () {
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.syncTariffTimeFields === 'function') {
                                ctrl.syncTariffTimeFields();
                            }
                            if (typeof calculateAndUpdateEditBookingCost === 'function') {
                                calculateAndUpdateEditBookingCost();
                            }
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        }
                    },
                    'edit-specialist-service': {
                        onSelected: function () {
                            applyEditTeacherDirectionFilters();
                            calculateAndUpdateEditBookingCost();

                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.syncMusicSchoolTimeFields === 'function') {
                                ctrl.syncMusicSchoolTimeFields();
                            }
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
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
                        onCleared: function () {
                            calculateAndUpdateEditBookingCost();
                            applyEditTeacherDirectionFilters();
                            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                            if (ctrl && typeof ctrl.syncMusicSchoolTimeFields === 'function') {
                                ctrl.syncMusicSchoolTimeFields();
                            }
                            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                                ctrl.updateSubmitButtonState();
                            }
                        }
                    }
                }
            });
        }

        const resetServices = document.getElementById('reset-services');
        if (resetServices && !resetServices._bound && !(window.BookingServicesUtils && typeof window.BookingServicesUtils.bindServicesMultiSelect === 'function')) {
            resetServices._bound = true;
            resetServices.addEventListener('click', function (e) {
                e.preventDefault();
                setMultiSelectedValues(document.getElementById('edit-services'), []);
                calculateAndUpdateEditBookingCost();
                var rb = document.getElementById('reset-services');
                if (rb) rb.style.display = 'none';
                var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                    ctrl.updateSubmitButtonState();
                }
            });
        }

        const dateInput = document.getElementById('edit-date');
        if (dateInput && !dateInput._boundTimeRefresh) {
            dateInput._boundTimeRefresh = true;
            dateInput.addEventListener('change', function () {
                const controller = ensureEditTimeController();
                if (controller && typeof controller.handleRoomOrDateChange === 'function') {
                    controller.handleRoomOrDateChange();
                }
            });
        }

        const submitBtn = document.getElementById('editBookingSubmitBtn');
        if (submitBtn && !submitBtn._bound) {
            submitBtn._bound = true;
            submitBtn.addEventListener('click', submitEditBooking);
        }

        var peopleCountInput = document.getElementById('edit-people-count');
        if (peopleCountInput && !peopleCountInput._peopleCountBound) {
            peopleCountInput._peopleCountBound = true;
            peopleCountInput.addEventListener('input', function () {
                var raw = String(peopleCountInput.value || '');
                var digits = raw.replace(/\D+/g, '').slice(0, 2);
                if (digits) {
                    var n = parseInt(digits, 10);
                    if (Number.isFinite(n)) {
                        if (n > 99) n = 99;
                        if (n < 1) {
                            digits = '';
                        } else {
                        digits = String(n);
                        }
                    }
                }
                if (peopleCountInput.value !== digits) {
                    peopleCountInput.value = digits;
                }
                var ctrl = document.getElementById('editBookingModal')?._editTimeController;
                if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                    ctrl.updateSubmitButtonState();
                }
                if (typeof window.syncEditBookingTariffs === 'function') {
                    window.syncEditBookingTariffs();
                }
            });
        }
    }

    async function loadAndPrefillEditBookingModal() {
        const bookingId = window.currentBookingId;
        if (!bookingId) return;

        try {
            const response = await fetch(`/booking/get-booking-details/${bookingId}/`);
            if (!response.ok) {
                console.error('Не удалось получить детали брони для edit-модалки:', response.status);
                return;
            }
            const data = await response.json();
            if (!data.success || !data.booking) {
                console.error('Некорректный ответ при загрузке деталей брони для edit-модалки:', data);
                return;
            }
            prefillEditBookingModal(data.booking);
        } catch (err) {
            console.error('Ошибка при загрузке деталей брони для edit-модалки:', err);
        }
    }

    function prefillEditBookingModal(booking) {
        const modalEl = document.getElementById('editBookingModal');
        if (!modalEl) return;

        const publicIdEl = modalEl.querySelector('#publicID');
        if (publicIdEl) {
            publicIdEl.textContent = booking.id;
        }

        const scenarioNameEl = modalEl.querySelector('#scenarioName');
        if (scenarioNameEl) {
            scenarioNameEl.textContent = booking.reservation_type || '';
        }

        // Адаптируем модалку под сценарий
        if (typeof window.adaptEditModalForScenario === 'function') {
            window.adaptEditModalForScenario(booking.reservation_type);
        }

        var peopleCountInput = modalEl.querySelector('#edit-people-count');
        if (peopleCountInput) {
            var isSimplifiedScenario = (booking.reservation_type === 'Репетиционная точка' || booking.reservation_type === 'Музыкальный класс');
            peopleCountInput.value = isSimplifiedScenario && (booking.people_count !== undefined && booking.people_count !== null)
                ? String(booking.people_count)
                : '';
        }

        var editTariffSelect = modalEl.querySelector('#edit-tariff');
        if (editTariffSelect) {
            var isTariffScenario = (booking.reservation_type === 'Репетиционная точка' || booking.reservation_type === 'Музыкальный класс');
            editTariffSelect._prefillTariffId = isTariffScenario && booking.tariff_id ? String(booking.tariff_id) : '';
            editTariffSelect._tariffsLastRequestKey = null;
            if (isTariffScenario && typeof window.syncEditBookingTariffs === 'function') {
                window.syncEditBookingTariffs();
            }
        }

        // Отображаем клиента или группу в зависимости от типа брони
        const clientNameEl = modalEl.querySelector('#clientName');
        if (clientNameEl) {
            // Если есть группа и нет клиента - показываем группу
            if (booking.client_group_id && !booking.client_id) {
                clientNameEl.textContent = booking.client_group_name || 'Группа не указана';
            } else {
                clientNameEl.textContent = booking.client_name || '';
            }
        }

        const clientPhoneEl = modalEl.querySelector('#clientPhone');
        if (clientPhoneEl) {
            // Телефон показываем только для клиентов, для групп скрываем
            if (booking.client_group_id && !booking.client_id) {
                clientPhoneEl.style.display = 'none';
            } else {
                clientPhoneEl.style.display = '';
                clientPhoneEl.textContent = formatPhoneNumber(booking.client_phone || '');
            }
        }

        if (booking.scenario_id) {
            modalEl.setAttribute('data-scenario-id', booking.scenario_id);
        }

        const dateInput = modalEl.querySelector('#edit-date');
        if (dateInput && booking.date_iso) {
            dateInput.value = booking.date_iso;
        }

        // Инициализация датапикера с датой из брони
        initEditDatepicker(booking.date_iso);

        // Загрузка занятых специалистов на дату брони
        if (booking.date_iso) {
            loadEditBusySpecialistsForDate(booking.date_iso, function() { applyEditTeacherDirectionFilters(); });
        }

        setCustomSelectValue(modalEl.querySelector('#edit-direction'), booking.direction_id, 'Выберите направление');
        setCustomSelectValue(modalEl.querySelector('#edit-room'), booking.room_id, 'Выберите комнату');
        setCustomSelectValue(modalEl.querySelector('#edit-teacher'), booking.specialist_id, 'Выберите преподавателя');
        setCustomSelectValue(modalEl.querySelector('#edit-specialist-service'), booking.specialist_service_id, 'Выберите услугу преподавателя');

        const controller = ensureEditTimeController();
        if (controller && typeof controller.loadFromBooking === 'function') {
            controller.loadFromBooking(booking);
        }

        const commentEl = modalEl.querySelector('#editBookingComment');
        if (commentEl) {
            commentEl.value = booking.comment || '';
        }
        initCommentCounter();

        setMultiSelectedValues(modalEl.querySelector('#edit-services'), Array.isArray(booking.service_ids) ? booking.service_ids : []);

        applyEditServicesFilters();

        const costEl = modalEl.querySelector('#editBookingCostValue');
        if (costEl && booking.total_cost !== undefined && booking.total_cost !== null) {
            costEl.textContent = `${booking.total_cost} BYN`;
        }
        calculateAndUpdateEditBookingCost();
        setTimeout(function() {
            saveOriginalEditValues(booking);
        }, 150);
    }

    var originalEditValues = null;

    function saveOriginalEditValues(booking) {
        originalEditValues = {
            date_iso: booking.date_iso || '',
            start_time: String(booking.start_time_hm || booking.start_time || '').slice(0, 5),
            end_time: String(booking.end_time_hm || booking.end_time || '').slice(0, 5),
            room_id: String(booking.room_id || ''),
            specialist_id: String(booking.specialist_id || ''),
            direction_id: String(booking.direction_id || ''),
            specialist_service_id: String(booking.specialist_service_id || ''),
            tariff_id: (booking.tariff_id !== undefined && booking.tariff_id !== null) ? String(booking.tariff_id) : '',
            people_count: (booking.people_count !== undefined && booking.people_count !== null)
                ? String(booking.people_count)
                : '',
            comment: booking.comment || '',
            service_ids: (Array.isArray(booking.service_ids) ? booking.service_ids.map(String).sort() : []).join(',')
        };

        var ctrl = document.getElementById('editBookingModal')?._editTimeController;
        if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
            ctrl.updateSubmitButtonState();
        }
    }

    function getCurrentEditValues() {
        var dateInput = document.getElementById('edit-date');
        var startTimeSelect = document.getElementById('edit-start-time');
        var endTimeSelect = document.getElementById('edit-end-time');
        var roomSelect = document.getElementById('edit-room');
        var teacherSelect = document.getElementById('edit-teacher');
        var directionSelect = document.getElementById('edit-direction');
        var tariffSelect = document.getElementById('edit-tariff');
        var commentEl = document.getElementById('editBookingComment');
        var servicesSelect = document.getElementById('edit-services');
        var peopleCountInput = document.getElementById('edit-people-count');

        var currentServiceIds = [];
        if (servicesSelect) {
            Array.from(servicesSelect.querySelectorAll('ul.options li.selected')).forEach(function(li) {
                var val = li.getAttribute('data-value');
                if (val) currentServiceIds.push(String(val));
            });
        }
        currentServiceIds.sort();

        var specialistServiceSelect = document.getElementById('edit-specialist-service');
        var specialistServiceId = getSelectedValue(specialistServiceSelect) || '';

        return {
            date_iso: dateInput ? dateInput.value : '',
            start_time: getSelectedValue(startTimeSelect) || '',
            end_time: getSelectedValue(endTimeSelect) || '',
            room_id: String(getSelectedValue(roomSelect) || ''),
            specialist_id: String(getSelectedValue(teacherSelect) || ''),
            direction_id: String(getSelectedValue(directionSelect) || ''),
            specialist_service_id: String(specialistServiceId),
            tariff_id: String(getSelectedValue(tariffSelect) || ''),
            people_count: peopleCountInput ? String(peopleCountInput.value || '').trim() : '',
            comment: commentEl ? commentEl.value : '',
            service_ids: currentServiceIds.join(',')
        };
    }

    function hasEditChanges() {
        if (!originalEditValues) return false;

        var current = getCurrentEditValues();

        return (
            current.date_iso !== originalEditValues.date_iso ||
            current.start_time !== originalEditValues.start_time ||
            current.end_time !== originalEditValues.end_time ||
            current.room_id !== originalEditValues.room_id ||
            current.specialist_id !== originalEditValues.specialist_id ||
            current.direction_id !== originalEditValues.direction_id ||
            current.specialist_service_id !== originalEditValues.specialist_service_id ||
            current.tariff_id !== originalEditValues.tariff_id ||
            current.people_count !== originalEditValues.people_count ||
            current.comment !== originalEditValues.comment ||
            current.service_ids !== originalEditValues.service_ids
        );
    }

    window.hasEditChanges = hasEditChanges;

    // Функции показа/скрытия overlay сохранения
    function showBookingSavingOverlay() {
        var overlay = document.getElementById('booking-saving-overlay');
        if (overlay) overlay.classList.add('is-visible');
    }
    function hideBookingSavingOverlay() {
        var overlay = document.getElementById('booking-saving-overlay');
        if (overlay) overlay.classList.remove('is-visible');
    }

    async function submitEditBooking() {
        const bookingId = window.currentBookingId;
        if (!bookingId) return;

        // Показываем overlay сохранения
        showBookingSavingOverlay();

        const scenarioId = document.getElementById('editBookingModal')?.getAttribute('data-scenario-id') || null;
        if (!scenarioId) {
            console.error('Не удалось определить тип брони (scenario)');
            hideBookingSavingOverlay();
            return;
        }

        const dateIso = document.getElementById('edit-date')?.value;
        const startTimeHm = getSelectedValue(document.getElementById('edit-start-time'));
        const durationHhmm = getSelectedValue(document.getElementById('edit-duration'));
        const roomId = getSelectedValue(document.getElementById('edit-room'));
        const specialistId = getSelectedValue(document.getElementById('edit-teacher'));
        const directionId = getSelectedValue(document.getElementById('edit-direction'));
        const specialistServiceId = getSelectedValue(document.getElementById('edit-specialist-service'));
        const comment = document.getElementById('editBookingComment')?.value || '';
        const servicesEl = document.getElementById('edit-services');
        const serviceIds = Array.from(
            servicesEl ? servicesEl.querySelectorAll('ul.options li.selected') : []
        ).map(li => li.getAttribute('data-value')).filter(Boolean);

        const costText = document.getElementById('editBookingCostValue')?.textContent || '';
        const totalCost = (costText || '').replace('BYN', '').trim();

        var scenarioName = '';
        if (scenarioId && Array.isArray(window.SCENARIOS)) {
            var scenario = window.SCENARIOS.find(function(s) { return String(s.pk) === String(scenarioId); });
            scenarioName = scenario && scenario.fields ? scenario.fields.name : '';
        }
        var isSimplifiedScenario = (scenarioName === 'Репетиционная точка' || scenarioName === 'Музыкальный класс');

        var tariffId = getSelectedValue(document.getElementById('edit-tariff'));

        var peopleCountInput = document.getElementById('edit-people-count');
        var peopleCountVal = peopleCountInput ? String(peopleCountInput.value || '').trim() : '';
        if (isSimplifiedScenario && !peopleCountVal) {
            alert('Укажите количество людей');
            hideBookingSavingOverlay();
            return;
        }
        if (isSimplifiedScenario && !tariffId) {
            alert('Выберите тариф');
            hideBookingSavingOverlay();
            return;
        }
        if (peopleCountVal) {
            var pcInt = parseInt(peopleCountVal, 10);
            if (!Number.isFinite(pcInt) || pcInt < 1 || pcInt > 99) {
                alert('Количество людей должно быть от 1 до 99');
                hideBookingSavingOverlay();
                return;
            }
        }

        const payload = {
            date_iso: dateIso,
            start_time_hm: startTimeHm,
            duration_hhmm: durationHhmm,
            room_id: roomId,
            specialist_id: specialistId || null,
            direction_id: directionId || null,
            specialist_service_id: specialistServiceId || null,
            service_ids: serviceIds,
            comment: comment,
            total_cost: totalCost,
            people_count: isSimplifiedScenario ? peopleCountVal : null,
            tariff_id: isSimplifiedScenario ? (tariffId || null) : null,
        };

        try {
            const response = await fetch(`/booking/edit/${bookingId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': (typeof getCookie === 'function' ? getCookie('csrftoken') : '')
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || !data || !data.success) {
                const msg = (data && data.error) ? data.error : 'Не удалось сохранить изменения';
                throw new Error(msg);
            }

            if (typeof window.invalidateBookingHoverPopoverCache === 'function') {
                window.invalidateBookingHoverPopoverCache(bookingId);
            }

            if (typeof window.reloadCalendarGridForCurrentState === 'function') {
                await window.reloadCalendarGridForCurrentState();
            } else if (typeof window.refreshBookingsGrid === 'function') {
                await window.refreshBookingsGrid({ silent: true });
            }

            if (window.BookingModalUtils && typeof window.BookingModalUtils.refreshPendingRequestsCount === 'function') {
                window.BookingModalUtils.refreshPendingRequestsCount();
            }

            window._editModalShouldOpenInfo = false;
            const editModalInst = bootstrap.Modal.getInstance(document.getElementById('editBookingModal'));
            if (editModalInst) {
                editModalInst.hide();
            }

            setTimeout(function () {
                if (typeof window.openInfoModal === 'function') {
                    window.openInfoModal();
                } else {
                    const infoModal = new bootstrap.Modal(document.getElementById('infoBookingModal'));
                    infoModal.show();
                }
            }, 50);

        } catch (err) {
            console.error('Ошибка при сохранении изменений брони:', err);
        } finally {
            // Скрываем overlay после завершения
            hideBookingSavingOverlay();
        }
    }

    // Счетчик символов для textarea 'Комментарий'
    function initCommentCounter() {
        const textarea = document.getElementById('editBookingComment');
        const counter = document.getElementById('editBookingCommentCounter');

        if (!textarea || !counter) return;

        const updateCounter = () => {
            let val = textarea.value.slice(0, 1000);
            textarea.value = val;
            counter.textContent = `${val.length}/1000`;
            counter.style.color =
                val.length >= 1000 ? '#FF0000' :
                    val.length >= 900 ? '#FFA500' :
                        '#818EA2';
            var ctrl = document.getElementById('editBookingModal')?._editTimeController;
            if (ctrl && typeof ctrl.updateSubmitButtonState === 'function') {
                ctrl.updateSubmitButtonState();
            }
        };

        textarea.addEventListener('input', updateCounter);
        updateCounter();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCommentCounter);
    } else {
        initCommentCounter();
    }
