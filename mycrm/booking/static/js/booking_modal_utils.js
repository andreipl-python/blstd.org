/**
 * BookingModalUtils — модуль общих утилит для модалок бронирования
 * 
 * Этот модуль предоставляет переиспользуемые функции для:
 * - Работы с кастомными селектами (получение/установка значений, сброс)
 * - Управления бейджами выбранных услуг
 * - Проверки занятости специалистов
 * - Фильтрации специалистов и направлений
 * - Расчёта стоимости бронирования
 * - Управления состоянием кнопки отправки формы
 * 
 * Используется в modal_create_booking.html и modal_edit_booking.html
 * 
 * @namespace BookingModalUtils
 */
(function () {
    // Предотвращаем повторную инициализацию
    if (window.BookingModalUtils) {
        return;
    }

    /* =========================================================================
     * СЕКЦИЯ 1: Работа с кастомными селектами
     * ========================================================================= */

    /**
     * Получает выбранное значение из кастомного селекта
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта
     * @returns {string} Значение выбранной опции или пустая строка
     */
    function getSelectedValue(selectEl) {
        if (!selectEl) return '';
        var selectedLi = selectEl.querySelector('ul.options li.selected');
        return selectedLi ? (selectedLi.getAttribute('data-value') || '') : '';
    }

    /**
     * Устанавливает значение в кастомном селекте
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта
     * @param {string|number} value - Значение для установки
     * @param {string} [placeholderText] - Текст-заглушка, если значение не найдено
     */
    function setCustomSelectValue(selectEl, value, placeholderText) {
        if (!selectEl) return;
        var selectedSpan = selectEl.querySelector('.selected');
        var options = Array.from(selectEl.querySelectorAll('ul.options li'));
        
        options.forEach(function(li) {
            li.classList.toggle('selected', String(li.getAttribute('data-value')) === String(value));
        });
        
        var chosen = options.find(function(li) {
            return String(li.getAttribute('data-value')) === String(value);
        });
        
        if (selectedSpan) {
            selectedSpan.textContent = chosen ? chosen.textContent : (placeholderText || selectedSpan.textContent);
        }
        
        // Обновляем класс has-selection для кнопки сброса
        if (chosen) {
            selectEl.classList.add('has-selection');
        } else {
            selectEl.classList.remove('has-selection');
        }
    }

    /**
     * Обновляет CSS-класс has-selection на селекте
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
     * Сбрасывает кастомный селект к начальному состоянию
     * @param {HTMLElement} selectEl - DOM-элемент кастомного селекта
     */
    function resetSelect(selectEl) {
        if (!selectEl) return;
        var selectedSpan = selectEl.querySelector('.selected');
        var placeholder = selectEl.getAttribute('data-placeholder') || 
                         (selectedSpan ? selectedSpan.textContent : '');
        var options = selectEl.querySelectorAll('ul.options li');

        options.forEach(function(li) {
            li.classList.remove('selected');
        });

        if (selectedSpan) {
            selectedSpan.textContent = placeholder;
        }

        updateSelectHasSelection(selectEl, false);
    }

    /**
     * Устанавливает множественные значения в селекте услуг
     * @param {HTMLElement} selectEl - DOM-элемент селекта услуг
     * @param {Array} values - Массив значений для выбора
     */
    function setMultiSelectedValues(selectEl, values) {
        if (!selectEl) return;
        var selectedSpan = selectEl.querySelector('.selected');
        var options = Array.from(selectEl.querySelectorAll('ul.options li'));
        var valuesSet = new Set((values || []).map(String));
        selectEl._selectedOptions = new Set();

        options.forEach(function(li) {
            var isSelected = valuesSet.has(String(li.getAttribute('data-value')));
            li.classList.toggle('selected', isSelected);
            if (isSelected) {
                selectEl._selectedOptions.add(li);
            }
        });

        // Обновляем текст
        if (selectedSpan) {
            var count = selectEl._selectedOptions.size;
            if (count === 0) {
                selectedSpan.textContent = 'Выберите услугу';
            } else if (count === 1) {
                selectedSpan.textContent = Array.from(selectEl._selectedOptions)[0].textContent;
            } else {
                selectedSpan.textContent = count + ' выбрано';
            }
        }
    }

    /* =========================================================================
     * СЕКЦИЯ 2: Управление бейджами услуг
     * ========================================================================= */

    /**
     * Обновляет бейджи выбранных услуг
     * @param {Object} config - Конфигурация
     * @param {string} config.containerId - ID контейнера для бейджей
     * @param {string} config.selectId - ID селекта услуг
     * @param {string} config.resetBtnId - ID кнопки "Сбросить всё"
     * @param {Function} [config.onRemove] - Колбэк при удалении услуги
     */
    function updateServicesBadges(config) {
        var container = document.getElementById(config.containerId);
        var servicesSelect = document.getElementById(config.selectId);
        var resetBtn = document.getElementById(config.resetBtnId);
        
        if (!container || !servicesSelect) return;
        container.innerHTML = '';
        
        var selectedLis = servicesSelect._selectedOptions 
            ? Array.from(servicesSelect._selectedOptions) 
            : [];

        // Показываем/скрываем кнопку "Сбросить всё"
        if (resetBtn) {
            resetBtn.style.display = selectedLis.length > 0 ? 'inline' : 'none';
        }

        selectedLis.forEach(function(li) {
            var badge = document.createElement('span');
            badge.className = 'service-badge';
            badge.textContent = li.textContent;

            // Крестик удаления услуги
            var removeBtn = document.createElement('span');
            removeBtn.className = 'service-badge-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.marginLeft = '6px';
            removeBtn.style.cursor = 'pointer';
            
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                li.classList.remove('selected');
                servicesSelect._selectedOptions.delete(li);
                
                // Обновляем текст в селекте
                var selected = servicesSelect.querySelector('.selected');
                var count = servicesSelect._selectedOptions.size;
                if (selected) {
                    if (count === 0) {
                        selected.textContent = 'Выберите услугу';
                    } else if (count === 1) {
                        selected.textContent = Array.from(servicesSelect._selectedOptions)[0].textContent;
                    } else {
                        selected.textContent = count + ' выбрано';
                    }
                }
                
                // Перестраиваем бейджи
                updateServicesBadges(config);
                
                // Вызываем колбэк
                if (typeof config.onRemove === 'function') {
                    config.onRemove();
                }
            });
            
            badge.appendChild(removeBtn);
            container.appendChild(badge);
        });
    }

    /* =========================================================================
     * СЕКЦИЯ 3: Проверка занятости специалистов
     * ========================================================================= */

    /**
     * Проверяет, занят ли специалист в указанное время
     * @param {number} specialistId - ID специалиста
     * @param {number} startMinutes - Время начала в минутах
     * @param {number} endMinutes - Время окончания в минутах
     * @param {Array} busySpecialists - Массив занятых специалистов
     * @param {number} [excludeBookingId] - ID брони для исключения (при редактировании)
     * @returns {boolean} true если специалист занят
     */
    function isSpecialistBusy(specialistId, startMinutes, endMinutes, busySpecialists, excludeBookingId) {
        if (!Array.isArray(busySpecialists)) return false;
        
        for (var i = 0; i < busySpecialists.length; i++) {
            if (busySpecialists[i].id === specialistId) {
                var intervals = busySpecialists[i].intervals || [];
                for (var j = 0; j < intervals.length; j++) {
                    var interval = intervals[j];
                    // Исключаем текущую бронь при редактировании
                    if (excludeBookingId && interval.booking_id && interval.booking_id === excludeBookingId) {
                        continue;
                    }
                    // Проверяем пересечение интервалов
                    if (startMinutes < interval.endMinutes && endMinutes > interval.startMinutes) {
                        return true;
                    }
                }
                break;
            }
        }
        return false;
    }

    /**
     * Загружает занятых специалистов на дату через AJAX
     * @param {string} dateIso - Дата в формате ISO (YYYY-MM-DD)
     * @param {Object} cache - Объект кэша {date, specialists}
     * @param {Function} callback - Колбэк с результатом
     */
    function loadBusySpecialistsForDate(dateIso, cache, callback) {
        if (cache.date === dateIso) {
            if (callback) callback(cache.specialists);
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
                cache.date = dateIso;
                cache.specialists = data.busy_specialists;
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

    /* =========================================================================
     * СЕКЦИЯ 4: Расчёт стоимости бронирования
     * ========================================================================= */

    /**
     * Получает суммарную стоимость выбранных услуг
     * @param {HTMLElement} servicesSelect - DOM-элемент селекта услуг
     * @returns {number} Суммарная стоимость
     */
    function getSelectedServicesCost(servicesSelect) {
        if (!servicesSelect || !servicesSelect._selectedOptions) return 0;
        var total = 0;
        
        servicesSelect._selectedOptions.forEach(function(li) {
            var cost = parseFloat(li.getAttribute('data-cost') || '0');
            if (Number.isFinite(cost)) total += cost;
        });
        
        return total;
    }

    /**
     * Рассчитывает и обновляет стоимость бронирования
     * @param {Object} config - Конфигурация
     * @param {string} config.costElementId - ID элемента для отображения стоимости
     * @param {string} config.servicesSelectId - ID селекта услуг
     * @param {number|null} config.selectedPeriods - Количество выбранных периодов
     * @param {number} config.periodCost - Стоимость одного периода
     */
    function calculateAndUpdateBookingCost(config) {
        var costElement = document.getElementById(config.costElementId);
        if (!costElement) return;

        // Если длительность не выбрана — стоимость 0
        if (config.selectedPeriods === null || config.selectedPeriods === undefined) {
            costElement.textContent = '0 BYN';
            return;
        }

        var periodsTotalCost = config.selectedPeriods * (config.periodCost || 0);
        var servicesSelect = document.getElementById(config.servicesSelectId);
        var servicesCost = getSelectedServicesCost(servicesSelect);
        var totalCost = periodsTotalCost + servicesCost;

        // Форматируем с 2 знаками после запятой, убираем лишние нули
        var formatted = totalCost.toFixed(2).replace(/\.00$/, '');
        costElement.textContent = formatted + ' BYN';
    }

    /* =========================================================================
     * СЕКЦИЯ 5: Форматирование данных
     * ========================================================================= */

    /**
     * Форматирует номер телефона в читаемый формат
     * @param {string} phone - Номер телефона
     * @returns {string} Отформатированный номер (+375 XX XXX XX XX)
     */
    function formatPhoneNumber(phone) {
        if (!phone) return '';
        var digits = String(phone).replace(/\D/g, '');
        
        // Формат для Беларуси: +375 XX XXX XX XX
        if (digits.length === 12 && digits.startsWith('375')) {
            return '+' + digits.slice(0, 3) + ' ' + 
                   digits.slice(3, 5) + ' ' + 
                   digits.slice(5, 8) + ' ' + 
                   digits.slice(8, 10) + ' ' + 
                   digits.slice(10, 12);
        }
        
        // Если 11 цифр начинается с 8 — белорусский номер
        if (digits.length === 11 && digits.startsWith('8')) {
            return '+375 ' + digits.slice(1, 3) + ' ' + 
                   digits.slice(3, 6) + ' ' + 
                   digits.slice(6, 8) + ' ' + 
                   digits.slice(8, 10);
        }
        
        return phone;
    }

    /**
     * Парсит строку времени HH:MM в минуты от полуночи
     * @param {string} hm - Строка времени
     * @returns {number|null} Количество минут или null
     */
    function parseHmToMinutes(hm) {
        if (!hm) return null;
        var parts = String(hm).split(':');
        if (parts.length < 2) return null;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
    }

    /**
     * Форматирует минуты в строку HH:MM
     * @param {number} totalMinutes - Количество минут
     * @returns {string} Строка времени
     */
    function formatMinutesToHm(totalMinutes) {
        var m = parseInt(totalMinutes, 10);
        if (!Number.isFinite(m) || m < 0) return '';
        var h = Math.floor(m / 60) % 24;
        var mm = m % 60;
        return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    }

    /* =========================================================================
     * СЕКЦИЯ 6: Счётчик символов комментария
     * ========================================================================= */

    /**
     * Инициализирует счётчик символов для textarea
     * @param {string} textareaId - ID textarea
     * @param {string} counterId - ID элемента счётчика
     * @param {number} [maxLength=1000] - Максимальная длина
     */
    function initCommentCounter(textareaId, counterId, maxLength) {
        var textarea = document.getElementById(textareaId);
        var counter = document.getElementById(counterId);
        var max = maxLength || 1000;

        if (!textarea || !counter) return;

        function updateCounter() {
            var val = textarea.value || '';

            if (val.length > max) {
                textarea.value = val.slice(0, max);
                val = textarea.value;
            }

            counter.textContent = val.length + '/' + max;

            if (val.length >= max) {
                counter.style.color = '#FF0000';
            } else if (val.length >= max * 0.9) {
                counter.style.color = '#FFA500';
            } else {
                counter.style.color = '#818EA2';
            }
        }

        textarea.addEventListener('input', updateCounter);
        updateCounter();
    }

    /* =========================================================================
     * ЭКСПОРТ ПУБЛИЧНОГО API
     * ========================================================================= */

    window.BookingModalUtils = {
        // Работа с селектами
        getSelectedValue: getSelectedValue,
        setCustomSelectValue: setCustomSelectValue,
        updateSelectHasSelection: updateSelectHasSelection,
        resetSelect: resetSelect,
        setMultiSelectedValues: setMultiSelectedValues,
        
        // Бейджи услуг
        updateServicesBadges: updateServicesBadges,
        
        // Занятость специалистов
        isSpecialistBusy: isSpecialistBusy,
        loadBusySpecialistsForDate: loadBusySpecialistsForDate,
        
        // Стоимость
        getSelectedServicesCost: getSelectedServicesCost,
        calculateAndUpdateBookingCost: calculateAndUpdateBookingCost,
        
        // Форматирование
        formatPhoneNumber: formatPhoneNumber,
        parseHmToMinutes: parseHmToMinutes,
        formatMinutesToHm: formatMinutesToHm,
        
        // UI
        initCommentCounter: initCommentCounter
    };
})();
