// JS модалки создания брони

    function initializeBulkCreateBlocks() {
        var container = document.getElementById('bookingBlocksContainer');
        if (!container) return;
        if (container._bulkBlocksBound) return;
        container._bulkBlocksBound = true;

        if (!Number.isFinite(container._bulkNextIdIndex)) {
            container._bulkNextIdIndex = 2;
        }

        var MAX_BLOCKS = 3;

        function getBlocks() {
            return Array.from(container.querySelectorAll('.booking-create-block'));
        }

        function parseCostTextToNumber(text) {
            var s = String(text || '').replace(',', '.');
            var m = s.match(/-?\d+(?:\.\d+)?/);
            if (!m) return 0;
            var v = parseFloat(m[0]);
            return Number.isFinite(v) ? v : 0;
        }

        function formatCostNumber(n) {
            var v = Number(n || 0);
            if (!Number.isFinite(v)) v = 0;
            return v.toFixed(2).replace(/\.00$/, '');
        }

        function updateBulkTotalCost() {
            var row = document.getElementById('bulkTotalCostRow');
            var valueEl = document.getElementById('bulkTotalCostValue');
            if (!row || !valueEl) return;

            var blocks = getBlocks();
            if (blocks.length <= 1) {
                row.style.display = 'none';
                valueEl.textContent = '0 BYN';
                return;
            }

            var total = 0;
            blocks.forEach(function (b) {
                var ce = b ? b.querySelector('[id^="bookingCostValue"]') : null;
                if (ce) {
                    total += parseCostTextToNumber(ce.textContent);
                }
            });

            valueEl.textContent = formatCostNumber(total) + ' BYN';
            row.style.display = '';
        }

        function normalizeIdForBlock(id, blockIndex) {
            if (!id) return id;
            var base = String(id).replace(/-b\d+$/, '');
            if (blockIndex === 1) return base;
            return base + '-b' + String(blockIndex);
        }

        function uniquifyIdsInBlock(blockEl, blockIndex) {
            if (!blockEl) return;

            blockEl.querySelectorAll('[id]').forEach(function (el) {
                el.id = normalizeIdForBlock(el.id, blockIndex);
            });

            blockEl.querySelectorAll('label[for]').forEach(function (labelEl) {
                var f = labelEl.getAttribute('for');
                if (!f) return;
                labelEl.setAttribute('for', normalizeIdForBlock(f, blockIndex));
            });
        }

        function resetClonedBlockUiState(blockEl) {
            if (!blockEl) return;

            blockEl.classList.remove('booking-create-block--has-errors');

            blockEl._bulkServerErrors = [];
            blockEl._bulkServerErrorSnapshots = {};

            blockEl.querySelectorAll('.custom-select.open').forEach(function (el) {
                el.classList.remove('open');
            });

            blockEl.querySelectorAll('.custom-select.has-warning').forEach(function (el) {
                el.classList.remove('has-warning');
            });

            blockEl.querySelectorAll('.modal-datepicker__trigger.has-warning').forEach(function (el) {
                el.classList.remove('has-warning');
            });

            var blockWarn = blockEl.querySelector('[id^="block-warning-icon"]');
            if (blockWarn) {
                blockWarn.style.display = 'none';
            }
            var blockChecklist = blockEl.querySelector('[id^="block-checklist"]');
            if (blockChecklist) {
                blockChecklist.innerHTML = '';
            }

            blockEl.querySelectorAll('[id^="start-time-warning-icon"], [id^="end-time-warning-icon"]').forEach(function (el) {
                el.style.display = 'none';
            });

            blockEl.querySelectorAll('[id^="datepicker-popup"].open').forEach(function (el) {
                el.classList.remove('open');
            });

            var servicesSearchInput = blockEl.querySelector('input[id^="services-search-input"]');
            if (servicesSearchInput) {
                servicesSearchInput.value = '';
            }
        }

        function initDatepickerInBlock(blockEl) {
            if (!blockEl) return;
            if (blockEl._bulkDatepickerBound) return;

            var trigger = blockEl.querySelector('[id^="datepicker-trigger"]');
            var popup = blockEl.querySelector('[id^="datepicker-popup"]');
            var display = blockEl.querySelector('[id^="datepicker-display"]');
            var grid = blockEl.querySelector('[id^="datepicker-grid"]');
            var monthSelect = blockEl.querySelector('[id^="datepicker-month"]');
            var yearSelect = blockEl.querySelector('[id^="datepicker-year"]');
            var prevBtn = blockEl.querySelector('[id^="datepicker-prev"]');
            var nextBtn = blockEl.querySelector('[id^="datepicker-next"]');
            var todayBtn = blockEl.querySelector('[id^="datepicker-today"]');
            var input = blockEl.querySelector('input[id^="modal-create-date"]');

            if (!trigger || !popup || !display || !grid || !monthSelect || !yearSelect || !prevBtn || !nextBtn || !todayBtn || !input) {
                return;
            }

            blockEl._bulkDatepickerBound = true;

            var monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                              'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
            var monthNamesGenitive = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

            function formatDateIso(date) {
                var y = date.getFullYear();
                var m = String(date.getMonth() + 1).padStart(2, '0');
                var d = String(date.getDate()).padStart(2, '0');
                return y + '-' + m + '-' + d;
            }

            function formatDateDisplay(date) {
                var day = date.getDate();
                var monthIdx = date.getMonth();
                var year = date.getFullYear();
                return day + ' ' + monthNamesGenitive[monthIdx] + ' ' + year;
            }

            function parseIsoDate(iso) {
                if (!iso) return null;
                var parts = String(iso).split('-');
                if (parts.length < 3) return null;
                var y = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                var d = parseInt(parts[2], 10);
                if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
                var dt = new Date(y, m - 1, d);
                dt.setHours(0, 0, 0, 0);
                return dt;
            }

            var selectedDate = parseIsoDate(input.value) || null;
            var currentMonth = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);

            if (selectedDate) {
                display.textContent = formatDateDisplay(selectedDate);
            }

            function populateMonthSelect() {
                monthSelect.innerHTML = '';
                for (var i = 0; i < 12; i++) {
                    var opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = monthNames[i];
                    if (i === currentMonth.getMonth()) {
                        opt.selected = true;
                    }
                    monthSelect.appendChild(opt);
                }
            }

            function populateYearSelect() {
                yearSelect.innerHTML = '';
                var baseYear = (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());
                for (var y = baseYear - 2; y <= baseYear + 3; y++) {
                    var opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    if (y === currentMonth.getFullYear()) {
                        opt.selected = true;
                    }
                    yearSelect.appendChild(opt);
                }
            }

            function buildGrid() {
                grid.innerHTML = '';

                var year = currentMonth.getFullYear();
                var month = currentMonth.getMonth();

                var firstDay = new Date(year, month, 1);
                var startDayOfWeek = (firstDay.getDay() + 6) % 7;
                var lastDay = new Date(year, month + 1, 0);
                var daysInMonth = lastDay.getDate();
                var prevMonthLastDay = new Date(year, month, 0).getDate();

                var today = new Date();
                today.setHours(0, 0, 0, 0);

                for (var i = startDayOfWeek - 1; i >= 0; i--) {
                    var prevNum = prevMonthLastDay - i;
                    var outside = document.createElement('div');
                    outside.className = 'modal-datepicker__day modal-datepicker__day--outside';
                    outside.textContent = prevNum;
                    grid.appendChild(outside);
                }

                for (var d = 1; d <= daysInMonth; d++) {
                    var cell = document.createElement('div');
                    cell.className = 'modal-datepicker__day';
                    cell.textContent = d;

                    var cellDate = new Date(year, month, d);
                    cellDate.setHours(0, 0, 0, 0);

                    if (cellDate.getTime() === today.getTime()) {
                        cell.classList.add('modal-datepicker__day--today');
                    }

                    if (selectedDate &&
                        cellDate.getFullYear() === selectedDate.getFullYear() &&
                        cellDate.getMonth() === selectedDate.getMonth() &&
                        cellDate.getDate() === selectedDate.getDate()) {
                        cell.classList.add('modal-datepicker__day--selected');
                    }

                    (function (dt) {
                        cell.addEventListener('click', function () {
                            selectedDate = dt;
                            input.value = formatDateIso(dt);
                            display.textContent = formatDateDisplay(dt);
                            popup.classList.remove('open');
                            if (typeof blockEl._bulkOnDateChanged === 'function') {
                                blockEl._bulkOnDateChanged(input.value);
                            }
                            if (typeof window.updateSubmitButtonState === 'function') {
                                window.updateSubmitButtonState();
                            }
                        });
                    })(cellDate);

                    grid.appendChild(cell);
                }

                var totalCells = grid.children.length;
                var remainingCells = (7 - (totalCells % 7)) % 7;
                for (var n = 1; n <= remainingCells; n++) {
                    var nextOutside = document.createElement('div');
                    nextOutside.className = 'modal-datepicker__day modal-datepicker__day--outside';
                    nextOutside.textContent = n;
                    grid.appendChild(nextOutside);
                }
            }

            function render() {
                populateMonthSelect();
                populateYearSelect();
                buildGrid();
            }

            trigger.addEventListener('click', function (e) {
                e.stopPropagation();

                var modal = document.getElementById('createBookingModal');
                if (modal) {
                    modal.querySelectorAll('.custom-select.open').forEach(function (s) {
                        s.classList.remove('open');
                    });
                }

                popup.classList.toggle('open');
                if (popup.classList.contains('open')) {
                    var base = selectedDate || new Date();
                    currentMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                    currentMonth.setHours(0, 0, 0, 0);
                    render();
                }
            });

            prevBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                currentMonth.setMonth(currentMonth.getMonth() - 1);
                render();
            });

            nextBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                currentMonth.setMonth(currentMonth.getMonth() + 1);
                render();
            });

            monthSelect.addEventListener('change', function () {
                currentMonth.setMonth(parseInt(this.value, 10));
                render();
            });

            yearSelect.addEventListener('change', function () {
                currentMonth.setFullYear(parseInt(this.value, 10));
                render();
            });

            todayBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var t = new Date();
                t.setHours(0, 0, 0, 0);
                selectedDate = t;
                input.value = formatDateIso(t);
                display.textContent = formatDateDisplay(t);
                currentMonth = new Date(t.getFullYear(), t.getMonth(), 1);
                currentMonth.setHours(0, 0, 0, 0);
                render();
                popup.classList.remove('open');
                if (typeof blockEl._bulkOnDateChanged === 'function') {
                    blockEl._bulkOnDateChanged(input.value);
                }
                if (typeof window.updateSubmitButtonState === 'function') {
                    window.updateSubmitButtonState();
                }
            });

            document.addEventListener('click', function (e) {
                if (!document.body.contains(blockEl)) return;
                if (popup.classList.contains('open') && !popup.contains(e.target) && !trigger.contains(e.target)) {
                    popup.classList.remove('open');
                }
            });
        }

        function initServicesMultiSelectInBlock(blockEl) {
            if (!blockEl) return;

            var servicesSelect = blockEl.querySelector('.custom-select[id^="services"]');
            if (!servicesSelect) return;

            var optionsContainer = servicesSelect.querySelector('.options');
            if (!optionsContainer) return;

            var resetBtn = blockEl.querySelector('[id^="create-reset-services"]');
            var badgesContainer = blockEl.querySelector('[id^="create-selected-services"]');
            var searchInput = servicesSelect.querySelector('input');
            var searchLi = optionsContainer.querySelector('li.search-option') || optionsContainer.querySelector('li[id^="services-search-option"]');

            if (!window.BookingServicesUtils || typeof window.BookingServicesUtils.bindServicesMultiSelect !== 'function') {
                return;
            }

            window.BookingServicesUtils.bindServicesMultiSelect({
                selectEl: servicesSelect,
                optionsContainerEl: optionsContainer,
                placeholderText: 'Выберите услугу',
                resetBtnId: resetBtn ? resetBtn.id : '',
                searchInputSelector: searchInput ? ('#' + searchInput.id) : null,
                searchOptionId: searchLi ? searchLi.id : null,
                focusSearchOnOpen: true,
                onSelectionChanged: function () {
                    updateServicesBadgesInBlock(blockEl);
                    calculateAndUpdateBookingCostInBlock(blockEl);
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                }
            });

            if (typeof servicesSelect._updateSelectedText === 'function') {
                servicesSelect._updateSelectedText();
            }

            if (window.BookingServicesUtils && typeof window.BookingServicesUtils.renderServicesBadges === 'function') {
                if (badgesContainer && resetBtn) {
                    updateServicesBadgesInBlock(blockEl);
                }
            }

            calculateAndUpdateBookingCostInBlock(blockEl);
        }

        function _isTariffScenarioGlobal() {
            return window.currentScenarioName === 'Репетиционная точка' || window.currentScenarioName === 'Музыкальный класс';
        }

        function _getScenarioTariffUnitCostGlobal() {
            if (!window.currentScenarioFilterId) return 0;
            if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioTariffUnitCost !== 'function') return 0;
            return window.BookingTimeUtils.getScenarioTariffUnitCost(window.currentScenarioFilterId) || 0;
        }

        function _getScenarioMinMinutesGlobal() {
            var fallback = 60;
            if (!window.currentScenarioFilterId) return fallback;
            if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioMinDurationMinutes !== 'function') return fallback;
            return window.BookingTimeUtils.getScenarioMinDurationMinutes(window.currentScenarioFilterId) || fallback;
        }

        function getSelectedTariffDataInBlock(blockEl) {
            if (!blockEl) return null;

            var tariffSelect = blockEl.querySelector('.custom-select[id^="tariff"]');
            if (!tariffSelect) return null;

            var selectedLi = tariffSelect.querySelector('ul.options li.selected');
            if (!selectedLi) return null;

            var baseCostRaw = String(selectedLi.getAttribute('data-base-cost') || '0').replace(',', '.');
            var baseCost = parseFloat(baseCostRaw);
            var baseDurationMinutes = parseInt(selectedLi.getAttribute('data-base-duration-minutes') || '0', 10);

            return {
                baseCost: Number.isFinite(baseCost) ? baseCost : 0,
                baseDurationMinutes: Number.isFinite(baseDurationMinutes) ? baseDurationMinutes : 0
            };
        }

        function calculateAndUpdateBookingCostInBlock(blockEl) {
            if (!blockEl) return;

            var costElement = blockEl.querySelector('[id^="bookingCostValue"]');
            if (!costElement) return;

            var servicesSelect = blockEl.querySelector('.custom-select[id^="services"]');
            if (!servicesSelect) return;

            var state = blockEl._bulkTimeState || {};
            var selectedPeriods = (state.selectedPeriods !== undefined) ? state.selectedPeriods : null;
            var startMinutes = (state.startMinutes !== undefined) ? state.startMinutes : null;
            var endMinutes = (state.endMinutes !== undefined) ? state.endMinutes : null;

            var servicesCost = 0;
            if (window.BookingServicesUtils && typeof window.BookingServicesUtils.getSelectedServicesCost === 'function') {
                servicesCost = window.BookingServicesUtils.getSelectedServicesCost(servicesSelect);
            }

            if (_isTariffScenarioGlobal()) {
                var tariffData = getSelectedTariffDataInBlock(blockEl);

                var durationMinutes = null;
                if (startMinutes !== null && endMinutes !== null && Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes) {
                    durationMinutes = endMinutes - startMinutes;
                } else if (selectedPeriods !== null && selectedPeriods !== undefined) {
                    var minMinutes = state._lastMinMinutes || _getScenarioMinMinutesGlobal();
                    durationMinutes = minMinutes * selectedPeriods;
                }

                var rentalCost = 0;
                if (tariffData && durationMinutes !== null && tariffData.baseDurationMinutes > 0) {
                    rentalCost = tariffData.baseCost * (durationMinutes / tariffData.baseDurationMinutes);
                }

                var totalTariffCost = rentalCost + servicesCost;
                var formattedTariff = Number(totalTariffCost || 0).toFixed(2).replace(/\.00$/, '');
                costElement.textContent = formattedTariff + ' BYN';
                updateBulkTotalCost();
                return;
            }

            if (window.BookingServicesUtils && typeof window.BookingServicesUtils.calculateAndUpdateTotalCost === 'function') {
                window.BookingServicesUtils.calculateAndUpdateTotalCost({
                    costElementId: costElement.id,
                    servicesSelectId: servicesSelect.id,
                    selectedPeriods: selectedPeriods,
                    periodCost: _getScenarioTariffUnitCostGlobal()
                });
                updateBulkTotalCost();
                return;
            }

            var periodsTotalCost = 0;
            if (selectedPeriods !== null && selectedPeriods !== undefined) {
                periodsTotalCost = selectedPeriods * _getScenarioTariffUnitCostGlobal();
            }
            var totalCost = periodsTotalCost + servicesCost;
            var formatted = totalCost.toFixed(2).replace(/\.00$/, '');
            costElement.textContent = formatted + ' BYN';
            updateBulkTotalCost();
        }

        function updateServicesBadgesInBlock(blockEl) {
            if (!blockEl) return;
            if (!window.BookingServicesUtils || typeof window.BookingServicesUtils.renderServicesBadges !== 'function') return;

            var badgesContainer = blockEl.querySelector('[id^="create-selected-services"]');
            var resetBtn = blockEl.querySelector('[id^="create-reset-services"]');
            var servicesSelect = blockEl.querySelector('.custom-select[id^="services"]');
            if (!badgesContainer || !resetBtn || !servicesSelect) return;

            window.BookingServicesUtils.renderServicesBadges({
                containerId: badgesContainer.id,
                selectId: servicesSelect.id,
                resetBtnId: resetBtn.id,
                showResetWhenCountGreaterThan: 1,
                onSelectionChanged: function () {
                    calculateAndUpdateBookingCostInBlock(blockEl);
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                }
            });
        }

        function initCommentCounterInBlock(blockEl) {
            if (!blockEl) return;
            var textarea = blockEl.querySelector('textarea[id^="bookingComment"]');
            var counter = blockEl.querySelector('[id^="bookingCommentCounter"]');
            if (!textarea || !counter) return;

            if (window.BookingModalUtils && typeof window.BookingModalUtils.initCommentCounter === 'function') {
                window.BookingModalUtils.initCommentCounter(textarea.id, counter.id, 1000);
                return;
            }

            if (textarea._bulkCommentCounterBound) return;
            textarea._bulkCommentCounterBound = true;
            textarea.addEventListener('input', function () {
                counter.textContent = String(textarea.value.length) + '/1000';
            });
            counter.textContent = String(textarea.value.length) + '/1000';
        }

        function initSingleSelectsInBlock(blockEl) {
            if (!blockEl) return;
            if (!window.BookingSelectsUtils || typeof window.BookingSelectsUtils.bindSingleSelect !== 'function') {
                return;
            }

            var modalElement = document.getElementById('createBookingModal');
            var closeAll = function () {
                if (!modalElement) return;
                modalElement.querySelectorAll('.custom-select.open').forEach(function (s) {
                    s.classList.remove('open');
                });
            };

            blockEl.querySelectorAll('.custom-select').forEach(function (selectEl) {
                var id = String(selectEl.id || '');
                if (id.indexOf('services') === 0) {
                    return;
                }
                if (id.indexOf('start-time') === 0 || id.indexOf('end-time') === 0 || id.indexOf('duration') === 0) {
                    return;
                }

                var isTariff = id.indexOf('tariff') === 0;
                window.BookingSelectsUtils.bindSingleSelect({
                    selectEl: selectEl,
                    closeAll: closeAll,
                    closeOthersOnOpen: false,
                    onSelected: function () {
                        if (isTariff && blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                            blockEl._bulkOnTariffChanged();
                        }
                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                    },
                    onCleared: function () {
                        if (isTariff && blockEl && typeof blockEl._bulkOnTariffChanged === 'function') {
                            blockEl._bulkOnTariffChanged();
                        }
                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                    }
                });
            });
        }

        function initTimeControllerInBlock(blockEl) {
            if (!blockEl) return;
            if (blockEl._bulkTimeControllerBound) return;

            var utils = window.BookingTimeUtils;
            if (!utils || typeof utils.loadRoomBookingsForDate !== 'function') {
                return;
            }

            var startSelect = blockEl.querySelector('.custom-select[id^="start-time"]');
            var endSelect = blockEl.querySelector('.custom-select[id^="end-time"]');
            var durationSelect = blockEl.querySelector('.custom-select[id^="duration"]');
            var dateInput = blockEl.querySelector('input[id^="modal-create-date"]');
            if (!startSelect || !endSelect || !durationSelect || !dateInput) {
                return;
            }

            var roomIdField = document.getElementById('roomIdField');
            var roomId = roomIdField ? String(roomIdField.value || '').trim() : '';
            if (!roomId) return;

            function parseTimeToMinutes(hm) {
                var s = String(hm || '').trim();
                var parts = s.split(':');
                if (parts.length < 2) return null;
                var h = parseInt(parts[0], 10);
                var m = parseInt(parts[1], 10);
                if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
                return (h * 60) + m;
            }

            function getScenarioId() {
                return (window.currentScenarioFilterId !== undefined && window.currentScenarioFilterId !== null)
                    ? String(window.currentScenarioFilterId)
                    : '';
            }

            function isTariffScenario() {
                return window.currentScenarioName === 'Репетиционная точка' || window.currentScenarioName === 'Музыкальный класс';
            }

            function isMusicSchoolScenario() {
                return window.currentScenarioName === 'Музыкальная школа';
            }

            function getSelectedSpecialistServiceDurationMinutesOrNull() {
                var specialistServiceSelect = document.getElementById('specialist-service');
                if (!specialistServiceSelect) return null;
                var selectedLi = specialistServiceSelect.querySelector('ul.options li.selected');
                if (!selectedLi) return null;
                var raw = selectedLi.getAttribute('data-duration-minutes') || '0';
                var n = parseInt(raw, 10);
                return Number.isFinite(n) && n > 0 ? n : null;
            }

            function parseTariffDayIntervalsMinutesOrNull() {
                var tariffSelect = blockEl.querySelector('.custom-select[id^="tariff"]');
                if (!tariffSelect) return null;
                var selectedLi = tariffSelect.querySelector('ul.options li.selected');
                if (!selectedLi) return null;

                var dayIntervalsRaw = selectedLi.getAttribute('data-day-intervals') || '[]';
                var dayIntervals;
                try {
                    dayIntervals = JSON.parse(dayIntervalsRaw);
                } catch (e) {
                    dayIntervals = [];
                }
                if (!Array.isArray(dayIntervals) || dayIntervals.length === 0) return null;

                var res = [];
                dayIntervals.forEach(function (it) {
                    if (!it) return;
                    var s = parseTimeToMinutes(it.start_time);
                    var e = parseTimeToMinutes(it.end_time);
                    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
                        res.push({ startMinutes: s, endMinutes: e });
                    }
                });
                return res.length ? res : null;
            }

            function getTariffBaseDurationMinutesOrNull() {
                var tariffSelect = blockEl.querySelector('.custom-select[id^="tariff"]');
                if (!tariffSelect) return null;
                var selectedLi = tariffSelect.querySelector('ul.options li.selected');
                if (!selectedLi) return null;
                var v = parseInt(selectedLi.getAttribute('data-base-duration-minutes') || '0', 10);
                return Number.isFinite(v) && v > 0 ? v : null;
            }

            function getMinMinutes() {
                if (isMusicSchoolScenario()) {
                    var mmS = getSelectedSpecialistServiceDurationMinutesOrNull();
                    if (mmS) return mmS;
                }
                if (isTariffScenario()) {
                    var tariffMin = getTariffBaseDurationMinutesOrNull();
                    if (tariffMin) return tariffMin;
                }
                var sid = getScenarioId();
                if (sid && utils.getScenarioMinDurationMinutes) {
                    return utils.getScenarioMinDurationMinutes(sid) || 60;
                }
                return 60;
            }

            function getWorkStart() {
                var sid = getScenarioId();
                if (sid && utils.getScenarioWorkTimeStartMinutes) {
                    return utils.getScenarioWorkTimeStartMinutes(sid) || 0;
                }
                return 0;
            }

            function getWorkEnd() {
                var sid = getScenarioId();
                if (sid && utils.getScenarioWorkTimeEndMinutes) {
                    return utils.getScenarioWorkTimeEndMinutes(sid) || (24 * 60);
                }
                return 24 * 60;
            }

            function closeAll() {
                var modalElement = document.getElementById('createBookingModal');
                if (!modalElement) return;
                modalElement.querySelectorAll('.custom-select.open').forEach(function (s) {
                    s.classList.remove('open');
                });
                modalElement.querySelectorAll('[id^="datepicker-popup"].open').forEach(function (p) {
                    p.classList.remove('open');
                });
            }

            function bindTimeSelectOpen(selectEl) {
                if (!selectEl) return;
                if (selectEl._bookingTimeOpenBound) return;
                selectEl._bookingTimeOpenBound = true;
                selectEl.addEventListener('click', function (e) {
                    if (selectEl.classList.contains('disabled')) return;
                    var clearBtn = e.target && (e.target.closest ? e.target.closest('.custom-select-clear') : null);
                    if (clearBtn) return;
                    if (e.target && e.target.tagName === 'LI') return;
                    var wasOpen = selectEl.classList.contains('open');
                    closeAll();
                    if (!wasOpen) {
                        selectEl.classList.add('open');
                    }
                });
            }

            function bindTimeSelectClear(selectEl, clearKind) {
                if (!selectEl) return;
                var clearBtn = selectEl.querySelector('.custom-select-clear');
                if (!clearBtn) return;
                if (clearBtn._bookingTimeClearBound) return;
                clearBtn._bookingTimeClearBound = true;
                clearBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (clearKind === 'start') {
                        state.startMinutes = null;
                    } else if (clearKind === 'end') {
                        state.endMinutes = null;
                    } else if (clearKind === 'duration') {
                        state.selectedPeriods = null;
                    }
                    closeAll();
                    rebuildAll();
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs(blockEl);
                    }
                    calculateAndUpdateBookingCostInBlock(blockEl);
                });
            }

            bindTimeSelectOpen(startSelect);
            bindTimeSelectOpen(endSelect);
            bindTimeSelectOpen(durationSelect);

            bindTimeSelectClear(startSelect, 'start');
            bindTimeSelectClear(endSelect, 'end');
            bindTimeSelectClear(durationSelect, 'duration');

            function readStateFromDom(state) {
                var startLi = startSelect.querySelector('ul.options li.selected');
                var endLi = endSelect.querySelector('ul.options li.selected');
                var durLi = durationSelect.querySelector('ul.options li.selected');

                if (startLi) {
                    var sm = parseInt(startLi.getAttribute('data-minutes') || '', 10);
                    state.startMinutes = Number.isFinite(sm) ? sm : parseTimeToMinutes(startLi.getAttribute('data-value') || startLi.textContent);
                }
                if (endLi) {
                    var em = parseInt(endLi.getAttribute('data-minutes') || '', 10);
                    state.endMinutes = Number.isFinite(em) ? em : parseTimeToMinutes(endLi.getAttribute('data-value') || endLi.textContent);
                }
                if (durLi) {
                    var p = parseInt(durLi.getAttribute('data-periods') || '', 10);
                    state.selectedPeriods = Number.isFinite(p) && p >= 1 ? p : null;
                }
            }

            var state = {
                roomBookings: [],
                startMinutes: null,
                endMinutes: null,
                selectedPeriods: null
            };
            readStateFromDom(state);
            blockEl._bulkTimeState = state;

            function rebuildAll() {
                var minMinutes = getMinMinutes();
                var workStart = getWorkStart();
                var workEnd = getWorkEnd();
                var roomBookings = Array.isArray(state.roomBookings) ? state.roomBookings : [];

                var tariffIntervals = isTariffScenario() ? parseTariffDayIntervalsMinutesOrNull() : null;

                var musicSchoolTimeFrozen = isMusicSchoolScenario() && !getSelectedSpecialistServiceDurationMinutesOrNull();

                if (state._lastMinMinutes !== undefined && state._lastMinMinutes !== null && state._lastMinMinutes !== minMinutes) {
                    state.selectedPeriods = null;
                    state.endMinutes = null;
                }
                state._lastMinMinutes = minMinutes;

                if (musicSchoolTimeFrozen) {
                    state.selectedPeriods = null;
                    state.endMinutes = null;

                    var startSlotsNoService = utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
                    utils.rebuildStartTimeSelect(startSelect, startSlotsNoService, state.startMinutes, function (minutes) {
                        state.startMinutes = minutes;
                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                        if (typeof window.syncCreateBookingTariffs === 'function') {
                            window.syncCreateBookingTariffs(blockEl);
                        }
                        calculateAndUpdateBookingCostInBlock(blockEl);
                    });

                    utils.rebuildDurationSelect(durationSelect, null, 0, minMinutes);
                    utils.rebuildEndTimeSelect(endSelect, [], null);
                    durationSelect.classList.add('disabled');
                    endSelect.classList.add('disabled');
                    calculateAndUpdateBookingCostInBlock(blockEl);
                    return;
                }

                function filterStartSlotsByTariffDayIntervals(slots, requiredPeriods) {
                    if (!tariffIntervals) return slots;
                    var minutesNeed = requiredPeriods * minMinutes;
                    return (Array.isArray(slots) ? slots : []).filter(function (s) {
                        for (var i = 0; i < tariffIntervals.length; i++) {
                            var it = tariffIntervals[i];
                            if (s >= it.startMinutes && (s + minutesNeed) <= it.endMinutes) {
                                return true;
                            }
                        }
                        return false;
                    });
                }

                function filterEndTimesByTariffForPeriods(endTimes, requiredPeriods) {
                    if (!tariffIntervals) return endTimes;
                    var minutesNeed = requiredPeriods * minMinutes;
                    return (Array.isArray(endTimes) ? endTimes : []).filter(function (e) {
                        var s = e - minutesNeed;
                        for (var i = 0; i < tariffIntervals.length; i++) {
                            var it = tariffIntervals[i];
                            if (s >= it.startMinutes && e <= it.endMinutes) {
                                return true;
                            }
                        }
                        return false;
                    });
                }

                function filterEndTimesByTariffForStart(endTimes, startMinutes) {
                    if (!tariffIntervals) return endTimes;
                    var matched = null;
                    for (var i = 0; i < tariffIntervals.length; i++) {
                        var it = tariffIntervals[i];
                        if (startMinutes >= it.startMinutes && startMinutes < it.endMinutes) {
                            matched = it;
                            break;
                        }
                    }
                    if (!matched) return [];
                    return (Array.isArray(endTimes) ? endTimes : []).filter(function (e) {
                        return e > startMinutes && e <= matched.endMinutes;
                    });
                }

                function filterStartTimesByTariffForEnd(startTimes, endMinutes) {
                    if (!tariffIntervals) return startTimes;
                    var matched = null;
                    for (var i = 0; i < tariffIntervals.length; i++) {
                        var it = tariffIntervals[i];
                        if (endMinutes > it.startMinutes && endMinutes <= it.endMinutes) {
                            matched = it;
                            break;
                        }
                    }
                    if (!matched) return [];
                    return (Array.isArray(startTimes) ? startTimes : []).filter(function (s) {
                        return s >= matched.startMinutes && s < endMinutes;
                    });
                }

                function limitMaxPeriodsByTariffForStart(startMinutes, baseMax) {
                    if (!tariffIntervals) return baseMax;
                    for (var i = 0; i < tariffIntervals.length; i++) {
                        var it = tariffIntervals[i];
                        if (startMinutes >= it.startMinutes && startMinutes < it.endMinutes) {
                            var maxByTariff = Math.floor((it.endMinutes - startMinutes) / minMinutes);
                            return Math.max(0, Math.min(baseMax, maxByTariff));
                        }
                    }
                    return 0;
                }

                function limitMaxPeriodsByTariffForEnd(endMinutes, baseMax) {
                    if (!tariffIntervals) return baseMax;
                    for (var i = 0; i < tariffIntervals.length; i++) {
                        var it = tariffIntervals[i];
                        if (endMinutes > it.startMinutes && endMinutes <= it.endMinutes) {
                            var maxByTariff = Math.floor((endMinutes - it.startMinutes) / minMinutes);
                            return Math.max(0, Math.min(baseMax, maxByTariff));
                        }
                    }
                    return 0;
                }

                function limitGlobalMaxPeriodsByTariff(baseMax) {
                    if (!tariffIntervals) return baseMax;
                    var maxByTariff = 0;
                    for (var i = 0; i < tariffIntervals.length; i++) {
                        var it = tariffIntervals[i];
                        var n = Math.floor((it.endMinutes - it.startMinutes) / minMinutes);
                        if (n > maxByTariff) maxByTariff = n;
                    }
                    return Math.max(0, Math.min(baseMax, maxByTariff));
                }

                var tariffMinChosen = isTariffScenario() ? getTariffBaseDurationMinutesOrNull() : null;

                var tariffTimeFrozen = isTariffScenario() && !tariffMinChosen;
                if (tariffTimeFrozen) {
                    state.selectedPeriods = null;
                    state.endMinutes = null;

                    var startSlotsNoTariff = utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
                    utils.rebuildStartTimeSelect(startSelect, startSlotsNoTariff, state.startMinutes, function (minutes) {
                        state.startMinutes = minutes;
                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                        if (typeof window.syncCreateBookingTariffs === 'function') {
                            window.syncCreateBookingTariffs(blockEl);
                        }
                        calculateAndUpdateBookingCostInBlock(blockEl);
                    });

                    utils.rebuildDurationSelect(durationSelect, null, 0, minMinutes);
                    utils.rebuildEndTimeSelect(endSelect, [], null);
                    durationSelect.classList.add('disabled');
                    endSelect.classList.add('disabled');
                    calculateAndUpdateBookingCostInBlock(blockEl);
                    return;
                }

                durationSelect.classList.remove('disabled');
                endSelect.classList.remove('disabled');

                var maxPeriods = 0;
                if (state.startMinutes !== null) {
                    var baseMaxStart = utils.getMaxPeriodsForStartTime(state.startMinutes, roomBookings, workEnd, minMinutes);
                    maxPeriods = limitMaxPeriodsByTariffForStart(state.startMinutes, baseMaxStart);
                } else if (state.endMinutes !== null) {
                    var baseMaxEnd = utils.getMaxPeriodsForEndTime(state.endMinutes, roomBookings, workStart, workEnd, minMinutes);
                    maxPeriods = limitMaxPeriodsByTariffForEnd(state.endMinutes, baseMaxEnd);
                } else {
                    var baseGlobalMax = utils.getGlobalMaxPeriods(roomBookings, workStart, workEnd, minMinutes);
                    maxPeriods = limitGlobalMaxPeriodsByTariff(baseGlobalMax);
                }

                utils.rebuildDurationSelect(durationSelect, state.selectedPeriods, maxPeriods, minMinutes, function (periods) {
                    state.selectedPeriods = periods;

                    if (state.startMinutes !== null) {
                        var endTimesForStart = utils.getEndTimesForStartTime(state.startMinutes, roomBookings, workEnd, minMinutes);
                        endTimesForStart = filterEndTimesByTariffForStart(endTimesForStart, state.startMinutes);
                        var newEnd = state.startMinutes + (minMinutes * state.selectedPeriods);
                        state.endMinutes = endTimesForStart.indexOf(newEnd) !== -1 ? newEnd : null;
                    } else if (state.endMinutes !== null) {
                        var startSlotsForPeriods = utils.getStartTimeSlotsForPeriods(state.selectedPeriods, roomBookings, workStart, workEnd, minMinutes);
                        startSlotsForPeriods = filterStartSlotsByTariffDayIntervals(startSlotsForPeriods, state.selectedPeriods);
                        var newStart = state.endMinutes - (minMinutes * state.selectedPeriods);
                        state.startMinutes = startSlotsForPeriods.indexOf(newStart) !== -1 ? newStart : null;
                    }

                    rebuildAll();
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs(blockEl);
                    }
                    calculateAndUpdateBookingCostInBlock(blockEl);
                });

                var startSlots;
                if (state.selectedPeriods !== null) {
                    startSlots = utils.getStartTimeSlotsForPeriods(state.selectedPeriods, roomBookings, workStart, workEnd, minMinutes);
                    startSlots = filterStartSlotsByTariffDayIntervals(startSlots, state.selectedPeriods);
                } else if (state.endMinutes !== null) {
                    startSlots = utils.getStartTimesForEndTime(state.endMinutes, roomBookings, workStart, workEnd, minMinutes);
                    startSlots = filterStartTimesByTariffForEnd(startSlots, state.endMinutes);
                } else {
                    startSlots = utils.getStartTimeSlotsForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
                    startSlots = filterStartSlotsByTariffDayIntervals(startSlots, 1);
                }
                if (state.startMinutes !== null && startSlots.indexOf(state.startMinutes) === -1) {
                    state.startMinutes = null;
                }

                utils.rebuildStartTimeSelect(startSelect, startSlots, state.startMinutes, function (minutes) {
                    state.startMinutes = minutes;

                    var baseMaxPeriodsForStart = utils.getMaxPeriodsForStartTime(minutes, roomBookings, workEnd, minMinutes);
                    var maxPeriodsForStart = limitMaxPeriodsByTariffForStart(minutes, baseMaxPeriodsForStart);
                    var endTimesForStart = utils.getEndTimesForStartTime(minutes, roomBookings, workEnd, minMinutes);
                    endTimesForStart = filterEndTimesByTariffForStart(endTimesForStart, minutes);

                    if (state.selectedPeriods !== null) {
                        var newEnd = minutes + (minMinutes * state.selectedPeriods);
                        state.endMinutes = (state.selectedPeriods <= maxPeriodsForStart && endTimesForStart.indexOf(newEnd) !== -1) ? newEnd : null;
                    } else if (state.endMinutes !== null) {
                        var periodsBetween = Math.round((state.endMinutes - minutes) / minMinutes);
                        if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForStart && endTimesForStart.indexOf(state.endMinutes) !== -1) {
                            state.selectedPeriods = periodsBetween;
                        } else if (maxPeriodsForStart === 1) {
                            state.selectedPeriods = 1;
                            state.endMinutes = minutes + minMinutes;
                        } else {
                            state.endMinutes = null;
                            state.selectedPeriods = null;
                        }
                    } else {
                        if (maxPeriodsForStart === 1) {
                            state.selectedPeriods = 1;
                            state.endMinutes = minutes + minMinutes;
                        }
                    }

                    rebuildAll();
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs(blockEl);
                    }
                    calculateAndUpdateBookingCostInBlock(blockEl);
                });

                var endTimes;
                if (state.selectedPeriods !== null) {
                    endTimes = utils.getAllEndTimesForPeriods(state.selectedPeriods, roomBookings, workStart, workEnd, minMinutes);
                    endTimes = filterEndTimesByTariffForPeriods(endTimes, state.selectedPeriods);
                } else if (state.startMinutes !== null) {
                    endTimes = utils.getEndTimesForStartTime(state.startMinutes, roomBookings, workEnd, minMinutes);
                    endTimes = filterEndTimesByTariffForStart(endTimes, state.startMinutes);
                } else {
                    endTimes = utils.getAllEndTimesForPeriods(1, roomBookings, workStart, workEnd, minMinutes);
                    endTimes = filterEndTimesByTariffForPeriods(endTimes, 1);
                }

                if (state.endMinutes !== null && endTimes.indexOf(state.endMinutes) === -1) {
                    state.endMinutes = null;
                }

                utils.rebuildEndTimeSelect(endSelect, endTimes, state.endMinutes, function (minutes) {
                    state.endMinutes = minutes;

                    var startTimesForEnd = utils.getStartTimesForEndTime(minutes, roomBookings, workStart, workEnd, minMinutes);
                    startTimesForEnd = filterStartTimesByTariffForEnd(startTimesForEnd, minutes);
                    var baseMaxPeriodsForEnd = utils.getMaxPeriodsForEndTime(minutes, roomBookings, workStart, workEnd, minMinutes);
                    var maxPeriodsForEnd = limitMaxPeriodsByTariffForEnd(minutes, baseMaxPeriodsForEnd);

                    if (state.selectedPeriods !== null) {
                        var newStart = minutes - (minMinutes * state.selectedPeriods);
                        state.startMinutes = startTimesForEnd.indexOf(newStart) !== -1 ? newStart : null;
                    } else if (state.startMinutes !== null) {
                        var periodsBetween = Math.round((minutes - state.startMinutes) / minMinutes);
                        if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForEnd && startTimesForEnd.indexOf(state.startMinutes) !== -1) {
                            state.selectedPeriods = periodsBetween;
                        } else if (maxPeriodsForEnd === 1) {
                            state.selectedPeriods = 1;
                            state.startMinutes = minutes - minMinutes;
                        } else {
                            state.startMinutes = null;
                            state.selectedPeriods = null;
                        }
                    } else {
                        if (maxPeriodsForEnd === 1) {
                            state.selectedPeriods = 1;
                            state.startMinutes = minutes - minMinutes;
                        }
                    }

                    rebuildAll();
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs(blockEl);
                    }
                    calculateAndUpdateBookingCostInBlock(blockEl);
                });
            }

            function reloadByDate(dateIso, forceReload) {
                var iso = String(dateIso || '').trim();
                if (!iso) {
                    return;
                }
                utils.loadRoomBookingsForDate(roomId, iso, null, function (intervals) {
                    state.roomBookings = Array.isArray(intervals) ? intervals : [];
                    rebuildAll();
                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    calculateAndUpdateBookingCostInBlock(blockEl);
                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs(blockEl);
                    }
                }, forceReload === true);
            }

            blockEl._bulkOnDateChanged = function (iso) {
                state.startMinutes = null;
                state.endMinutes = null;
                state.selectedPeriods = null;
                closeAll();
                reloadByDate(iso, true);
            };

            blockEl._bulkOnTariffChanged = function () {
                closeAll();
                rebuildAll();
                calculateAndUpdateBookingCostInBlock(blockEl);
            };

            blockEl._bulkTimeControllerBound = true;
            reloadByDate(dateInput.value, false);
        }

        function initClonedBlockInteractiveUi(blockEl) {
            if (!blockEl) return;
            if (blockEl._bulkInteractiveBound) return;
            blockEl._bulkInteractiveBound = true;

            initSingleSelectsInBlock(blockEl);
            initServicesMultiSelectInBlock(blockEl);
            initCommentCounterInBlock(blockEl);
            initDatepickerInBlock(blockEl);
            initTimeControllerInBlock(blockEl);
        }

        function refreshBlocksUi() {
            var blocks = getBlocks();
            blocks.forEach(function (b, i) {
                var index = i + 1;
                b.setAttribute('data-booking-block-index', String(index));

                var isLast = index === blocks.length;
                var canAddMore = blocks.length < MAX_BLOCKS;

                var addBtn = b.querySelector('[data-booking-block-action="add"]');
                if (addBtn) {
                    addBtn.style.display = '';
                    addBtn.classList.toggle('booking-create-block-action-btn--hidden', !(isLast && canAddMore));
                    addBtn.disabled = !canAddMore;
                }

                var removeBtn = b.querySelector('[data-booking-block-action="remove"]');
                if (removeBtn) {
                    removeBtn.style.display = '';
                    removeBtn.classList.toggle('booking-create-block-action-btn--hidden', index === 1);
                    removeBtn.disabled = false;
                }
            });

            updateBulkTotalCost();
        }

        function reindexBlocks() {
            var blocks = getBlocks();
            blocks.forEach(function (b, i) {
                var index = i + 1;
                b.setAttribute('data-booking-block-index', String(index));
                uniquifyIdsInBlock(b, index);
            });
        }

        function removeBlockAt(blockIndex) {
            if (blockIndex <= 1) return;
            var blocks = getBlocks();
            var target = blocks[blockIndex - 1];
            if (target) target.remove();
            refreshBlocksUi();

            if (typeof adaptModalForScenario === 'function') {
                adaptModalForScenario(window.currentScenarioName || '');
            }
            if (typeof window.updateSubmitButtonState === 'function') {
                window.updateSubmitButtonState();
            }

            updateBulkTotalCost();
        }

        function addBlock() {
            var blocks = getBlocks();
            if (blocks.length >= MAX_BLOCKS) {
                refreshBlocksUi();
                return;
            }

            var source = blocks[blocks.length - 1];
            if (!source) return;

            var newIndex = Number.isFinite(container._bulkNextIdIndex) ? container._bulkNextIdIndex : (blocks.length + 1);
            container._bulkNextIdIndex = newIndex + 1;
            var clone = source.cloneNode(true);
            uniquifyIdsInBlock(clone, newIndex);
            resetClonedBlockUiState(clone);

            var srcDateInput = source.querySelector('input[id^="modal-create-date"]');
            var dstDateInput = clone.querySelector('input[id^="modal-create-date"]');
            if (srcDateInput && dstDateInput) {
                var iso = String(srcDateInput.value || '').trim();
                if (iso) {
                    var parts = iso.split('-');
                    if (parts.length >= 3) {
                        var y = parseInt(parts[0], 10);
                        var m = parseInt(parts[1], 10);
                        var d = parseInt(parts[2], 10);
                        if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                            var dt = new Date(y, m - 1, d);
                            dt.setHours(0, 0, 0, 0);
                            dt.setDate(dt.getDate() + 1);
                            var yy = dt.getFullYear();
                            var mm = String(dt.getMonth() + 1).padStart(2, '0');
                            var dd = String(dt.getDate()).padStart(2, '0');
                            dstDateInput.value = yy + '-' + mm + '-' + dd;
                        }
                    }
                }
            }
            container.appendChild(clone);
            refreshBlocksUi();

            initClonedBlockInteractiveUi(clone);

            if (typeof adaptModalForScenario === 'function') {
                adaptModalForScenario(window.currentScenarioName || '');
            }
            if (typeof window.updateSubmitButtonState === 'function') {
                window.updateSubmitButtonState();
            }
        }

        function resetToSingleBlock() {
            var blocks = getBlocks();
            blocks.forEach(function (b, i) {
                if ((i + 1) > 1) b.remove();
            });
            refreshBlocksUi();

            container._bulkNextIdIndex = 2;

            if (typeof window.updateSubmitButtonState === 'function') {
                window.updateSubmitButtonState();
            }
        }

        container.addEventListener('click', function (e) {
            var btn = e.target && (e.target.closest ? e.target.closest('[data-booking-block-action]') : null);
            if (!btn) return;

            var blockEl = btn.closest('.booking-create-block');
            if (!blockEl) return;

            var idx = parseInt(blockEl.getAttribute('data-booking-block-index') || '1', 10);
            var action = btn.getAttribute('data-booking-block-action') || 'add';

            if (action === 'add') {
                addBlock();
            } else {
                if (Number.isFinite(idx) && idx >= 1) {
                    removeBlockAt(idx);
                }
            }
        });

        window.__resetCreateBookingBlocksToSingle = resetToSingleBlock;
        refreshBlocksUi();
        getBlocks().forEach(function (b) {
            initClonedBlockInteractiveUi(b);
        });
    }

    function _normalizeCreateBookingErrorsPayload(data) {
        if (data && Array.isArray(data.errors) && data.errors.length) {
            return data.errors
                .filter(function (e) { return e && (e.message || e.error); })
                .map(function (e) {
                    return {
                        message: String(e.message || e.error || ''),
                        field: (e.field !== undefined ? e.field : null),
                        block_index: (e.block_index !== undefined ? e.block_index : null)
                    };
                });
        }

        if (data && (data.error || data.message)) {
            return [
                {
                    message: String(data.error || data.message || ''),
                    field: (data.field !== undefined ? data.field : null),
                    block_index: (data.block_index !== undefined ? data.block_index : null)
                }
            ];
        }

        return [{ message: 'Неизвестная ошибка', field: null, block_index: null }];
    }

    function _getComparableValueForBlockField(blockEl, field) {
        if (!blockEl) return '';

        var dateInput = blockEl.querySelector('input[id^="modal-create-date"]');
        var dateIso = dateInput ? String(dateInput.value || '').trim() : '';

        var state = (blockEl && blockEl._bulkTimeState) ? blockEl._bulkTimeState : {};
        var startMinutes = (state.startMinutes !== undefined) ? state.startMinutes : null;
        var endMinutes = (state.endMinutes !== undefined) ? state.endMinutes : null;

        function formatMinutesToHHMM(mins) {
            var m = parseInt(mins, 10);
            if (!Number.isFinite(m) || m < 0) return '';
            var h = Math.floor(m / 60);
            var mm = m % 60;
            return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
        }

        function buildBlockSnapshot() {
            var startHm = (startMinutes !== null && startMinutes !== undefined) ? formatMinutesToHHMM(startMinutes) : '';
            var endHm = (endMinutes !== null && endMinutes !== undefined) ? formatMinutesToHHMM(endMinutes) : '';
            var tariffSel = blockEl.querySelector('.custom-select[id^="tariff"]');
            var tariffLi = tariffSel ? tariffSel.querySelector('ul.options li.selected') : null;
            var tariffId = tariffLi ? String(tariffLi.getAttribute('data-value') || '') : '';
            return [dateIso, startHm, endHm, tariffId].join('|');
        }

        if (field === 'full_datetime') {
            var startHm = (startMinutes !== null && startMinutes !== undefined) ? formatMinutesToHHMM(startMinutes) : '';
            return dateIso && startHm ? (dateIso + ' ' + startHm) : '';
        }

        if (field === 'duration') {
            var durationSelectEl = blockEl.querySelector('.custom-select[id^="duration"]');
            var durationSelected = durationSelectEl ? durationSelectEl.querySelector('ul.options li.selected') : null;
            if (durationSelected) {
                return String(durationSelected.getAttribute('data-value') || durationSelected.textContent || '').trim();
            }
            if (startMinutes !== null && endMinutes !== null && Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes) {
                return String(endMinutes - startMinutes);
            }
            return '';
        }

        if (field === 'tariff_id') {
            var tariffSelect = blockEl.querySelector('.custom-select[id^="tariff"]');
            var selectedTariff = tariffSelect ? tariffSelect.querySelector('ul.options li.selected') : null;
            return selectedTariff ? String(selectedTariff.getAttribute('data-value') || '') : '';
        }

        if (!field) {
            return buildBlockSnapshot();
        }

        return buildBlockSnapshot();
    }

    function _getComparableValueForSharedField(field) {
        function buildSharedSnapshot() {
            var peopleCountInput0 = document.getElementById('people-count');
            var peopleCount0 = peopleCountInput0 ? String(peopleCountInput0.value || '').trim() : '';

            var clientSelect0 = document.getElementById('client');
            var selectedClient0 = clientSelect0 ? clientSelect0.querySelector('ul.options li.selected:not(#search-option)') : null;
            var clientValue0 = selectedClient0 ? String(selectedClient0.getAttribute('data-value') || '') : '';
            var clientType0 = selectedClient0 ? String(selectedClient0.getAttribute('data-type') || '') : '';

            var teacherSelect0 = document.getElementById('teacher');
            var selectedTeacher0 = teacherSelect0 ? teacherSelect0.querySelector('ul.options li.selected') : null;
            var teacherId0 = selectedTeacher0 ? String(selectedTeacher0.getAttribute('data-value') || '') : '';

            var directionSelect0 = document.getElementById('field-direction');
            var selectedDirection0 = directionSelect0 ? directionSelect0.querySelector('ul.options li.selected') : null;
            var directionId0 = selectedDirection0 ? String(selectedDirection0.getAttribute('data-value') || '') : '';

            var ssSelect0 = document.getElementById('specialist-service');
            var selectedSs0 = ssSelect0 ? ssSelect0.querySelector('ul.options li.selected') : null;
            var ssId0 = selectedSs0 ? String(selectedSs0.getAttribute('data-value') || '') : '';

            return [
                peopleCount0,
                clientType0 + ':' + clientValue0,
                teacherId0,
                directionId0,
                ssId0
            ].join('|');
        }
        if (!field) {
            return buildSharedSnapshot();
        }
        if (field === 'people_count') {
            var peopleCountInput = document.getElementById('people-count');
            return peopleCountInput ? String(peopleCountInput.value || '').trim() : '';
        }
        if (field === 'client_id' || field === 'client_group_id') {
            var clientSelect = document.getElementById('client');
            var selectedClient = clientSelect ? clientSelect.querySelector('ul.options li.selected:not(#search-option)') : null;
            var v = selectedClient ? String(selectedClient.getAttribute('data-value') || '') : '';
            var t = selectedClient ? String(selectedClient.getAttribute('data-type') || '') : '';
            return t + ':' + v;
        }
        if (field === 'specialist_id') {
            var teacherSelect = document.getElementById('teacher');
            var selectedTeacher = teacherSelect ? teacherSelect.querySelector('ul.options li.selected') : null;
            return selectedTeacher ? String(selectedTeacher.getAttribute('data-value') || '') : '';
        }
        if (field === 'direction_id') {
            var directionSelect = document.getElementById('field-direction');
            var selectedDirection = directionSelect ? directionSelect.querySelector('ul.options li.selected') : null;
            return selectedDirection ? String(selectedDirection.getAttribute('data-value') || '') : '';
        }
        if (field === 'specialist_service_id') {
            var ssSelect = document.getElementById('specialist-service');
            var selectedSs = ssSelect ? ssSelect.querySelector('ul.options li.selected') : null;
            return selectedSs ? String(selectedSs.getAttribute('data-value') || '') : '';
        }
        return buildSharedSnapshot();
    }

    function clearBulkCreateBookingServerErrors() {
        var modalEl = document.getElementById('createBookingModal');
        if (modalEl) {
            modalEl._bulkServerErrorsGlobal = [];
            modalEl._bulkServerErrorSnapshotsGlobal = {};
        }
        var blocksContainer = document.getElementById('bookingBlocksContainer');
        var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
        blocks.forEach(function (b) {
            b._bulkServerErrors = [];
            b._bulkServerErrorSnapshots = {};
        });
        if (typeof window.updateSubmitButtonState === 'function') {
            window.updateSubmitButtonState();
        }
    }
    window.clearBulkCreateBookingServerErrors = clearBulkCreateBookingServerErrors;

    function scrollToFirstBulkBookingError() {
        var modalEl = document.getElementById('createBookingModal');
        if (!modalEl) return;

        var first = modalEl.querySelector('.booking-create-block .has-warning')
            || modalEl.querySelector('.booking-create-block.booking-create-block--has-errors')
            || modalEl.querySelector('.has-warning');
        if (!first) return;

        try {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {
            try { first.scrollIntoView(true); } catch (e2) {}
        }
    }
    window.scrollToFirstBulkBookingError = scrollToFirstBulkBookingError;

    function applyBulkCreateBookingServerErrors(data) {
        var errors = _normalizeCreateBookingErrorsPayload(data);

        var modalEl = document.getElementById('createBookingModal');
        if (modalEl) {
            modalEl._bulkServerErrorsGlobal = [];
            if (!modalEl._bulkServerErrorSnapshotsGlobal) {
                modalEl._bulkServerErrorSnapshotsGlobal = {};
            }
        }

        var blocksContainer = document.getElementById('bookingBlocksContainer');
        var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
        blocks.forEach(function (b) {
            b._bulkServerErrors = [];
            if (!b._bulkServerErrorSnapshots) {
                b._bulkServerErrorSnapshots = {};
            }
        });

        errors.forEach(function (e) {
            var blockIndex = e.block_index ? parseInt(String(e.block_index), 10) : NaN;
            var field = (e.field !== undefined ? e.field : null);

            if (Number.isFinite(blockIndex) && blockIndex >= 1) {
                var blockEl = blocks[blockIndex - 1];
                if (blockEl) {
                    if (!Array.isArray(blockEl._bulkServerErrors)) {
                        blockEl._bulkServerErrors = [];
                    }
                    blockEl._bulkServerErrors.push({ message: e.message, field: field, block_index: blockIndex });
                    if (blockEl._bulkServerErrorSnapshots) {
                        var key = String(field || '');
                        if (blockEl._bulkServerErrorSnapshots[key] === undefined) {
                            blockEl._bulkServerErrorSnapshots[key] = _getComparableValueForBlockField(blockEl, field);
                        }
                    }
                }
                return;
            }

            if (modalEl) {
                if (!Array.isArray(modalEl._bulkServerErrorsGlobal)) {
                    modalEl._bulkServerErrorsGlobal = [];
                }
                modalEl._bulkServerErrorsGlobal.push({ message: e.message, field: field, block_index: null });
                if (modalEl._bulkServerErrorSnapshotsGlobal) {
                    var key2 = String(field || '');
                    if (modalEl._bulkServerErrorSnapshotsGlobal[key2] === undefined) {
                        modalEl._bulkServerErrorSnapshotsGlobal[key2] = _getComparableValueForSharedField(field);
                    }
                }
            }
        });

        if (typeof window.updateSubmitButtonState === 'function') {
            window.updateSubmitButtonState();
        }
        setTimeout(function () {
            if (typeof window.scrollToFirstBulkBookingError === 'function') {
                window.scrollToFirstBulkBookingError();
            }
        }, 50);
    }
    window.applyBulkCreateBookingServerErrors = applyBulkCreateBookingServerErrors;

    /**
     * Адаптация UI модалки под разные сценарии.
     * - "Репетиционная точка": скрываются Направление и Преподаватель, 
     *   в списке клиентов появляются группы, показывается заглушка "Тариф"
     * - Другие сценарии: стандартный вид
     */
    function adaptModalForScenario(scenarioName) {
        // Сохраняем название сценария глобально для валидации
        var prevScenarioName = window.currentScenarioName || '';
        window.currentScenarioName = scenarioName;
        
        // Определяем тип сценария
        var isRepPoint = (scenarioName === 'Репетиционная точка');
        var isMusicClass = (scenarioName === 'Музыкальный класс');
        var isMusicSchool = (scenarioName === 'Музыкальная школа');
        // Репточка и Музкласс имеют похожую структуру (без направления, преподавателя, абонемента)
        var isSimplifiedScenario = isRepPoint || isMusicClass;
        
        // Контейнеры полей
        var clientFieldContainer = document.getElementById('client-field-container');
        var directionContainer = document.getElementById('direction-field-container');
        var contactPersonContainer = document.getElementById('contact-person-field-container');
        var peopleCountFieldContainer = document.getElementById('people-count-field-container');
        var teacherRowContainer = document.getElementById('teacher-row-container');
        var teacherFieldContainer = document.getElementById('teacher-field-container');
        var abonementContainer = document.getElementById('abonement-row-container');
        var clientLabel = document.getElementById('client-label');
        var clientSelect = document.getElementById('client');
        
        // Показать/скрыть Направление (только для Музыкальной школы)
        if (directionContainer) {
            directionContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }

        if (clientFieldContainer) {
            clientFieldContainer.classList.remove('col-md-6', 'col-md-5', 'col-md-9');
            if (isRepPoint) {
                clientFieldContainer.classList.add('col-md-5');
            } else {
                clientFieldContainer.classList.add('col-md-6');
            }
        }

        if (contactPersonContainer) {
            contactPersonContainer.style.display = isRepPoint ? '' : 'none';
            contactPersonContainer.classList.remove('col-md-3', 'col-md-5');
            contactPersonContainer.classList.add(isRepPoint ? 'col-md-5' : 'col-md-3');
        }

        if (peopleCountFieldContainer) {
            peopleCountFieldContainer.style.display = isSimplifiedScenario ? '' : 'none';
            peopleCountFieldContainer.classList.remove('col-md-6', 'col-md-3', 'col-md-2');
            peopleCountFieldContainer.classList.add(isRepPoint ? 'col-md-2' : 'col-md-3');
        }
        
        // Показать/скрыть Абонемент (только для Музыкальной школы)
        if (abonementContainer) {
            abonementContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }
        
        // Показать/скрыть Преподаватель (и сам ряд, чтобы не оставлять пустую строку)
        if (teacherRowContainer) {
            teacherRowContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }
        if (teacherFieldContainer) {
            teacherFieldContainer.style.display = isSimplifiedScenario ? 'none' : '';
        }
        
        // Задача 1: Показать/скрыть "Услуги преподавателей" (только для Музыкальной школы)
        var specialistServiceContainer = document.getElementById('specialist-service-container');
        if (specialistServiceContainer) {
            specialistServiceContainer.style.display = isMusicSchool ? '' : 'none';
        }
        
        // Тариф (для Репетиционной точки и Музыкального класса)
        var blocksContainer = document.getElementById('bookingBlocksContainer');
        var blocks = blocksContainer ? blocksContainer.querySelectorAll('.booking-create-block') : [];
        blocks.forEach(function (blockEl) {
            var tariffFieldContainer = blockEl.querySelector('[id^="tariff-field-container"]');
            if (tariffFieldContainer) {
                tariffFieldContainer.style.display = isSimplifiedScenario ? '' : 'none';
            }

            var tariffRow = blockEl.querySelector('[id^="tariff-row"]');
            var servicesLayoutRow = blockEl.querySelector('[id^="services-layout-row"]');
            var servicesContainer = blockEl.querySelector('[id^="services-container"]');
            var servicesBadgesContainer = blockEl.querySelector('[id^="services-badges-container"]');
            var servicesBadgesRow = blockEl.querySelector('[id^="services-badges-row"]');

            if (isSimplifiedScenario) {
                if (tariffRow) {
                    tariffRow.style.display = 'none';
                }

                if (servicesLayoutRow) {
                    servicesLayoutRow.style.display = '';
                }

                if (servicesBadgesRow) {
                    servicesBadgesRow.style.display = '';
                }

                if (servicesLayoutRow && tariffFieldContainer && tariffFieldContainer.parentNode !== servicesLayoutRow) {
                    servicesLayoutRow.insertBefore(tariffFieldContainer, servicesLayoutRow.firstChild);
                }
                if (servicesLayoutRow && servicesContainer && servicesContainer.parentNode !== servicesLayoutRow) {
                    servicesLayoutRow.appendChild(servicesContainer);
                }
                if (servicesLayoutRow && tariffFieldContainer && servicesContainer) {
                    var children = Array.from(servicesLayoutRow.children || []);
                    var ti = children.indexOf(tariffFieldContainer);
                    var si = children.indexOf(servicesContainer);
                    if (ti !== -1 && si !== -1 && si < ti) {
                        servicesLayoutRow.insertBefore(tariffFieldContainer, servicesContainer);
                    }
                }

                if (servicesBadgesRow && servicesBadgesContainer) {
                    var placeholder = servicesBadgesRow.querySelector('[data-services-badges-placeholder="1"]');
                    if (!placeholder) {
                        placeholder = document.createElement('div');
                        placeholder.className = 'col-md-6';
                        placeholder.setAttribute('data-services-badges-placeholder', '1');
                    }
                    if (servicesBadgesContainer.parentNode !== servicesBadgesRow) {
                        servicesBadgesRow.innerHTML = '';
                        servicesBadgesRow.appendChild(placeholder);
                        servicesBadgesRow.appendChild(servicesBadgesContainer);
                    }
                }
            } else {
                if (tariffRow) {
                    tariffRow.style.display = 'none';
                }

                if (servicesBadgesRow) {
                    servicesBadgesRow.style.display = 'none';
                    if (servicesBadgesContainer && servicesBadgesContainer.parentNode === servicesBadgesRow) {
                        servicesBadgesRow.removeChild(servicesBadgesContainer);
                    }
                    servicesBadgesRow.innerHTML = '';
                }

                if (servicesLayoutRow) {
                    servicesLayoutRow.style.display = '';
                }

                if (tariffRow && tariffFieldContainer && tariffFieldContainer.parentNode !== tariffRow) {
                    tariffRow.appendChild(tariffFieldContainer);
                }
                if (servicesLayoutRow && servicesContainer && servicesContainer.parentNode !== servicesLayoutRow) {
                    servicesLayoutRow.insertBefore(servicesContainer, servicesLayoutRow.firstChild);
                }
                if (servicesLayoutRow && servicesBadgesContainer && servicesBadgesContainer.parentNode !== servicesLayoutRow) {
                    servicesLayoutRow.appendChild(servicesBadgesContainer);
                }
            }

        });
        
        // Изменить лейбл клиента (только Репточка — с группами)
        if (clientLabel) {
            clientLabel.textContent = isRepPoint ? 'Клиент / группа' : 'Клиент';
        }
        
        // Показать/скрыть группы в списке клиентов (только Репточка)
        if (clientSelect) {
            var groupOptions = clientSelect.querySelectorAll('.client-group-option');
            groupOptions.forEach(function(opt) {
                opt.style.display = isRepPoint ? '' : 'none';
            });

            var selectedSpan = clientSelect.querySelector('.selected');
            var selectedLi = clientSelect.querySelector('ul.options li.selected:not(#search-option)');
            var selectedType = selectedLi ? String(selectedLi.getAttribute('data-type') || 'client') : '';

            // Если выбранная опция — группа, а текущий сценарий не Репточка — сбрасываем выбор
            if (!isRepPoint && selectedLi && selectedType === 'group') {
                selectedLi.classList.remove('selected');
                if (selectedSpan) {
                    selectedSpan.textContent = 'Выберите клиента';
                }
            } else if (!selectedLi && selectedSpan) {
                selectedSpan.textContent = isRepPoint ? 'Выберите клиента или группу' : 'Выберите клиента';
            }
        }
        
        // Обновить состояние кнопки после адаптации
        if (typeof window.updateSubmitButtonState === 'function') {
            window.updateSubmitButtonState();
        }

        var peopleCountInput = document.getElementById('people-count');
        if (peopleCountInput && prevScenarioName && prevScenarioName !== scenarioName && !isSimplifiedScenario) {
            peopleCountInput.value = '';
        }
    }

    // Функция открытия модального окна: подставляет комнату и сценарий в шапку + базовые hidden-поля
    function openModal(date, time, roomName, roomId, cell) {
        if (typeof window.resetCreateBookingModalSelects === 'function') {
            window.resetCreateBookingModalSelects();
        }

        initializeBulkCreateBlocks();
        if (typeof window.__resetCreateBookingBlocksToSingle === 'function') {
            window.__resetCreateBookingBlocksToSingle();
        }
        // Сбрасываем комментарий при каждом открытии
        var commentField = document.getElementById('bookingComment');
        if (commentField) {
            commentField.value = '';
        }
        var commentCounter = document.getElementById('bookingCommentCounter');
        if (commentCounter) {
            commentCounter.textContent = '0/1000';
        }

        var peopleCountInput = document.getElementById('people-count');
        if (peopleCountInput) {
            peopleCountInput.value = '';
        }
        
        // Комната
        var roomNameSpan = document.getElementById('roomName');
        if (roomNameSpan) {
            roomNameSpan.textContent = roomName;
        }

        // Сценарий: берём из глобального фильтра window.currentScenarioFilterId + window.SCENARIOS (из user_index.html)
        var currentScenarioName = '';
        if (window.currentScenarioFilterId && Array.isArray(window.SCENARIOS)) {
            var scenarioId = String(window.currentScenarioFilterId);
            var scenarioObj = window.SCENARIOS.find(function (s) { return String(s.pk) === scenarioId; });
            var scenarioNameSpan = document.getElementById('scenarioName');
            if (scenarioObj && scenarioObj.fields && scenarioObj.fields.name) {
                currentScenarioName = scenarioObj.fields.name;
            }
            if (scenarioNameSpan) {
                scenarioNameSpan.textContent = currentScenarioName || 'Название сценария';
            }
        }

        // Адаптация UI для разных сценариев
        adaptModalForScenario(currentScenarioName);

        // Базовые скрытые поля (если нужны бэкенду)
        var dateField = document.getElementById('dateField');
        var timeField = document.getElementById('timeField');
        var roomNameField = document.getElementById('roomNameField');
        var roomIdField = document.getElementById('roomIdField');
        var fullDatetimeField = document.getElementById('fullDatetimeField');

        var fullDatetimeStr = (cell && typeof cell.getAttribute === 'function')
            ? (cell.getAttribute('full_datetime') || '')
            : '';

        if (dateField) dateField.value = date;
        if (timeField) timeField.value = time;
        if (roomNameField) roomNameField.value = roomName;
        if (roomIdField) roomIdField.value = roomId;

        if (fullDatetimeField) {
            fullDatetimeField.value = fullDatetimeStr;
        }

        // Видимые поля
        if (fullDatetimeStr) {
            var dtParts = fullDatetimeStr.split(' ');
            if (dtParts.length >= 2) {
                var dateIso = dtParts[0];
                var timeRaw = dtParts[1];
                var timeParts = String(timeRaw).split(':');
                var timeHm = timeParts.length >= 2 ? (timeParts[0] + ':' + timeParts[1]) : String(timeRaw);

                var modalDateInput = document.getElementById('modal-create-date');
                if (modalDateInput) {
                    modalDateInput.value = dateIso;
                }

                // =====================================================
                // МОДУЛЬ УПРАВЛЕНИЯ ВРЕМЕНЕМ БРОНИ
                // =====================================================
                // 
                // Управляет тремя связанными селектами:
                // - Время начала (start-time)
                // - Длительность (duration) — в периодах по minMinutes минут
                // - Время окончания (end-time)
                //
                // ЛОГИКА ВЗАИМОДЕЙСТВИЯ:
                // 1. При выборе времени начала:
                //    - Список окончаний формируется "вправо" от начала
                //    - Если есть окончание — вычисляется длительность
                //
                // 2. При выборе времени окончания:
                //    - Список начала формируется "влево" от окончания
                //    - Если есть начало — вычисляется длительность
                //
                // 3. При выборе длительности:
                //    - Списки начала/окончания фильтруются по длительности
                //    - Если есть начало — подставляется окончание
                //    - Если есть окончание — подставляется начало
                //
                // 4. Кнопка "Добавить" активна только когда выбраны
                //    и время начала, и время окончания
                // =====================================================

                // --- Вспомогательные функции: получение данных сценария ---

                // Получить минимальную длительность периода из текущего сценария (в минутах)
                // Данные берутся из TariffUnit.min_reservation_time (TimeField в формате "HH:MM:SS")
                function getScenarioMinDurationMinutes() {
                    var fallback = 60;
                    if (!window.currentScenarioFilterId) {
                        return fallback;
                    }
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioMinDurationMinutes !== 'function') {
                        return fallback;
                    }
                    return window.BookingTimeUtils.getScenarioMinDurationMinutes(window.currentScenarioFilterId) || fallback;
                }
                // Делаем функцию доступной глобально
                window.getScenarioMinDurationMinutes = getScenarioMinDurationMinutes;

                // Получить work_time_start сценария в минутах от полуночи
                function getScenarioWorkTimeStartMinutes() {
                    if (!window.currentScenarioFilterId) {
                        return 0;
                    }
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioWorkTimeStartMinutes !== 'function') {
                        return 0;
                    }
                    return window.BookingTimeUtils.getScenarioWorkTimeStartMinutes(window.currentScenarioFilterId);
                }

                // Получить work_time_end сценария в минутах от полуночи
                function getScenarioWorkTimeEndMinutes() {
                    if (!window.currentScenarioFilterId) {
                        return 24 * 60;
                    }
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioWorkTimeEndMinutes !== 'function') {
                        return 24 * 60;
                    }
                    return window.BookingTimeUtils.getScenarioWorkTimeEndMinutes(window.currentScenarioFilterId);
                }

                // Получить стоимость одного периода (тарифной единицы) для текущего сценария
                function getScenarioTariffUnitCost() {
                    if (!window.currentScenarioFilterId) {
                        return 0;
                    }
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getScenarioTariffUnitCost !== 'function') {
                        return 0;
                    }
                    return window.BookingTimeUtils.getScenarioTariffUnitCost(window.currentScenarioFilterId) || 0;
                }

                function isTariffScenario() {
                    return window.currentScenarioName === 'Репетиционная точка' || window.currentScenarioName === 'Музыкальный класс';
                }

                function getSelectedTariffData() {
                    var tariffSelect = document.getElementById('tariff');
                    if (!tariffSelect) return null;

                    var selectedLi = tariffSelect.querySelector('ul.options li.selected');
                    if (!selectedLi) return null;

                    var baseCostRaw = String(selectedLi.getAttribute('data-base-cost') || '0').replace(',', '.');
                    var baseCost = parseFloat(baseCostRaw);
                    var baseDurationMinutes = parseInt(selectedLi.getAttribute('data-base-duration-minutes') || '0', 10);

                    var dayIntervalsRaw = selectedLi.getAttribute('data-day-intervals') || '[]';
                    var dayIntervals = [];
                    try {
                        dayIntervals = JSON.parse(dayIntervalsRaw);
                    } catch (e) {
                        dayIntervals = [];
                    }

                    var dayIntervalsMinutes = [];
                    if (Array.isArray(dayIntervals)) {
                        dayIntervals.forEach(function (it) {
                            if (!it) return;
                            var s = parseTimeToMinutes(it.start_time);
                            var e = parseTimeToMinutes(it.end_time);
                            if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
                                dayIntervalsMinutes.push({ startMinutes: s, endMinutes: e });
                            }
                        });
                    }

                    return {
                        baseCost: Number.isFinite(baseCost) ? baseCost : 0,
                        baseDurationMinutes: Number.isFinite(baseDurationMinutes) ? baseDurationMinutes : 0,
                        dayIntervalsMinutes: dayIntervalsMinutes
                    };
                }

                // Получить сумму стоимости выбранных услуг
                function getSelectedServicesCost() {
                    var servicesSelect = document.getElementById('services');
                    if (window.BookingServicesUtils && typeof window.BookingServicesUtils.getSelectedServicesCost === 'function') {
                        return window.BookingServicesUtils.getSelectedServicesCost(servicesSelect);
                    }
                    if (!servicesSelect || !servicesSelect._selectedOptions || servicesSelect._selectedOptions.size === 0) {
                        return 0;
                    }
                    var totalCost = 0;
                    servicesSelect._selectedOptions.forEach(function (li) {
                        var cost = parseFloat(li.getAttribute('data-cost') || '0');
                        if (Number.isFinite(cost)) totalCost += cost;
                    });
                    return totalCost;
                }

                // Обновить бейджи выбранных услуг
                function updateServicesBadges() {
                    if (window.BookingServicesUtils && typeof window.BookingServicesUtils.renderServicesBadges === 'function') {
                        window.BookingServicesUtils.renderServicesBadges({
                            containerId: 'create-selected-services',
                            selectId: 'services',
                            resetBtnId: 'create-reset-services',
                            showResetWhenCountGreaterThan: 1,
                            onSelectionChanged: function () {
                                if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                    window.calculateAndUpdateBookingCost();
                                }
                            }
                        });
                        return;
                    }

                    var container = document.getElementById('create-selected-services');
                    var servicesSelect = document.getElementById('services');
                    var resetBtn = document.getElementById('create-reset-services');
                    if (!container || !servicesSelect) return;
                    
                    container.innerHTML = '';
                    var selectedLis = servicesSelect._selectedOptions ? Array.from(servicesSelect._selectedOptions) : [];

                    // Показываем "Сбросить всё" если выбрано больше 1 услуги
                    if (resetBtn) {
                        resetBtn.style.display = selectedLis.length > 1 ? 'inline' : 'none';
                    }

                    selectedLis.forEach(function(li) {
                        var badge = document.createElement('span');
                        badge.className = 'service-badge';
                        // Используем data-name для получения только названия услуги (без стоимости)
                        badge.textContent = li.getAttribute('data-name') || li.textContent.split('\n')[0].trim();

                        // Крестик удаления услуги
                        var removeBtn = document.createElement('span');
                        removeBtn.className = 'service-badge-remove';
                        removeBtn.innerHTML = '&times;';
                        removeBtn.style.marginLeft = '6px';
                        removeBtn.style.cursor = 'pointer';
                        removeBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            // Убираем услугу из выбранных
                            li.classList.remove('selected');
                            servicesSelect._selectedOptions.delete(li);
                            updateServicesBadges();
                            calculateAndUpdateBookingCost();
                            // Обновляем текст в селекте
                            var selectedSpan = servicesSelect.querySelector('.selected');
                            var count = servicesSelect._selectedOptions.size;
                            if (selectedSpan) {
                                if (count === 0) {
                                    selectedSpan.textContent = 'Выберите услугу';
                                } else if (count === 1) {
                                    selectedSpan.textContent = Array.from(servicesSelect._selectedOptions)[0].textContent;
                                } else {
                                    selectedSpan.textContent = count + ' выбрано';
                                }
                            }
                        });
                        badge.appendChild(removeBtn);
                        container.appendChild(badge);
                    });
                }
                // Делаем функцию доступной глобально для вызова из других блоков кода
                window.updateServicesBadges = updateServicesBadges;

                // Рассчитать и обновить стоимость брони
                // Стоимость = (кол-во периодов × стоимость периода) + сумма услуг
                // Если время не выбрано — показываем только стоимость услуг
                function calculateAndUpdateBookingCost() {
                    if (!isTariffScenario() && window.BookingServicesUtils && typeof window.BookingServicesUtils.calculateAndUpdateTotalCost === 'function') {
                        window.BookingServicesUtils.calculateAndUpdateTotalCost({
                            costElementId: 'bookingCostValue',
                            servicesSelectId: 'services',
                            selectedPeriods: currentSelectedPeriods,
                            periodCost: getScenarioTariffUnitCost()
                        });
                        return;
                    }

                    var costElement = document.getElementById('bookingCostValue');
                    if (!costElement) return;

                    if (isTariffScenario()) {
                        var servicesCostForTariff = getSelectedServicesCost();
                        var tariffData = getSelectedTariffData();

                        var durationMinutes = null;
                        if (
                            currentStartTimeMinutes !== null && currentStartTimeMinutes !== undefined &&
                            currentEndTimeMinutes !== null && currentEndTimeMinutes !== undefined &&
                            currentEndTimeMinutes > currentStartTimeMinutes
                        ) {
                            durationMinutes = currentEndTimeMinutes - currentStartTimeMinutes;
                        } else if (currentSelectedPeriods !== null && currentSelectedPeriods !== undefined) {
                            durationMinutes = minMinutes * currentSelectedPeriods;
                        }

                        var rentalCost = 0;
                        if (tariffData && durationMinutes !== null && tariffData.baseDurationMinutes > 0) {
                            rentalCost = tariffData.baseCost * (durationMinutes / tariffData.baseDurationMinutes);
                        }

                        var totalTariffCost = rentalCost + servicesCostForTariff;
                        var formattedTariff = Number(totalTariffCost || 0).toFixed(2).replace(/\.00$/, '');
                        costElement.textContent = formattedTariff + ' BYN';
                        return;
                    }
                    
                    // Стоимость периодов (0 если время не выбрано)
                    var periodsTotalCost = 0;
                    if (currentSelectedPeriods !== null && currentSelectedPeriods !== undefined) {
                        var periodCost = getScenarioTariffUnitCost();
                        periodsTotalCost = currentSelectedPeriods * periodCost;
                    }
                    
                    // Стоимость услуг всегда учитывается
                    var servicesCost = getSelectedServicesCost();
                    var totalCost = periodsTotalCost + servicesCost;
                    
                    // Форматируем с 2 знаками после запятой, убираем лишние нули
                    var formatted = totalCost.toFixed(2).replace(/\.00$/, '');
                    costElement.textContent = formatted + ' BYN';
                }
                // Делаем функцию доступной глобально для вызова из других блоков кода
                window.calculateAndUpdateBookingCost = calculateAndUpdateBookingCost;

                // Преобразовать datetime строку "YYYY-MM-DD HH:MM:SS" в объект Date
                function parseDatetimeStr(dtStr) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.parseDatetimeStr !== 'function') {
                        return null;
                    }
                    return window.BookingTimeUtils.parseDatetimeStr(dtStr);
                }

                // Форматирование времени из минут от полуночи в HH:MM
                function formatTimeHHMM(totalMinutes) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.formatTimeHHMM !== 'function') {
                        return '';
                    }
                    return window.BookingTimeUtils.formatTimeHHMM(totalMinutes);
                }

                // Парсинг времени HH:MM в минуты от полуночи
                function parseTimeToMinutes(timeStr) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.parseTimeToMinutes !== 'function') {
                        return 0;
                    }
                    return window.BookingTimeUtils.parseTimeToMinutes(timeStr);
                }

                // Форматирование длительности для отображения
                function formatDurationHuman(totalMinutes) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.formatDurationHuman !== 'function') {
                        return '';
                    }
                    return window.BookingTimeUtils.formatDurationHuman(totalMinutes);
                }

                // Форматирование длительности в HH:MM для отправки на сервер
                function formatDurationHHMM(totalMinutes) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.formatDurationHHMM !== 'function') {
                        return '';
                    }
                    return window.BookingTimeUtils.formatDurationHHMM(totalMinutes);
                }

                // Склонение слова "период"
                function formatPeriodsLabel(n) {
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.formatPeriodsLabel !== 'function') {
                        return '';
                    }
                    return window.BookingTimeUtils.formatPeriodsLabel(n);
                }

                // Кэш броней комнаты на дату (загружается через AJAX, содержит ВСЕ брони комнаты без фильтра по сценарию)
                var roomBookingsCache = {
                    roomId: null,
                    date: null,
                    bookings: []
                };
                
                // Загрузить все брони комнаты на дату через AJAX (без фильтра по сценарию)
                function loadRoomBookingsForDate(roomId, dateIso, callback) {
                    // Приводим roomId к строке для корректного сравнения
                    var roomIdStr = String(roomId);
                    
                    // Проверяем кэш
                    if (roomBookingsCache.roomId === roomIdStr && roomBookingsCache.date === dateIso) {
                        if (callback) callback(roomBookingsCache.bookings);
                        return;
                    }

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.loadRoomBookingsForDate !== 'function') {
                        roomBookingsCache.roomId = roomIdStr;
                        roomBookingsCache.date = dateIso;
                        roomBookingsCache.bookings = [];
                        if (callback) callback([]);
                        return;
                    }

                    // Принудительно перезагружаем данные при смене даты (forceReload=true)
                    window.BookingTimeUtils.loadRoomBookingsForDate(roomIdStr, dateIso, null, function (intervals) {
                        roomBookingsCache.roomId = roomIdStr;
                        roomBookingsCache.date = dateIso;
                        roomBookingsCache.bookings = Array.isArray(intervals) ? intervals : [];
                        if (callback) callback(roomBookingsCache.bookings);
                    }, true);
                }
                
                // --- Кэш занятых специалистов на дату ---
                // Важно: endpoint возвращает интервалы "busy" как от броней, так и от
                // расписания (недоступность вне рабочих интервалов).
                var busySpecialistsCache = {
                    date: null,
                    specialists: [] // [{id, name, intervals: [{startMinutes, endMinutes}]}]
                };
                
                // Загрузить занятых специалистов на дату через AJAX
                function loadBusySpecialistsForDate(dateIso, callback) {
                    // Проверяем кэш
                    if (busySpecialistsCache.date === dateIso) {
                        if (callback) callback(busySpecialistsCache.specialists);
                        return;
                    }
                    
                    var url = '/booking/busy-specialists-for-date/?date=' + encodeURIComponent(dateIso);
                    
                    fetch(url, {
                        method: 'GET',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.success && Array.isArray(data.busy_specialists)) {
                            busySpecialistsCache.date = dateIso;
                            busySpecialistsCache.specialists = data.busy_specialists;
                            if (callback) callback(data.busy_specialists);
                        } else {
                            console.error('Ошибка загрузки занятых специалистов:', data.error || 'unknown');
                            if (callback) callback([]);
                        }
                    })
                    .catch(function(error) {
                        console.error('Сетевая ошибка при загрузке занятых специалистов:', error);
                        if (callback) callback([]);
                    });
                }
                
                // Проверить, занят ли специалист в указанное время
                function isSpecialistBusy(specialistId, startMinutes, endMinutes) {
                    var busySpecs = busySpecialistsCache.specialists || [];
                    for (var i = 0; i < busySpecs.length; i++) {
                        if (busySpecs[i].id === specialistId) {
                            var intervals = busySpecs[i].intervals || [];
                            for (var j = 0; j < intervals.length; j++) {
                                var interval = intervals[j];
                                // Интервалы могут означать как реальную занятость бронью,
                                // так и "не работает" по расписанию (gaps).
                                // Пересечение: (start1 < end2) && (end1 > start2)
                                if (startMinutes < interval.endMinutes && endMinutes > interval.startMinutes) {
                                    return true;
                                }
                            }
                            break;
                        }
                    }
                    return false;
                }
                // Делаем функцию доступной глобально
                window.isSpecialistBusy = isSpecialistBusy;
                
                // Получить список доступных специалистов для выбранного времени
                function getAvailableSpecialistIds(startMinutes, endMinutes) {
                    var busySpecs = busySpecialistsCache.specialists || [];
                    var busyIds = [];
                    for (var i = 0; i < busySpecs.length; i++) {
                        if (isSpecialistBusy(busySpecs[i].id, startMinutes, endMinutes)) {
                            busyIds.push(busySpecs[i].id);
                        }
                    }
                    return busyIds;
                }
                
                // Получить все брони в комнате на выбранную дату (из кэша)
                function getRoomBookingsForDate(currentRoomId, dateIso) {
                    // Возвращаем из кэша (должен быть уже загружен через loadRoomBookingsForDate)
                    if (roomBookingsCache.roomId === String(currentRoomId) && roomBookingsCache.date === dateIso) {
                        return roomBookingsCache.bookings;
                    }
                    // Fallback на старый способ если кэш пуст
                    var bookings = window.bookingsInRange || (typeof bookingsInRange !== 'undefined' ? bookingsInRange : []);
                    if (!Array.isArray(bookings)) return [];

                    if (window.BookingTimeUtils && typeof window.BookingTimeUtils.normalizeRoomBookingsForDate === 'function') {
                        var filtered = bookings.filter(function (booking) {
                            return booking && String(booking.idroom) === String(currentRoomId);
                        });
                        return window.BookingTimeUtils.normalizeRoomBookingsForDate(filtered, dateIso, null);
                    }

                    return [];
                }

                // Вычислить доступные слоты времени начала для комнаты на дату
                // Шаг = 15 минут (шаг сетки календаря), слот доступен если есть minMinutes до брони/конца дня
                function getAvailableStartTimeSlots(currentRoomId, dateIso) {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getAvailableStartTimeSlots !== 'function') {
                        return [];
                    }

                    var slots = window.BookingTimeUtils.getAvailableStartTimeSlots(roomBookings, workStart, workEnd, minMinutes);
                    return filterStartSlotsByTariffDayIntervals(slots, 1);
                }

                // Вычислить максимальное количество периодов для заданного времени начала
                function getMaxPeriodsForStartTime(startTimeMinutes, currentRoomId, dateIso) {
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getMaxPeriodsForStartTime !== 'function') {
                        return 0;
                    }

                    var baseMax = window.BookingTimeUtils.getMaxPeriodsForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes);
                    return limitMaxPeriodsByTariffForStart(startTimeMinutes, baseMax);
                }

                // --- Состояние модуля ---
                // Длительность — главный показатель. Списки начала/конца формируются по ней.
                var currentRoomId = roomIdField ? roomIdField.value : roomId;
                var minMinutes = getScenarioMinDurationMinutes();
                window.currentMinMinutes = minMinutes;
                var clickedSlotMinutes = parseTimeToMinutes(timeHm);
                
                // Текущие выбранные значения (null = не выбрано, показывается placeholder)
                // Используем window для доступа из других IIFE
                var currentStartTimeMinutes = null;
                var currentSelectedPeriods = 1;
                var currentEndTimeMinutes = null;
                var tariffTimeFrozen = false;
                var lastTariffBaseDurationMinutes = null;
                
                // Функции для синхронизации с глобальными переменными
                function setStartTimeMinutes(val) {
                    currentStartTimeMinutes = val;
                    window.currentStartTimeMinutes = val;
                }
                function setEndTimeMinutes(val) {
                    currentEndTimeMinutes = val;
                    window.currentEndTimeMinutes = val;
                }
                // Инициализация глобальных переменных
                window.currentStartTimeMinutes = null;
                window.currentEndTimeMinutes = null;

                // --- DOM элементы ---
                var startTimeSelect = document.getElementById('start-time');
                var durationSelect = document.getElementById('duration');
                var endTimeSelect = document.getElementById('end-time');
                var submitBtn = document.getElementById('createBookingSubmitBtn');

                function getSelectedSpecialistServiceDurationMinutes() {
                    var specialistServiceSelect = document.getElementById('specialist-service');
                    if (!specialistServiceSelect) return null;
                    var selectedLi = specialistServiceSelect.querySelector('ul.options li.selected');
                    if (!selectedLi) return null;
                    var raw = selectedLi.getAttribute('data-duration-minutes') || '0';
                    var n = parseInt(raw, 10);
                    return Number.isFinite(n) && n > 0 ? n : null;
                }

                function setCustomSelectDisabled(selectEl, disabled, placeholderText) {
                    if (!selectEl) return;
                    if (disabled) {
                        selectEl.classList.add('disabled');
                        selectEl.classList.remove('open');
                    } else {
                        selectEl.classList.remove('disabled');
                    }

                    if (disabled && placeholderText) {
                        var selectedSpan = selectEl.querySelector('.selected');
                        if (selectedSpan) selectedSpan.textContent = placeholderText;
                        var optionsUl = selectEl.querySelector('ul.options');
                        if (optionsUl) {
                            optionsUl.querySelectorAll('li').forEach(function (li) {
                                li.classList.remove('selected');
                            });
                        }
                        selectEl.classList.remove('has-selection');
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

                function syncCreateBookingMusicSchoolTimeFields() {
                    var isMusicSchool = window.currentScenarioName === 'Музыкальная школа';
                    if (!isMusicSchool) return;

                    var serviceMinMinutes = getSelectedSpecialistServiceDurationMinutes();
                    if (!serviceMinMinutes) {
                        minMinutes = getScenarioMinDurationMinutes();
                        window.currentMinMinutes = minMinutes;
                        currentSelectedPeriods = null;
                        currentEndTimeMinutes = null;
                        window.currentEndTimeMinutes = null;

                        setCustomSelectDisabled(
                            durationSelect,
                            true,
                            durationSelect ? (durationSelect.getAttribute('data-placeholder') || 'Выберите длительность') : null
                        );
                        setCustomSelectDisabled(
                            endTimeSelect,
                            true,
                            endTimeSelect ? (endTimeSelect.getAttribute('data-placeholder') || 'Выберите время окончания') : null
                        );

                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                        if (typeof window.calculateAndUpdateBookingCost === 'function') {
                            window.calculateAndUpdateBookingCost();
                        }
                        return;
                    }

                    var prevMinMinutes = minMinutes;
                    minMinutes = serviceMinMinutes;
                    window.currentMinMinutes = minMinutes;

                    setCustomSelectDisabled(durationSelect, false);
                    setCustomSelectDisabled(endTimeSelect, false);

                    if (prevMinMinutes !== minMinutes) {
                        currentSelectedPeriods = null;
                        currentEndTimeMinutes = null;
                        window.currentEndTimeMinutes = null;
                    }

                    var allStartSlots = getStartTimeSlotsForPeriods(1);
                    rebuildStartTimeSelect(allStartSlots, currentStartTimeMinutes);

                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    if (startTimeWarning && currentStartTimeMinutes !== null) {
                        startTimeWarning.style.display = allStartSlots.indexOf(currentStartTimeMinutes) === -1 ? 'inline-block' : 'none';
                    }

                    var maxPeriods = currentStartTimeMinutes !== null
                        ? getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso)
                        : getGlobalMaxPeriods();

                    rebuildDurationSelect(currentSelectedPeriods, maxPeriods);

                    var endTimes = currentStartTimeMinutes !== null
                        ? getEndTimesForStartTime(currentStartTimeMinutes)
                        : getAllEndTimesForPeriods(1);

                    rebuildEndTimeSelect(endTimes, currentEndTimeMinutes);

                    updateSubmitButtonState();
                    if (typeof window.calculateAndUpdateBookingCost === 'function') {
                        window.calculateAndUpdateBookingCost();
                    }
                }
                window.syncCreateBookingMusicSchoolTimeFields = syncCreateBookingMusicSchoolTimeFields;

                function getTariffDayIntervalsMinutesOrNull() {
                    if (!isTariffScenario()) return null;
                    var td = getSelectedTariffData();
                    if (!td || !Array.isArray(td.dayIntervalsMinutes) || td.dayIntervalsMinutes.length === 0) {
                        return null;
                    }
                    return td.dayIntervalsMinutes;
                }

                function filterStartSlotsByTariffDayIntervals(slotsMinutes, requiredPeriods) {
                    var slots = Array.isArray(slotsMinutes) ? slotsMinutes : [];
                    var intervals = getTariffDayIntervalsMinutesOrNull();
                    if (!intervals) return slots;
                    var req = (Number.isFinite(requiredPeriods) ? requiredPeriods : 1) * minMinutes;
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

                    for (var i = 0; i < intervals.length; i++) {
                        var it = intervals[i];
                        if (startTimeMinutes >= it.startMinutes && startTimeMinutes < it.endMinutes) {
                            var maxByTariff = Math.floor((it.endMinutes - startTimeMinutes) / minMinutes);
                            return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
                        }
                    }
                    return 0;
                }

                function limitMaxPeriodsByTariffForEnd(endTimeMinutes, baseMaxPeriods) {
                    var intervals = getTariffDayIntervalsMinutesOrNull();
                    if (!intervals) return baseMaxPeriods;

                    for (var i = 0; i < intervals.length; i++) {
                        var it = intervals[i];
                        if (endTimeMinutes > it.startMinutes && endTimeMinutes <= it.endMinutes) {
                            var maxByTariff = Math.floor((endTimeMinutes - it.startMinutes) / minMinutes);
                            return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
                        }
                    }
                    return 0;
                }

                function limitGlobalMaxPeriodsByTariff(baseMaxPeriods) {
                    var intervals = getTariffDayIntervalsMinutesOrNull();
                    if (!intervals) return baseMaxPeriods;

                    var maxByTariff = 0;
                    for (var i = 0; i < intervals.length; i++) {
                        var it = intervals[i];
                        var n = Math.floor((it.endMinutes - it.startMinutes) / minMinutes);
                        if (n > maxByTariff) maxByTariff = n;
                    }
                    return Math.max(0, Math.min(baseMaxPeriods, maxByTariff));
                }

                function syncCreateBookingTariffTimeFields() {
                    if (!isTariffScenario()) return;

                    var tariffData = getSelectedTariffData();
                    var tariffMinMinutes = tariffData ? tariffData.baseDurationMinutes : null;
                    var hasTariff = !!(tariffMinMinutes && Number.isFinite(tariffMinMinutes) && tariffMinMinutes > 0);

                    if (!hasTariff) {
                        tariffTimeFrozen = true;
                        minMinutes = getScenarioMinDurationMinutes();
                        window.currentMinMinutes = minMinutes;

                        setCustomSelectFrozenDisabled(durationSelect, true);
                        setCustomSelectFrozenDisabled(endTimeSelect, true);

                        var allStartSlotsNoTariff = getStartTimeSlotsForPeriods(1);
                        rebuildStartTimeSelect(allStartSlotsNoTariff, currentStartTimeMinutes);

                        var startTimeWarningNoTariff = document.getElementById('start-time-warning-icon');
                        if (startTimeWarningNoTariff && currentStartTimeMinutes !== null) {
                            startTimeWarningNoTariff.style.display = allStartSlotsNoTariff.indexOf(currentStartTimeMinutes) === -1 ? 'inline-block' : 'none';
                        }

                        if (typeof window.updateSubmitButtonState === 'function') {
                            window.updateSubmitButtonState();
                        }
                        if (typeof window.calculateAndUpdateBookingCost === 'function') {
                            window.calculateAndUpdateBookingCost();
                        }
                        return;
                    }

                    tariffTimeFrozen = false;

                    var shouldResetByTariffBase = (lastTariffBaseDurationMinutes !== null && lastTariffBaseDurationMinutes !== tariffMinMinutes);
                    lastTariffBaseDurationMinutes = tariffMinMinutes;

                    var prevMinMinutes = minMinutes;
                    minMinutes = tariffMinMinutes;
                    window.currentMinMinutes = minMinutes;

                    setCustomSelectFrozenDisabled(durationSelect, false);
                    setCustomSelectFrozenDisabled(endTimeSelect, false);

                    if (prevMinMinutes !== minMinutes) {
                        currentSelectedPeriods = null;
                        currentEndTimeMinutes = null;
                        window.currentEndTimeMinutes = null;
                    }

                    var allStartSlots = getStartTimeSlotsForPeriods(1);
                    rebuildStartTimeSelect(allStartSlots, currentStartTimeMinutes);

                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    if (startTimeWarning && currentStartTimeMinutes !== null) {
                        startTimeWarning.style.display = allStartSlots.indexOf(currentStartTimeMinutes) === -1 ? 'inline-block' : 'none';
                    }

                    var maxPeriods = currentStartTimeMinutes !== null
                        ? getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso)
                        : getGlobalMaxPeriods();

                    rebuildDurationSelect(currentSelectedPeriods, maxPeriods);

                    var endTimes;
                    if (currentSelectedPeriods !== null) {
                        endTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                    } else if (currentStartTimeMinutes !== null) {
                        endTimes = getEndTimesForStartTime(currentStartTimeMinutes);
                    } else {
                        endTimes = getAllEndTimesForPeriods(1);
                    }
                    rebuildEndTimeSelect(endTimes, currentEndTimeMinutes);

                    if (typeof window.updateSubmitButtonState === 'function') {
                        window.updateSubmitButtonState();
                    }
                    if (typeof window.calculateAndUpdateBookingCost === 'function') {
                        window.calculateAndUpdateBookingCost();
                    }
                }
                window.syncCreateBookingTariffTimeFields = syncCreateBookingTariffTimeFields;

                // --- Функции формирования списков времени ---

                // Получить слоты времени начала, с которых доступно >= requiredPeriods периодов
                function getStartTimeSlotsForPeriods(requiredPeriods) {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getStartTimeSlotsForPeriods !== 'function') {
                        return [];
                    }

                    var slots = window.BookingTimeUtils.getStartTimeSlotsForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes);
                    return filterStartSlotsByTariffDayIntervals(slots, requiredPeriods);
                }

                // Получить все возможные времена окончания для заданного кол-ва периодов (глобально)
                function getAllEndTimesForPeriods(requiredPeriods) {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getAllEndTimesForPeriods !== 'function') {
                        return [];
                    }

                    var endTimes = window.BookingTimeUtils.getAllEndTimesForPeriods(requiredPeriods, roomBookings, workStart, workEnd, minMinutes);
                    return filterEndTimesByTariffForPeriods(endTimes, requiredPeriods);
                }

                // Получить времена окончания "вправо" от заданного времени начала (для конкретного слота)
                function getEndTimesForStartTime(startTimeMinutes) {
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getEndTimesForStartTime !== 'function') {
                        return [];
                    }

                    var endTimes = window.BookingTimeUtils.getEndTimesForStartTime(startTimeMinutes, roomBookings, workEnd, minMinutes);
                    return filterEndTimesByTariffForStart(endTimes, startTimeMinutes);
                }

                // Получить времена начала "влево" от заданного времени окончания (для конкретного слота)
                function getStartTimesForEndTime(endTimeMinutes) {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getStartTimesForEndTime !== 'function') {
                        return [];
                    }

                    var startTimes = window.BookingTimeUtils.getStartTimesForEndTime(endTimeMinutes, roomBookings, workStart, workEnd, minMinutes);
                    return filterStartTimesByTariffForEnd(startTimes, endTimeMinutes);
                }

                // --- Вычислить глобальное максимальное количество периодов ---
                function getGlobalMaxPeriods() {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getGlobalMaxPeriods !== 'function') {
                        return 0;
                    }

                    var baseMax = window.BookingTimeUtils.getGlobalMaxPeriods(roomBookings, workStart, workEnd, minMinutes);
                    return limitGlobalMaxPeriodsByTariff(baseMax);
                }

                // --- Вычислить максимальное количество периодов для времени окончания ---
                function getMaxPeriodsForEndTime(endTimeMinutes) {
                    var workStart = getScenarioWorkTimeStartMinutes();
                    var workEnd = getScenarioWorkTimeEndMinutes();
                    var roomBookings = getRoomBookingsForDate(currentRoomId, dateIso);

                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.getMaxPeriodsForEndTime !== 'function') {
                        return 0;
                    }

                    var baseMax = window.BookingTimeUtils.getMaxPeriodsForEndTime(endTimeMinutes, roomBookings, workStart, workEnd, minMinutes);
                    return limitMaxPeriodsByTariffForEnd(endTimeMinutes, baseMax);
                }

                // --- Функции управления UI ---

                function updateSubmitButtonState() {
                    var scenarioName = window.currentScenarioName || '';
                    var isRepPoint = (scenarioName === 'Репетиционная точка');
                    var isMusicClass = (scenarioName === 'Музыкальный класс');
                    var isSimplifiedScenario = isRepPoint || isMusicClass;
                    var checklist = [];

                    // Shared: преподаватель/направление/услуга преподавателя + клиент/группа + контакт/люди
                    var teacherSelectForWarning = document.getElementById('teacher');
                    var teacherWarning = document.getElementById('teacher-warning-icon');
                    var hasTeacherWarning = teacherWarning && teacherWarning.style.display !== 'none';
                    if (teacherSelectForWarning) {
                        teacherSelectForWarning.classList.remove('has-warning');
                        teacherSelectForWarning.classList.toggle('has-warning', !isSimplifiedScenario && !!hasTeacherWarning);
                    }

                    var teacherSelect = document.getElementById('teacher');
                    var directionSelect = document.getElementById('field-direction');
                    var clientSelect = document.getElementById('client');
                    var contactPersonSelect = document.getElementById('contact-person');

                    if (directionSelect) {
                        directionSelect.classList.remove('has-warning');
                    }
                    if (clientSelect) {
                        clientSelect.classList.remove('has-warning');
                    }
                    if (contactPersonSelect) {
                        contactPersonSelect.classList.remove('has-warning');
                    }
                    var specialistServiceSelectForWarning = document.getElementById('specialist-service');
                    if (specialistServiceSelectForWarning) {
                        specialistServiceSelectForWarning.classList.remove('has-warning');
                    }

                    var teacherSelectedLi = teacherSelect ? teacherSelect.querySelector('ul.options li.selected') : null;
                    var directionSelectedLi = directionSelect ? directionSelect.querySelector('ul.options li.selected') : null;
                    var clientSelectedLi = clientSelect ? clientSelect.querySelector('ul.options li.selected:not(#search-option)') : null;

                    var hasTeacher = teacherSelectedLi !== null;
                    var hasDirection = directionSelectedLi !== null;

                    var hasClient = clientSelectedLi !== null && clientSelectedLi.getAttribute('data-value');
                    var isGroupSelected = clientSelectedLi && clientSelectedLi.getAttribute('data-type') === 'group';
                    var hasClientOrGroup = hasClient || isGroupSelected;

                    var contactSelectedLi = contactPersonSelect ? contactPersonSelect.querySelector('ul.options li.selected') : null;
                    var hasContactPerson = !!(contactSelectedLi && contactSelectedLi.getAttribute('data-value'));

                    var peopleCountInput = document.getElementById('people-count');
                    if (peopleCountInput) {
                        peopleCountInput.classList.remove('has-warning');
                    }
                    
                    // Формируем чек-лист
                    var blocksContainer = document.getElementById('bookingBlocksContainer');
                    var blocks = blocksContainer ? Array.from(blocksContainer.querySelectorAll('.booking-create-block')) : [];
                    if (!blocks.length) {
                        var rootEl = document.getElementById('createBookingModal') || document;
                        blocks = [rootEl];
                    }

                    blocks.forEach(function (blockEl, idx) {
                        var blockPrefix = '№' + String(idx + 1) + ': ';

                        var blockErrors = [];

                        if (blockEl && Array.isArray(blockEl._bulkServerErrors) && blockEl._bulkServerErrors.length) {
                            var snap = blockEl._bulkServerErrorSnapshots || {};
                            blockEl._bulkServerErrors = blockEl._bulkServerErrors.filter(function (e) {
                                if (!e) return false;
                                var key = String(e.field || '');
                                var before = snap[key];
                                if (before === undefined) return true;
                                var now = _getComparableValueForBlockField(blockEl, e.field);
                                if (now !== before) {
                                    try { delete snap[key]; } catch (ex) {}
                                    return false;
                                }
                                return true;
                            });
                            blockEl._bulkServerErrorSnapshots = snap;
                        }

                        var dateInput = blockEl.querySelector('input[id^="modal-create-date"]');
                        var dateIso = dateInput ? String(dateInput.value || '').trim() : '';
                        var dateTrigger = blockEl.querySelector('[id^="datepicker-trigger"]');
                        if (dateTrigger) {
                            dateTrigger.classList.remove('has-warning');
                        }
                        if (!dateIso) {
                            blockErrors.push('Выберите дату');
                            if (dateTrigger) {
                                dateTrigger.classList.add('has-warning');
                            }
                        }

                        var startTimeSelectEl = blockEl.querySelector('.custom-select[id^="start-time"]');
                        var endTimeSelectEl = blockEl.querySelector('.custom-select[id^="end-time"]');
                        var durationSelectEl = blockEl.querySelector('.custom-select[id^="duration"]');

                        var startSelected = startTimeSelectEl ? startTimeSelectEl.querySelector('ul.options li.selected') : null;
                        var endSelected = endTimeSelectEl ? endTimeSelectEl.querySelector('ul.options li.selected') : null;
                        var durationSelected = durationSelectEl ? durationSelectEl.querySelector('ul.options li.selected') : null;

                        var startWarning = blockEl.querySelector('[id^="start-time-warning-icon"]');
                        var endWarning = blockEl.querySelector('[id^="end-time-warning-icon"]');
                        var hasStartWarning = startWarning && startWarning.style.display !== 'none';
                        var hasEndWarning = endWarning && endWarning.style.display !== 'none';

                        if (startTimeSelectEl) {
                            startTimeSelectEl.classList.toggle('has-warning', !!hasStartWarning);
                        }
                        if (endTimeSelectEl) {
                            endTimeSelectEl.classList.toggle('has-warning', !!hasEndWarning);
                        }
                        if (durationSelectEl) {
                            durationSelectEl.classList.remove('has-warning');
                        }

                        if (!startSelected) {
                            blockErrors.push('Выберите время начала');
                            if (startTimeSelectEl) {
                                startTimeSelectEl.classList.add('has-warning');
                            }
                        } else if (hasStartWarning) {
                            blockErrors.push('Выберите доступное время начала');
                        }

                        if (!endSelected) {
                            blockErrors.push('Выберите время окончания');
                            if (endTimeSelectEl) {
                                endTimeSelectEl.classList.add('has-warning');
                            }
                        } else if (hasEndWarning) {
                            blockErrors.push('Выберите доступное время окончания');
                        }

                        if (!durationSelected) {
                            blockErrors.push('Выберите длительность');
                            if (durationSelectEl) {
                                durationSelectEl.classList.add('has-warning');
                            }
                        }

                        if (isSimplifiedScenario) {
                            var tariffSelectEl = blockEl.querySelector('.custom-select[id^="tariff"]');
                            var tariffSelected = tariffSelectEl ? tariffSelectEl.querySelector('ul.options li.selected') : null;
                            if (tariffSelectEl) {
                                tariffSelectEl.classList.remove('has-warning');
                            }
                            if (!tariffSelected) {
                                blockErrors.push('Выберите тариф');
                                if (tariffSelectEl) {
                                    tariffSelectEl.classList.add('has-warning');
                                }
                            }
                        }

                        var serverErrors = (blockEl && Array.isArray(blockEl._bulkServerErrors)) ? blockEl._bulkServerErrors : [];
                        if (serverErrors.length) {
                            serverErrors.forEach(function (e) {
                                if (e && e.message) {
                                    blockErrors.push(String(e.message));
                                }
                                var f = e ? e.field : null;
                                if (f === 'full_datetime') {
                                    if (dateTrigger) dateTrigger.classList.add('has-warning');
                                    if (startTimeSelectEl) startTimeSelectEl.classList.add('has-warning');
                                } else if (f === 'duration') {
                                    if (durationSelectEl) durationSelectEl.classList.add('has-warning');
                                } else if (f === 'tariff_id') {
                                    var tariffSelectEl2 = blockEl.querySelector('.custom-select[id^="tariff"]');
                                    if (tariffSelectEl2) tariffSelectEl2.classList.add('has-warning');
                                }
                            });
                        }

                        var blockWarning = blockEl.querySelector('[id^="block-warning-icon"]');
                        var blockChecklistEl = blockEl.querySelector('[id^="block-checklist"]');

                        if (blockErrors.length > 0) {
                            checklist = checklist.concat(blockErrors.map(function (msg) {
                                return blockPrefix + msg;
                            }));
                            blockEl.classList.add('booking-create-block--has-errors');

                            if (blockWarning) blockWarning.style.display = 'inline-block';
                            if (blockChecklistEl) {
                                blockChecklistEl.innerHTML = blockErrors.map(function (item) {
                                    return '<li>' + item + '</li>';
                                }).join('');
                            }
                        } else {
                            blockEl.classList.remove('booking-create-block--has-errors');

                            if (blockWarning) blockWarning.style.display = 'none';
                            if (blockChecklistEl) {
                                blockChecklistEl.innerHTML = '';
                            }
                        }
                    });
                    
                    // Преподаватель, направление и услуга преподавателя требуются только для Музыкальной школы
                    if (!isSimplifiedScenario) {
                        if (!hasTeacher) {
                            checklist.push('Выберите преподавателя');
                            if (teacherSelect) {
                                teacherSelect.classList.add('has-warning');
                            }
                        } else if (hasTeacherWarning) {
                            checklist.push('Выберите доступного преподавателя');
                            if (teacherSelect) {
                                teacherSelect.classList.add('has-warning');
                            }
                        }
                        
                        if (!hasDirection) {
                            checklist.push('Выберите направление');
                            if (directionSelect) {
                                directionSelect.classList.add('has-warning');
                            }
                        }
                        
                        // Проверяем выбор услуги преподавателя
                        var specialistServiceSelect = document.getElementById('specialist-service');
                        var specialistServiceSelectedLi = specialistServiceSelect ? specialistServiceSelect.querySelector('ul.options li.selected') : null;
                        var hasSpecialistService = specialistServiceSelectedLi !== null;
                        if (!hasSpecialistService) {
                            checklist.push('Выберите услугу преподавателя');
                            if (specialistServiceSelect) {
                                specialistServiceSelect.classList.add('has-warning');
                            }
                        }
                    }

                    // Для Репточки - клиент или группа, для остальных - только клиент
                    if (!hasClientOrGroup) {
                        checklist.push(isRepPoint ? 'Выберите клиента или группу' : 'Выберите клиента');
                        if (clientSelect) {
                            clientSelect.classList.add('has-warning');
                        }
                    }

                    var peopleCountVal = peopleCountInput ? String(peopleCountInput.value || '').trim() : '';
                    if (isSimplifiedScenario) {
                        if (!peopleCountVal) {
                            checklist.push('Укажите количество людей');
                            if (peopleCountInput) {
                                peopleCountInput.classList.add('has-warning');
                            }
                        } else {
                            var pcInt = parseInt(peopleCountVal, 10);
                            if (!Number.isFinite(pcInt) || pcInt < 1 || pcInt > 99) {
                                checklist.push('Количество людей должно быть от 1 до 99');
                                if (peopleCountInput) {
                                    peopleCountInput.classList.add('has-warning');
                                }
                            }
                        }

                        // Тариф проверяется per-block выше
                    }

                    var modalEl = document.getElementById('createBookingModal');

                    if (modalEl && Array.isArray(modalEl._bulkServerErrorsGlobal) && modalEl._bulkServerErrorsGlobal.length) {
                        var snapG = modalEl._bulkServerErrorSnapshotsGlobal || {};
                        modalEl._bulkServerErrorsGlobal = modalEl._bulkServerErrorsGlobal.filter(function (e) {
                            if (!e) return false;
                            var key = String(e.field || '');
                            var before = snapG[key];
                            if (before === undefined) return true;
                            var now = _getComparableValueForSharedField(e.field);
                            if (now !== before) {
                                try { delete snapG[key]; } catch (ex) {}
                                return false;
                            }
                            return true;
                        });
                        modalEl._bulkServerErrorSnapshotsGlobal = snapG;

                        modalEl._bulkServerErrorsGlobal.forEach(function (e) {
                            if (!e || !e.message) return;
                            checklist.push(String(e.message));

                            if (e.field === 'people_count' && peopleCountInput) {
                                peopleCountInput.classList.add('has-warning');
                            }
                            if ((e.field === 'client_id' || e.field === 'client_group_id') && clientSelect) {
                                clientSelect.classList.add('has-warning');
                            }
                            if (e.field === 'specialist_id' && teacherSelect) {
                                teacherSelect.classList.add('has-warning');
                            }
                            if (e.field === 'direction_id' && directionSelect) {
                                directionSelect.classList.add('has-warning');
                            }
                            if (e.field === 'specialist_service_id') {
                                var ssSelect2 = document.getElementById('specialist-service');
                                if (ssSelect2) ssSelect2.classList.add('has-warning');
                            }
                        });
                    }
                    
                    // Обновляем чек-лист в тултипе
                    var submitWarning = document.getElementById('submit-warning-icon');
                    var submitChecklist = document.getElementById('submit-checklist');
                    
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
                // Делаем функцию доступной глобально для вызова из других IIFE
                window.updateSubmitButtonState = updateSubmitButtonState;

                // Управляет отображением крестика сброса для селекта (класс has-selection)
                function updateSelectHasSelection(selectEl, hasValue) {
                    if (window.BookingTimeUtils && typeof window.BookingTimeUtils.updateSelectHasSelection === 'function') {
                        window.BookingTimeUtils.updateSelectHasSelection(selectEl, hasValue);
                        return;
                    }
                    if (!selectEl) return;
                    if (hasValue) {
                        selectEl.classList.add('has-selection');
                    } else {
                        selectEl.classList.remove('has-selection');
                    }
                }

                // --- Функции перестроения селектов ---

                // Перестраивает селект "Длительность" с заданным количеством периодов
                // selectedPeriods = null — показывает плейсхолдер "выберите период"
                function rebuildDurationSelect(selectedPeriods, maxPeriods) {
                    if (!durationSelect) return;
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.rebuildDurationSelect !== 'function') return;

                    window.BookingTimeUtils.rebuildDurationSelect(durationSelect, selectedPeriods, maxPeriods, minMinutes, function (periods) {
                        currentSelectedPeriods = periods;
                        onDurationChanged();
                    });
                }

                // Перестраивает селект "Время начала" с заданным списком слотов
                function rebuildStartTimeSelect(slotsMinutes, selectedMinutes) {
                    if (!startTimeSelect) return;
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.rebuildStartTimeSelect !== 'function') return;

                    window.BookingTimeUtils.rebuildStartTimeSelect(startTimeSelect, slotsMinutes, selectedMinutes, function (liMinutes, liTimeStr) {
                        currentStartTimeMinutes = liMinutes;
                        if (timeField) timeField.value = liTimeStr;

                        if (tariffTimeFrozen) {
                            window.currentStartTimeMinutes = currentStartTimeMinutes;
                            window.currentEndTimeMinutes = currentEndTimeMinutes;
                            applyTeacherDirectionFilters();
                            updateSubmitButtonState();

                            if (typeof window.calculateAndUpdateBookingCost === 'function') {
                                window.calculateAndUpdateBookingCost();
                            }

                            if (typeof window.syncCreateBookingTariffs === 'function') {
                                window.syncCreateBookingTariffs();
                            }
                            return;
                        }

                        // Скрываем предупреждения (выбрано доступное время из списка)
                        var startTimeWarning = document.getElementById('start-time-warning-icon');
                        var endTimeWarning = document.getElementById('end-time-warning-icon');
                        if (startTimeWarning) startTimeWarning.style.display = 'none';
                        if (endTimeWarning) endTimeWarning.style.display = 'none';

                        // Пересчитываем список длительностей для этого времени начала
                        var maxPeriodsForStart = getMaxPeriodsForStartTime(liMinutes, currentRoomId, dateIso);

                        // Обновляем список окончаний "вправо" от времени начала
                        var endTimesForStart = getEndTimesForStartTime(liMinutes);

                        if (currentSelectedPeriods !== null) {
                            // Длительность выбрана — подставляем окончание по длительности
                            var newEndTime = liMinutes + (minMinutes * currentSelectedPeriods);
                            if (currentSelectedPeriods <= maxPeriodsForStart && endTimesForStart.indexOf(newEndTime) !== -1) {
                                // Длительность помещается — подставляем окончание
                                currentEndTimeMinutes = newEndTime;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                            } else {
                                // Длительность не помещается — сбрасываем окончание, сохраняем длительность
                                currentEndTimeMinutes = null;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                            }
                            // Список окончаний фильтруем по длительности
                            var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                            rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                        } else if (currentEndTimeMinutes !== null) {
                            // Длительность не выбрана, но есть окончание — вычисляем длительность
                            var periodsBetween = Math.round((currentEndTimeMinutes - liMinutes) / minMinutes);
                            if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForStart && endTimesForStart.indexOf(currentEndTimeMinutes) !== -1) {
                                // Время окончания валидно для нового начала
                                currentSelectedPeriods = periodsBetween;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                                rebuildEndTimeSelect(endTimesForStart, currentEndTimeMinutes);
                            } else if (maxPeriodsForStart === 1) {
                                // Время окончания не валидно, но единственный вариант длительности — автоподстановка
                                currentSelectedPeriods = 1;
                                currentEndTimeMinutes = liMinutes + minMinutes;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                                var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                                rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                            } else {
                                // Время окончания не валидно — сбрасываем его
                                currentEndTimeMinutes = null;
                                rebuildDurationSelect(null, maxPeriodsForStart);
                                rebuildEndTimeSelect(endTimesForStart, currentEndTimeMinutes);
                            }
                        } else {
                            // Ничего не выбрано
                            if (maxPeriodsForStart === 1) {
                                // Единственный вариант длительности — автоподстановка
                                currentSelectedPeriods = 1;
                                currentEndTimeMinutes = liMinutes + minMinutes;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                                var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                                rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                            } else {
                                rebuildDurationSelect(null, maxPeriodsForStart);
                                rebuildEndTimeSelect(endTimesForStart, currentEndTimeMinutes);
                            }
                        }
                        // Обновляем фильтрацию преподавателей по новому времени
                        window.currentStartTimeMinutes = currentStartTimeMinutes;
                        window.currentEndTimeMinutes = currentEndTimeMinutes;
                        applyTeacherDirectionFilters();
                        updateSubmitButtonState();

                        // Пересчитываем стоимость брони
                        if (typeof window.calculateAndUpdateBookingCost === 'function') {
                            window.calculateAndUpdateBookingCost();
                        }

                        if (typeof window.syncCreateBookingTariffs === 'function') {
                            window.syncCreateBookingTariffs();
                        }
                    });
                }

                // Перестраивает селект "Время окончания" с заданным списком времен
                function rebuildEndTimeSelect(endTimesMinutes, selectedMinutes) {
                    if (!endTimeSelect) return;
                    if (!window.BookingTimeUtils || typeof window.BookingTimeUtils.rebuildEndTimeSelect !== 'function') return;

                    window.BookingTimeUtils.rebuildEndTimeSelect(endTimeSelect, endTimesMinutes, selectedMinutes, function (liMinutes, liTimeStr) {
                        currentEndTimeMinutes = liMinutes;

                        // Обновляем список начала "влево" от времени окончания
                        var startTimesForEnd = getStartTimesForEndTime(liMinutes);
                        var maxPeriodsForEnd = getMaxPeriodsForEndTime(liMinutes);

                        // Скрываем предупреждения (выбрано доступное время из списка)
                        var startTimeWarning = document.getElementById('start-time-warning-icon');
                        var endTimeWarning = document.getElementById('end-time-warning-icon');
                        if (startTimeWarning) startTimeWarning.style.display = 'none';
                        if (endTimeWarning) endTimeWarning.style.display = 'none';

                        if (currentSelectedPeriods !== null) {
                            // Длительность выбрана — подставляем начало по длительности
                            var newStartTime = liMinutes - (minMinutes * currentSelectedPeriods);
                            if (startTimesForEnd.indexOf(newStartTime) !== -1) {
                                // Длительность помещается — подставляем начало
                                currentStartTimeMinutes = newStartTime;
                                if (timeField) timeField.value = formatTimeHHMM(currentStartTimeMinutes);
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForEnd);
                            } else {
                                // Длительность не помещается — сбрасываем начало, сохраняем длительность
                                currentStartTimeMinutes = null;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForEnd);
                            }
                            // Список начала фильтруем по длительности
                            var filteredStartTimes = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                            rebuildStartTimeSelect(filteredStartTimes, currentStartTimeMinutes);
                        } else if (currentStartTimeMinutes !== null) {
                            // Длительность не выбрана, но есть начало — вычисляем длительность
                            var periodsBetween = Math.round((liMinutes - currentStartTimeMinutes) / minMinutes);
                            if (periodsBetween >= 1 && periodsBetween <= maxPeriodsForEnd && startTimesForEnd.indexOf(currentStartTimeMinutes) !== -1) {
                                // Время начала валидно для нового окончания
                                currentSelectedPeriods = periodsBetween;
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForEnd);
                                rebuildStartTimeSelect(startTimesForEnd, currentStartTimeMinutes);
                            } else if (maxPeriodsForEnd === 1) {
                                // Время начала не валидно, но единственный вариант длительности — автоподстановка
                                currentSelectedPeriods = 1;
                                currentStartTimeMinutes = liMinutes - minMinutes;
                                if (timeField) timeField.value = formatTimeHHMM(currentStartTimeMinutes);
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForEnd);
                                var filteredStartTimes = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                                rebuildStartTimeSelect(filteredStartTimes, currentStartTimeMinutes);
                            } else {
                                // Время начала не валидно — сбрасываем его
                                currentStartTimeMinutes = null;
                                rebuildDurationSelect(null, maxPeriodsForEnd);
                                rebuildStartTimeSelect(startTimesForEnd, currentStartTimeMinutes);
                            }
                        } else {
                            // Ничего не выбрано
                            if (maxPeriodsForEnd === 1) {
                                // Единственный вариант длительности — автоподстановка
                                currentSelectedPeriods = 1;
                                currentStartTimeMinutes = liMinutes - minMinutes;
                                if (timeField) timeField.value = formatTimeHHMM(currentStartTimeMinutes);
                                rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForEnd);
                                var filteredStartTimes = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                                rebuildStartTimeSelect(filteredStartTimes, currentStartTimeMinutes);
                            } else {
                                rebuildDurationSelect(null, maxPeriodsForEnd);
                                rebuildStartTimeSelect(startTimesForEnd, currentStartTimeMinutes);
                            }
                        }
                        // Обновляем фильтрацию преподавателей по новому времени
                        window.currentStartTimeMinutes = currentStartTimeMinutes;
                        window.currentEndTimeMinutes = currentEndTimeMinutes;
                        applyTeacherDirectionFilters();
                        updateSubmitButtonState();

                        // Пересчитываем стоимость брони
                        if (typeof window.calculateAndUpdateBookingCost === 'function') {
                            window.calculateAndUpdateBookingCost();
                        }

                        if (typeof window.syncCreateBookingTariffs === 'function') {
                            window.syncCreateBookingTariffs();
                        }
                    });
                }

                // --- Синхронизировать отображение времени начала с текущим значением ---
                function syncStartTimeDisplay() {
                    if (!startTimeSelect) return;
                    var startSelectedSpan = startTimeSelect.querySelector('.selected');
                    var startOptionsUl = startTimeSelect.querySelector('ul.options');
                    
                    if (currentStartTimeMinutes === null) {
                        if (startSelectedSpan) {
                            startSelectedSpan.textContent = startTimeSelect.getAttribute('data-placeholder') || 'Выберите время';
                        }
                        updateSelectHasSelection(startTimeSelect, false);
                    } else {
                        if (startSelectedSpan) {
                            startSelectedSpan.textContent = formatTimeHHMM(currentStartTimeMinutes);
                        }
                        updateSelectHasSelection(startTimeSelect, true);
                    }
                    
                    if (startOptionsUl) {
                        startOptionsUl.querySelectorAll('li').forEach(function (li) {
                            var mins = parseInt(li.getAttribute('data-minutes'), 10);
                            if (mins === currentStartTimeMinutes) {
                                li.classList.add('selected');
                            } else {
                                li.classList.remove('selected');
                            }
                        });
                    }
                }

                // --- Обработчики событий изменения селектов ---

                // Обработчик изменения длительности: обновляет списки начала/окончания
                function onDurationChanged() {
                    var durationMinutes = minMinutes * currentSelectedPeriods;
                    
                    // Скрываем предупреждения (выбрана доступная длительность из списка)
                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    var endTimeWarning = document.getElementById('end-time-warning-icon');
                    if (startTimeWarning) startTimeWarning.style.display = 'none';
                    if (endTimeWarning) endTimeWarning.style.display = 'none';
                    
                    // Списки начала/окончания фильтруются по выбранной длительности
                    var filteredStartSlots = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                    var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                    
                    if (currentStartTimeMinutes !== null) {
                        // Есть время начала — подставляем окончание
                        var maxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                        if (currentSelectedPeriods <= maxPeriodsForStart) {
                            currentEndTimeMinutes = currentStartTimeMinutes + durationMinutes;
                        } else {
                            // Период недоступен для этого начала — сбрасываем оба
                            currentStartTimeMinutes = null;
                            currentEndTimeMinutes = null;
                        }
                        
                        rebuildStartTimeSelect(filteredStartSlots, currentStartTimeMinutes);
                        rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                    } else if (currentEndTimeMinutes !== null) {
                        // Есть время окончания — подставляем начало
                        var potentialStart = currentEndTimeMinutes - durationMinutes;
                        
                        if (filteredStartSlots.indexOf(potentialStart) !== -1) {
                            currentStartTimeMinutes = potentialStart;
                            if (timeField) timeField.value = formatTimeHHMM(currentStartTimeMinutes);
                        } else {
                            // Время начала для этой длительности недоступно — сбрасываем время окончания
                            currentEndTimeMinutes = null;
                        }
                        
                        rebuildStartTimeSelect(filteredStartSlots, currentStartTimeMinutes);
                        rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                    } else {
                        // Ничего не выбрано — списки фильтруются по длительности
                        rebuildStartTimeSelect(filteredStartSlots, null);
                        rebuildEndTimeSelect(filteredEndTimes, null);
                    }
                    
                    // Обновляем фильтрацию преподавателей по новому времени
                    window.currentStartTimeMinutes = currentStartTimeMinutes;
                    window.currentEndTimeMinutes = currentEndTimeMinutes;
                    applyTeacherDirectionFilters();
                    updateSubmitButtonState();
                    
                    // Пересчитываем стоимость брони
                    calculateAndUpdateBookingCost();

                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs();
                    }
                }

                // --- Функции сброса селектов (по нажатию крестика) ---

                // Сброс селекта "Время начала": сохраняет время окончания если есть
                function resetStartTime() {
                    currentStartTimeMinutes = null;
                    // НЕ сбрасываем время окончания
                    
                    // Скрываем предупреждение о недоступном слоте
                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    if (startTimeWarning) startTimeWarning.style.display = 'none';
                    
                    if (currentEndTimeMinutes !== null) {
                        // Есть время окончания — список начала "влево", сбрасываем длительность
                        var startTimesForEnd = getStartTimesForEndTime(currentEndTimeMinutes);
                        var maxPeriodsForEnd = getMaxPeriodsForEndTime(currentEndTimeMinutes);
                        currentSelectedPeriods = null;
                        rebuildDurationSelect(null, maxPeriodsForEnd);
                        rebuildStartTimeSelect(startTimesForEnd, null);
                        rebuildEndTimeSelect(getAllEndTimesForPeriods(1), currentEndTimeMinutes);
                    } else {
                        // Оба значения сброшены — глобальные списки
                        currentSelectedPeriods = null;
                        rebuildDurationSelect(null, getGlobalMaxPeriods());
                        rebuildStartTimeSelect(getStartTimeSlotsForPeriods(1), null);
                        rebuildEndTimeSelect(getAllEndTimesForPeriods(1), null);
                    }
                    
                    // Обновляем фильтрацию преподавателей
                    window.currentStartTimeMinutes = currentStartTimeMinutes;
                    window.currentEndTimeMinutes = currentEndTimeMinutes;
                    applyTeacherDirectionFilters();
                    updateSubmitButtonState();
                    
                    // Пересчитываем стоимость брони
                    if (typeof window.calculateAndUpdateBookingCost === 'function') {
                        window.calculateAndUpdateBookingCost();
                    }

                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs();
                    }
                }

                // Сброс селекта "Время окончания": сохраняет время начала если есть
                function resetEndTime() {
                    currentEndTimeMinutes = null;
                    // НЕ сбрасываем время начала
                    
                    // Скрываем предупреждение о недоступном времени окончания
                    var endTimeWarning = document.getElementById('end-time-warning-icon');
                    if (endTimeWarning) endTimeWarning.style.display = 'none';
                    
                    if (currentStartTimeMinutes !== null) {
                        // Есть время начала — список окончаний "вправо", сбрасываем длительность
                        var maxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                        var endTimesForStart = getEndTimesForStartTime(currentStartTimeMinutes);
                        currentSelectedPeriods = null;
                        rebuildDurationSelect(null, maxPeriodsForStart);
                        rebuildStartTimeSelect(getStartTimeSlotsForPeriods(1), currentStartTimeMinutes);
                        rebuildEndTimeSelect(endTimesForStart, null);
                    } else {
                        // Оба значения сброшены — глобальные списки
                        currentSelectedPeriods = null;
                        rebuildDurationSelect(null, getGlobalMaxPeriods());
                        rebuildStartTimeSelect(getStartTimeSlotsForPeriods(1), null);
                        rebuildEndTimeSelect(getAllEndTimesForPeriods(1), null);
                    }
                    
                    // Обновляем фильтрацию преподавателей
                    window.currentStartTimeMinutes = currentStartTimeMinutes;
                    window.currentEndTimeMinutes = currentEndTimeMinutes;
                    applyTeacherDirectionFilters();
                    updateSubmitButtonState();
                    
                    // Пересчитываем стоимость брони
                    if (typeof window.calculateAndUpdateBookingCost === 'function') {
                        window.calculateAndUpdateBookingCost();
                    }
                }

                // Сброс селекта "Длительность": сбрасывает связанные значения
                function resetDuration() {
                    // Сбрасываем на плейсхолдер "выберите период"
                    currentSelectedPeriods = null;
                    
                    // Скрываем предупреждения (сбрасываем номинальные значения)
                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    var endTimeWarning = document.getElementById('end-time-warning-icon');
                    if (startTimeWarning) startTimeWarning.style.display = 'none';
                    if (endTimeWarning) endTimeWarning.style.display = 'none';
                    
                    if (currentStartTimeMinutes !== null) {
                        // Есть время начала — список окончаний "вправо", сбрасываем окончание
                        var maxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                        var endTimesForStart = getEndTimesForStartTime(currentStartTimeMinutes);
                        currentEndTimeMinutes = null;
                        rebuildDurationSelect(null, maxPeriodsForStart);
                        rebuildStartTimeSelect(getStartTimeSlotsForPeriods(1), currentStartTimeMinutes);
                        rebuildEndTimeSelect(endTimesForStart, null);
                    } else if (currentEndTimeMinutes !== null) {
                        // Есть время окончания — список начала "влево", сбрасываем начало
                        var startTimesForEnd = getStartTimesForEndTime(currentEndTimeMinutes);
                        var maxPeriodsForEnd = getMaxPeriodsForEndTime(currentEndTimeMinutes);
                        currentStartTimeMinutes = null;
                        rebuildDurationSelect(null, maxPeriodsForEnd);
                        rebuildStartTimeSelect(startTimesForEnd, null);
                        rebuildEndTimeSelect(getAllEndTimesForPeriods(1), currentEndTimeMinutes);
                    } else {
                        // Оба значения не установлены — глобальные списки
                        rebuildDurationSelect(null, getGlobalMaxPeriods());
                        rebuildStartTimeSelect(getStartTimeSlotsForPeriods(1), null);
                        rebuildEndTimeSelect(getAllEndTimesForPeriods(1), null);
                    }
                    
                    // Обновляем фильтрацию преподавателей
                    window.currentStartTimeMinutes = currentStartTimeMinutes;
                    window.currentEndTimeMinutes = currentEndTimeMinutes;
                    applyTeacherDirectionFilters();
                    updateSubmitButtonState();
                    
                    // Пересчитываем стоимость брони (длительность сброшена — стоимость 0)
                    calculateAndUpdateBookingCost();

                    if (typeof window.syncCreateBookingTariffs === 'function') {
                        window.syncCreateBookingTariffs();
                    }
                }

                // --- Привязка обработчиков сброса (крестиков) ---
                function bindClearButtons() {
                    var startClearBtn = startTimeSelect ? startTimeSelect.querySelector('.custom-select-clear') : null;
                    var endClearBtn = endTimeSelect ? endTimeSelect.querySelector('.custom-select-clear') : null;
                    var durationClearBtn = durationSelect ? durationSelect.querySelector('.custom-select-clear') : null;
                    
                    if (startClearBtn) {
                        startClearBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            resetStartTime();
                            startTimeSelect.classList.remove('open');
                        });
                    }
                    
                    if (endClearBtn) {
                        endClearBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (endTimeSelect && endTimeSelect.classList.contains('disabled')) {
                                return;
                            }
                            resetEndTime();
                            endTimeSelect.classList.remove('open');
                        });
                    }
                    
                    if (durationClearBtn) {
                        durationClearBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (durationSelect && durationSelect.classList.contains('disabled')) {
                                return;
                            }
                            resetDuration();
                            durationSelect.classList.remove('open');
                        });
                    }
                }

                // =====================================================
                // МОДУЛЬ КАЛЕНДАРЯ (DATEPICKER)
                // =====================================================
                
                var datepickerTrigger = document.getElementById('datepicker-trigger');
                var datepickerPopup = document.getElementById('datepicker-popup');
                var datepickerDisplay = document.getElementById('datepicker-display');
                var datepickerGrid = document.getElementById('datepicker-grid');
                var datepickerMonthSelect = document.getElementById('datepicker-month');
                var datepickerYearSelect = document.getElementById('datepicker-year');
                var datepickerPrevBtn = document.getElementById('datepicker-prev');
                var datepickerNextBtn = document.getElementById('datepicker-next');
                var datepickerTodayBtn = document.getElementById('datepicker-today');
                var datepickerInput = document.getElementById('modal-create-date');
                
                // Текущий отображаемый месяц в календаре
                var datepickerCurrentMonth = new Date(dateIso);
                // Выбранная дата
                var datepickerSelectedDate = new Date(dateIso);
                
                var monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                
                // Форматирование даты для отображения (например: "13 декабря 2025")
                function formatDateDisplay(date) {
                    var day = date.getDate();
                    var monthIdx = date.getMonth();
                    var year = date.getFullYear();
                    var monthNamesGenitive = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                                              'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
                    return day + ' ' + monthNamesGenitive[monthIdx] + ' ' + year;
                }
                
                // Форматирование даты в ISO (YYYY-MM-DD)
                function formatDateIso(date) {
                    var y = date.getFullYear();
                    var m = String(date.getMonth() + 1).padStart(2, '0');
                    var d = String(date.getDate()).padStart(2, '0');
                    return y + '-' + m + '-' + d;
                }
                
                // Заполнение select месяцев
                function populateMonthSelect() {
                    datepickerMonthSelect.innerHTML = '';
                    for (var i = 0; i < 12; i++) {
                        var opt = document.createElement('option');
                        opt.value = i;
                        opt.textContent = monthNames[i];
                        if (i === datepickerCurrentMonth.getMonth()) {
                            opt.selected = true;
                        }
                        datepickerMonthSelect.appendChild(opt);
                    }
                }
                
                // Заполнение select годов (текущий год ±5)
                function populateYearSelect() {
                    datepickerYearSelect.innerHTML = '';
                    var currentYear = new Date().getFullYear();
                    for (var y = currentYear - 2; y <= currentYear + 3; y++) {
                        var opt = document.createElement('option');
                        opt.value = y;
                        opt.textContent = y;
                        if (y === datepickerCurrentMonth.getFullYear()) {
                            opt.selected = true;
                        }
                        datepickerYearSelect.appendChild(opt);
                    }
                }
                
                // Построение сетки дней
                function buildDatepickerGrid() {
                    datepickerGrid.innerHTML = '';
                    
                    var year = datepickerCurrentMonth.getFullYear();
                    var month = datepickerCurrentMonth.getMonth();
                    
                    // Первый день месяца
                    var firstDay = new Date(year, month, 1);
                    // День недели первого числа (0=Вс, переводим в Пн=0)
                    var startDayOfWeek = (firstDay.getDay() + 6) % 7;
                    
                    // Последний день месяца
                    var lastDay = new Date(year, month + 1, 0);
                    var daysInMonth = lastDay.getDate();
                    
                    // Предыдущий месяц — для заполнения пустых ячеек
                    var prevMonthLastDay = new Date(year, month, 0).getDate();
                    
                    var today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Дни предыдущего месяца
                    for (var i = startDayOfWeek - 1; i >= 0; i--) {
                        var dayNum = prevMonthLastDay - i;
                        var cell = document.createElement('div');
                        cell.className = 'modal-datepicker__day modal-datepicker__day--outside';
                        cell.textContent = dayNum;
                        datepickerGrid.appendChild(cell);
                    }
                    
                    // Дни текущего месяца
                    for (var d = 1; d <= daysInMonth; d++) {
                        var cell = document.createElement('div');
                        cell.className = 'modal-datepicker__day';
                        cell.textContent = d;
                        
                        var cellDate = new Date(year, month, d);
                        cellDate.setHours(0, 0, 0, 0);
                        
                        // Сегодня
                        if (cellDate.getTime() === today.getTime()) {
                            cell.classList.add('modal-datepicker__day--today');
                        }
                        
                        // Выбранная дата
                        if (datepickerSelectedDate &&
                            cellDate.getFullYear() === datepickerSelectedDate.getFullYear() &&
                            cellDate.getMonth() === datepickerSelectedDate.getMonth() &&
                            cellDate.getDate() === datepickerSelectedDate.getDate()) {
                            cell.classList.add('modal-datepicker__day--selected');
                        }
                        
                        // Обработчик клика
                        (function(dayDate) {
                            cell.addEventListener('click', function() {
                                onDateSelected(dayDate);
                            });
                        })(cellDate);
                        
                        datepickerGrid.appendChild(cell);
                    }
                    
                    // Дни следующего месяца (заполнение до конца сетки)
                    var totalCells = datepickerGrid.children.length;
                    var remainingCells = (7 - (totalCells % 7)) % 7;
                    for (var n = 1; n <= remainingCells; n++) {
                        var cell = document.createElement('div');
                        cell.className = 'modal-datepicker__day modal-datepicker__day--outside';
                        cell.textContent = n;
                        datepickerGrid.appendChild(cell);
                    }
                }
                
                // Обновление отображения календаря
                function renderDatepicker() {
                    populateMonthSelect();
                    populateYearSelect();
                    buildDatepickerGrid();
                }
                
                // Обработчик выбора даты
                function onDateSelected(newDate) {
                    datepickerSelectedDate = newDate;
                    var newDateIso = formatDateIso(newDate);
                    
                    // Обновляем отображение и скрытый input (получаем по ID т.к. элемент мог быть клонирован)
                    var displayEl = document.getElementById('datepicker-display');
                    if (displayEl) displayEl.textContent = formatDateDisplay(newDate);
                    datepickerInput.value = newDateIso;
                    
                    // Закрываем попап
                    datepickerPopup.classList.remove('open');
                    
                    // --- Пересчёт списков времени для новой даты ---
                    dateIso = newDateIso;
                    if (dateField) dateField.value = dateIso;
                    
                    // Загружаем все брони комнаты на новую дату через AJAX и пересчитываем
                    loadRoomBookingsForDate(currentRoomId, dateIso, function() {
                        // Элементы предупреждений
                        var startTimeWarning = document.getElementById('start-time-warning-icon');
                        var endTimeWarning = document.getElementById('end-time-warning-icon');
                        
                        // Скрываем предупреждения по умолчанию
                        if (startTimeWarning) startTimeWarning.style.display = 'none';
                        if (endTimeWarning) endTimeWarning.style.display = 'none';
                        
                        // Пересчитываем списки для нового дня
                        var newAllSlots = getStartTimeSlotsForPeriods(1);
                        var newGlobalMaxPeriods = getGlobalMaxPeriods();
                        
                        // Флаги валидности времени
                        var startTimeValid = true;
                        var endTimeValid = true;
                        
                        // Проверяем доступность текущего времени начала
                        if (currentStartTimeMinutes !== null) {
                            var newMaxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                            if (newMaxPeriodsForStart < 1) {
                                // Время начала недоступно — показываем номинально с предупреждением
                                startTimeValid = false;
                                if (startTimeWarning) startTimeWarning.style.display = 'inline-block';
                            }
                        }
                        
                        // Проверяем доступность текущего времени окончания
                        if (currentEndTimeMinutes !== null && currentStartTimeMinutes !== null) {
                            if (!startTimeValid) {
                                // Если время начала невалидно — время окончания тоже невалидно
                                endTimeValid = false;
                                if (endTimeWarning) endTimeWarning.style.display = 'inline-block';
                            } else {
                                var newMaxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                                var maxEndTime = currentStartTimeMinutes + (minMinutes * newMaxPeriodsForStart);
                                if (currentEndTimeMinutes > maxEndTime) {
                                    // Время окончания недоступно — показываем номинально с предупреждением
                                    endTimeValid = false;
                                    if (endTimeWarning) endTimeWarning.style.display = 'inline-block';
                                }
                            }
                        }
                        
                        // Формируем списки в зависимости от состояния
                        if (currentStartTimeMinutes !== null && startTimeValid) {
                            var newMaxPeriodsForStart = getMaxPeriodsForStartTime(currentStartTimeMinutes, currentRoomId, dateIso);
                            
                            // Автоподстановка при единственном периоде
                            if (newMaxPeriodsForStart === 1 && currentSelectedPeriods === null && currentEndTimeMinutes === null) {
                                currentSelectedPeriods = 1;
                                currentEndTimeMinutes = currentStartTimeMinutes + minMinutes;
                                endTimeValid = true;
                                if (endTimeWarning) endTimeWarning.style.display = 'none';
                            }
                            
                            // Проверяем, помещается ли выбранная длительность — если нет, делаем номинальной с предупреждением
                            if (currentSelectedPeriods !== null && currentSelectedPeriods > newMaxPeriodsForStart) {
                                // Длительность и окончание не помещаются — показываем предупреждение на окончании
                                endTimeValid = false;
                                if (endTimeWarning) endTimeWarning.style.display = 'inline-block';
                            }
                            
                            // Строим списки
                            if (currentSelectedPeriods !== null) {
                                // Длительность выбрана — фильтруем списки по ней
                                var filteredStartSlots = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                                var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                                rebuildStartTimeSelect(filteredStartSlots, currentStartTimeMinutes);
                                rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                            } else {
                                var newEndTimes = getEndTimesForStartTime(currentStartTimeMinutes);
                                rebuildStartTimeSelect(newAllSlots, currentStartTimeMinutes);
                                rebuildEndTimeSelect(newEndTimes, currentEndTimeMinutes);
                            }
                            
                            rebuildDurationSelect(currentSelectedPeriods, newMaxPeriodsForStart);
                        } else {
                            // Время начала не выбрано или невалидно — глобальные списки, но сохраняем номинальные значения
                            if (currentSelectedPeriods !== null) {
                                var filteredSlots = getStartTimeSlotsForPeriods(currentSelectedPeriods);
                                var filteredEndTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                                rebuildStartTimeSelect(filteredSlots, currentStartTimeMinutes);
                                rebuildEndTimeSelect(filteredEndTimes, currentEndTimeMinutes);
                            } else {
                                rebuildStartTimeSelect(newAllSlots, currentStartTimeMinutes);
                                rebuildEndTimeSelect(getAllEndTimesForPeriods(1), currentEndTimeMinutes);
                            }
                            rebuildDurationSelect(currentSelectedPeriods, newGlobalMaxPeriods);
                        }
                        
                        // Синхронизируем глобальные переменные и загружаем занятых специалистов
                        window.currentStartTimeMinutes = currentStartTimeMinutes;
                        window.currentEndTimeMinutes = currentEndTimeMinutes;
                        loadBusySpecialistsForDate(dateIso, function() {
                            // applyTeacherDirectionFilters вызовет updateSubmitButtonState внутри
                            applyTeacherDirectionFilters();

                            if (typeof window.syncCreateBookingTariffs === 'function') {
                                window.syncCreateBookingTariffs();
                            }
                        });
                    });
                }
                
                // Обработчики событий календаря (удаляем старые через клонирование, чтобы не накапливались)
                function replaceWithClone(el) {
                    if (!el) return null;
                    var clone = el.cloneNode(true);
                    el.parentNode.replaceChild(clone, el);
                    return clone;
                }
                
                // Обновляем ссылки на элементы после клонирования
                datepickerTrigger = replaceWithClone(datepickerTrigger);
                // После клонирования trigger нужно обновить ссылку на display внутри него
                datepickerDisplay = document.getElementById('datepicker-display');
                datepickerPrevBtn = replaceWithClone(datepickerPrevBtn);
                datepickerNextBtn = replaceWithClone(datepickerNextBtn);
                datepickerMonthSelect = replaceWithClone(datepickerMonthSelect);
                datepickerYearSelect = replaceWithClone(datepickerYearSelect);
                datepickerTodayBtn = replaceWithClone(datepickerTodayBtn);
                
                if (datepickerTrigger) {
                    datepickerTrigger.addEventListener('click', function(e) {
                        e.stopPropagation();
                        // Закрываем другие открытые селекты
                        var modal = document.getElementById('createBookingModal');
                        if (modal) {
                            modal.querySelectorAll('.custom-select.open').forEach(function(s) {
                                s.classList.remove('open');
                            });
                        }
                        datepickerPopup.classList.toggle('open');
                        if (datepickerPopup.classList.contains('open')) {
                            // Показываем месяц выбранной даты
                            datepickerCurrentMonth = new Date(datepickerSelectedDate.getFullYear(), datepickerSelectedDate.getMonth(), 1);
                            renderDatepicker();
                        }
                    });
                }
                
                if (datepickerPrevBtn) {
                    datepickerPrevBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        datepickerCurrentMonth.setMonth(datepickerCurrentMonth.getMonth() - 1);
                        renderDatepicker();
                    });
                }
                
                if (datepickerNextBtn) {
                    datepickerNextBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        datepickerCurrentMonth.setMonth(datepickerCurrentMonth.getMonth() + 1);
                        renderDatepicker();
                    });
                }
                
                if (datepickerMonthSelect) {
                    datepickerMonthSelect.addEventListener('change', function() {
                        datepickerCurrentMonth.setMonth(parseInt(this.value, 10));
                        renderDatepicker();
                    });
                }
                
                if (datepickerYearSelect) {
                    datepickerYearSelect.addEventListener('change', function() {
                        datepickerCurrentMonth.setFullYear(parseInt(this.value, 10));
                        renderDatepicker();
                    });
                }
                
                if (datepickerTodayBtn) {
                    datepickerTodayBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        var today = new Date();
                        onDateSelected(today);
                    });
                }
                
                // Закрытие попапа по клику вне (используем глобальный флаг чтобы не накапливать обработчики)
                if (!window._datepickerClickHandlerAdded) {
                    window._datepickerClickHandlerAdded = true;
                    document.addEventListener('click', function(e) {
                        var popup = document.getElementById('datepicker-popup');
                        var trigger = document.getElementById('datepicker-trigger');
                        if (popup && popup.classList.contains('open')) {
                            if (!popup.contains(e.target) && trigger && !trigger.contains(e.target)) {
                                popup.classList.remove('open');
                            }
                        }
                    });
                }
                
                // Инициализация отображения даты (получаем по ID для надёжности после клонирования)
                var displayElInit = document.getElementById('datepicker-display');
                if (displayElInit) displayElInit.textContent = formatDateDisplay(datepickerSelectedDate);
                datepickerInput.value = dateIso;

                // --- Первоначальная инициализация ---
                bindClearButtons();
                
                // Загружаем все брони комнаты на дату через AJAX (без фильтра по сценарию)
                // и только после этого инициализируем селекты
                loadRoomBookingsForDate(currentRoomId, dateIso, function() {
                    // Вычисляем максимально возможное количество периодов
                    var allStartSlots = getStartTimeSlotsForPeriods(1);
                    var globalMaxPeriods = getGlobalMaxPeriods();
                    
                    // Проверяем доступность нажатого слота
                    var clickedSlotMaxPeriods = getMaxPeriodsForStartTime(clickedSlotMinutes, currentRoomId, dateIso);
                    var clickedSlotAvailable = clickedSlotMaxPeriods >= 1;
                    
                    // Элемент предупреждения о недоступном слоте
                    var startTimeWarning = document.getElementById('start-time-warning-icon');
                    
                    // Начальное состояние: время начала установлено, время окончания и период НЕ выбраны
                    currentSelectedPeriods = null;
                    currentEndTimeMinutes = null;
                    
                    if (clickedSlotAvailable) {
                        // Слот доступен — устанавливаем время начала
                        currentStartTimeMinutes = clickedSlotMinutes;
                        if (startTimeWarning) startTimeWarning.style.display = 'none';
                        
                        // Если единственный вариант длительности — автоподстановка
                        if (clickedSlotMaxPeriods === 1) {
                            currentSelectedPeriods = 1;
                            currentEndTimeMinutes = clickedSlotMinutes + minMinutes;
                        }
                    } else {
                        // Слот недоступен — показываем время номинально, но не в списке
                        currentStartTimeMinutes = clickedSlotMinutes;
                        if (startTimeWarning) startTimeWarning.style.display = 'inline-block';
                    }
                    
                    // Инициализируем все селекты
                    var maxPeriodsForStart = clickedSlotAvailable ? clickedSlotMaxPeriods : globalMaxPeriods;
                    rebuildDurationSelect(currentSelectedPeriods, maxPeriodsForStart);
                    rebuildStartTimeSelect(allStartSlots, currentStartTimeMinutes);
                    
                    // Время окончания: список "вправо" от времени начала (если доступно)
                    var endTimes;
                    if (currentSelectedPeriods !== null) {
                        // Длительность выбрана — фильтруем по длительности
                        endTimes = getAllEndTimesForPeriods(currentSelectedPeriods);
                    } else if (clickedSlotAvailable) {
                        endTimes = getEndTimesForStartTime(clickedSlotMinutes);
                    } else {
                        endTimes = getAllEndTimesForPeriods(1);
                    }
                    rebuildEndTimeSelect(endTimes, currentEndTimeMinutes);

                    if (typeof window.syncCreateBookingMusicSchoolTimeFields === 'function') {
                        window.syncCreateBookingMusicSchoolTimeFields();
                    }

                    if (typeof window.syncCreateBookingTariffTimeFields === 'function') {
                        window.syncCreateBookingTariffTimeFields();
                    }
                    
                    // Синхронизируем глобальные переменные и загружаем занятых специалистов
                    window.currentStartTimeMinutes = currentStartTimeMinutes;
                    window.currentEndTimeMinutes = currentEndTimeMinutes;
                    loadBusySpecialistsForDate(dateIso, function() {
                        // applyTeacherDirectionFilters вызовет updateSubmitButtonState внутри
                        applyTeacherDirectionFilters();

                        if (typeof window.syncCreateBookingTariffs === 'function') {
                            window.syncCreateBookingTariffs();
                        }
                    });
                });

                if (dateField) dateField.value = dateIso;
                if (timeField) timeField.value = timeHm;
            }
        }

    }

    // Счётчик символов для поля комментария
    document.addEventListener('DOMContentLoaded', function () {
        var textarea = document.getElementById('bookingComment');
        var counter = document.getElementById('bookingCommentCounter');
        var maxLength = 1000;

        if (!textarea || !counter) {
            return;
        }

        function updateCounter() {
            var val = textarea.value || '';

            if (val.length > maxLength) {
                textarea.value = val.slice(0, maxLength);
                val = textarea.value;
            }

            counter.textContent = val.length + '/' + maxLength;

            if (val.length >= maxLength) {
                counter.style.color = '#FF0000'; // красный
            } else if (val.length >= 900) {
                counter.style.color = '#FFA500'; // оранжевый
            } else {
                counter.style.color = '#818EA2'; // обычный
            }
        }

        textarea.addEventListener('input', updateCounter);
        updateCounter();
    });

    // Кастомные селекты только внутри этой модалки
