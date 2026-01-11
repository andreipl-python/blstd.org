/**
 * BookingServicesUtils — модуль для логики "Дополнительные услуги" в модалках бронирования.
 *
 * Задача модуля:
 * - Убрать дублирование JS-кода из HTML-шаблонов модалок create/edit.
 * - Централизовать:
 *   - множественный выбор услуг в кастомном селекте;
 *   - отображение бейджей выбранных услуг;
 *   - кнопку "Сбросить всё";
 *   - расчёт суммы выбранных услуг;
 *   - пересчёт итоговой стоимости (периоды + услуги) без изменения поведения.
 *
 * ВАЖНО:
 * - Код написан без сборщика и экспортируется в window.BookingServicesUtils.
 * - Модуль не зависит от конкретной разметки кроме ожидаемых id элементов,
 *   которые передаются в конфиге.
 */
(function () {
    // Предотвращаем повторную инициализацию
    if (window.BookingServicesUtils) {
        return;
    }

    /* =========================================================================
     * СЕКЦИЯ 1: Низкоуровневые утилиты
     * ========================================================================= */

    /**
     * Возвращает список выбранных <li> для кастомного multi-select.
     *
     * Мы намеренно поддерживаем два источника правды:
     * - selectEl._selectedOptions (Set<li>) — если он есть и поддерживается обработчиками.
     * - DOM (ul.options li.selected) — как запасной вариант.
     *
     * @param {HTMLElement} selectEl
     * @returns {Array<HTMLElement>}
     */
    function getSelectedLis(selectEl) {
        if (!selectEl) return [];
        if (selectEl._selectedOptions && typeof selectEl._selectedOptions.forEach === 'function') {
            return Array.from(selectEl._selectedOptions);
        }
        return Array.from(selectEl.querySelectorAll('ul.options li.selected'));
    }

    /**
     * Синхронизирует selectEl._selectedOptions из DOM.
     * Используется в случаях, когда selection мог измениться внешним кодом.
     *
     * @param {HTMLElement} selectEl
     * @returns {Array<HTMLElement>} выбранные li
     */
    function syncSelectedOptionsFromDom(selectEl) {
        if (!selectEl) return [];
        var selectedLis = Array.from(selectEl.querySelectorAll('ul.options li.selected'));
        if (!selectEl._selectedOptions || typeof selectEl._selectedOptions.clear !== 'function') {
            selectEl._selectedOptions = new Set();
        }
        selectEl._selectedOptions.clear();
        selectedLis.forEach(function (li) {
            selectEl._selectedOptions.add(li);
        });
        return selectedLis;
    }

    function ensureServicesOriginalOrder(selectEl, optionsContainer) {
        if (!selectEl || !optionsContainer) return;
        if (selectEl._servicesOriginalOrderReady) return;

        var idx = 0;
        Array.from(optionsContainer.querySelectorAll('li')).forEach(function (li) {
            if (!li || li.classList.contains('search-option')) return;
            if (!li.hasAttribute('data-original-index')) {
                li.setAttribute('data-original-index', String(idx));
            }
            idx++;
        });

        selectEl._servicesOriginalOrderReady = true;
    }

    function getServicesSearchOptionLi(optionsContainer, searchOptionId) {
        if (!optionsContainer) return null;
        if (searchOptionId) {
            var byId = optionsContainer.querySelector('li#' + String(searchOptionId));
            if (byId) return byId;
        }
        return optionsContainer.querySelector('li.search-option');
    }

    function applyServicesVisibility(selectEl, optionsContainer, searchOptionId) {
        if (!selectEl || !optionsContainer) return;
        var searchLi = getServicesSearchOptionLi(optionsContainer, searchOptionId);

        Array.from(optionsContainer.querySelectorAll('li')).forEach(function (li) {
            if (!li) return;
            if (li === searchLi || li.classList.contains('search-option')) {
                li.style.display = '';
                return;
            }

            var filterHidden = String(li.getAttribute('data-filter-hidden') || '') === '1';
            var searchHidden = String(li.getAttribute('data-search-hidden') || '') === '1';
            var isSelected = li.classList.contains('selected');
            li.style.display = (filterHidden || (!isSelected && searchHidden)) ? 'none' : '';
        });
    }

    function reorderServicesOptions(selectEl, optionsContainer, searchOptionId) {
        if (!selectEl || !optionsContainer) return;
        ensureServicesOriginalOrder(selectEl, optionsContainer);

        var searchLi = getServicesSearchOptionLi(optionsContainer, searchOptionId);
        if (searchLi && optionsContainer.firstChild !== searchLi) {
            optionsContainer.insertBefore(searchLi, optionsContainer.firstChild);
        }

        var items = Array.from(optionsContainer.querySelectorAll('li')).filter(function (li) {
            if (!li) return false;
            if (li === searchLi) return false;
            if (li.classList.contains('search-option')) return false;
            return true;
        });

        items.sort(function (a, b) {
            var aSel = a.classList.contains('selected') ? 1 : 0;
            var bSel = b.classList.contains('selected') ? 1 : 0;
            if (aSel !== bSel) return bSel - aSel;

            var ai = parseInt(String(a.getAttribute('data-original-index') || '0'), 10);
            var bi = parseInt(String(b.getAttribute('data-original-index') || '0'), 10);
            if (!Number.isFinite(ai)) ai = 0;
            if (!Number.isFinite(bi)) bi = 0;
            return ai - bi;
        });

        items.forEach(function (li) {
            optionsContainer.appendChild(li);
        });
    }

    function bindServicesSearch(selectEl, optionsContainer, config) {
        if (!selectEl || !optionsContainer) return;

        var input = null;
        if (config && config.searchInputSelector) {
            input = selectEl.querySelector(config.searchInputSelector);
        }
        if (!input) {
            var searchLi = getServicesSearchOptionLi(optionsContainer, config ? config.searchOptionId : null);
            input = searchLi ? searchLi.querySelector('input') : null;
        }
        if (!input) return;
        if (input._servicesSearchBound) return;
        input._servicesSearchBound = true;

        var searchOptionId = config ? config.searchOptionId : null;

        selectEl._applyServicesSearchFilter = function () {
            var q = String(input.value || '').trim().toLowerCase();

            Array.from(optionsContainer.querySelectorAll('li')).forEach(function (li) {
                if (!li) return;
                if (li.classList.contains('search-option') || li === getServicesSearchOptionLi(optionsContainer, searchOptionId)) {
                    return;
                }

                var name = String(li.getAttribute('data-name') || li.textContent || '');
                var ok = !q || name.toLowerCase().indexOf(q) !== -1;
                if (ok) {
                    li.removeAttribute('data-search-hidden');
                } else {
                    li.setAttribute('data-search-hidden', '1');
                }
            });

            applyServicesVisibility(selectEl, optionsContainer, searchOptionId);
            reorderServicesOptions(selectEl, optionsContainer, searchOptionId);
        };

        input.addEventListener('input', function () {
            if (typeof selectEl._applyServicesSearchFilter === 'function') {
                selectEl._applyServicesSearchFilter();
            }
        });

        input.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        input.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        if (typeof selectEl._applyServicesSearchFilter === 'function') {
            selectEl._applyServicesSearchFilter();
        }
    }

    /**
     * Обновляет текст выбранного значения в шапке селекта услуг.
     *
     * @param {HTMLElement} selectEl
     * @param {string} placeholderText
     */
    function updateServicesSummaryText(selectEl, placeholderText) {
        if (!selectEl) return;
        var selectedSpan = selectEl.querySelector('.selected');
        if (!selectedSpan) return;

        var selectedLis = getSelectedLis(selectEl);
        var count = selectedLis.length;

        if (count === 0) {
            selectedSpan.textContent = placeholderText || 'Выберите услугу';
        } else if (count === 1) {
            selectedSpan.textContent = selectedLis[0] ? selectedLis[0].textContent : (placeholderText || 'Выберите услугу');
        } else {
            selectedSpan.textContent = count + ' выбрано';
        }
    }

    /**
     * Возвращает человекочитаемое имя услуги для бейджа.
     * В шаблонах услуги могут иметь внутри стоимость/переносы строк — поэтому берём data-name,
     * а если нет — забираем только первую строку.
     *
     * @param {HTMLElement} li
     * @returns {string}
     */
    function getServiceDisplayName(li) {
        if (!li) return '';
        return li.getAttribute('data-name') || String(li.textContent || '').split('\n')[0].trim();
    }

    /**
     * Считает сумму выбранных услуг по атрибуту data-cost.
     *
     * @param {HTMLElement} selectEl
     * @returns {number}
     */
    function getSelectedServicesCost(selectEl) {
        if (!selectEl) return 0;

        var selectedLis = getSelectedLis(selectEl);
        var total = 0;

        selectedLis.forEach(function (li) {
            var cost = parseFloat(li.getAttribute('data-cost') || '0');
            if (Number.isFinite(cost)) total += cost;
        });

        return total;
    }

    /**
     * Форматирует сумму в BYN по текущему проектному правилу:
     * - 2 знака после запятой
     * - обрезаем .00
     *
     * @param {number} amount
     * @returns {string}
     */
    function formatMoney(amount) {
        var v = Number(amount) || 0;
        return v.toFixed(2).replace(/\.00$/, '');
    }

    /* =========================================================================
     * СЕКЦИЯ 2: Бейджи услуг + кнопка "Сбросить всё"
     * ========================================================================= */

    /**
     * Перерисовывает бейджи выбранных услуг.
     *
     * @param {Object} config
     * @param {string} config.containerId - контейнер, куда рендерить бейджи
     * @param {string} config.selectId - id кастомного селекта услуг
     * @param {string} config.resetBtnId - id кнопки/ссылки "Сбросить всё"
     * @param {number} config.showResetWhenCountGreaterThan - порог для показа reset (например 1 => показывать при 2+)
     * @param {Function} [config.onSelectionChanged] - колбэк после изменения (например пересчёт стоимости)
     * @param {Function} [config.onAfterBadgesRendered] - колбэк после полной перерисовки
     */
    function renderServicesBadges(config) {
        if (!config) return;

        var container = document.getElementById(config.containerId);
        var servicesSelect = document.getElementById(config.selectId);
        var resetBtn = document.getElementById(config.resetBtnId);
        if (!container || !servicesSelect) return;

        // На всякий случай синхронизируем _selectedOptions, т.к. selection мог меняться извне
        syncSelectedOptionsFromDom(servicesSelect);

        container.innerHTML = '';
        var selectedLis = getSelectedLis(servicesSelect);

        // Показ/скрытие кнопки "Сбросить всё".
        // В create сейчас поведение: показывать только когда выбрано больше 1 услуги.
        // В edit: показывать когда выбрано хотя бы 1.
        var threshold = Number.isFinite(config.showResetWhenCountGreaterThan)
            ? config.showResetWhenCountGreaterThan
            : 0;

        if (resetBtn) {
            resetBtn.style.display = selectedLis.length > threshold ? 'inline' : 'none';
        }

        selectedLis.forEach(function (li) {
            var badge = document.createElement('span');
            badge.className = 'service-badge';
            badge.textContent = getServiceDisplayName(li);

            // Крестик удаления услуги
            var removeBtn = document.createElement('span');
            removeBtn.className = 'service-badge-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.marginLeft = '6px';
            removeBtn.style.cursor = 'pointer';

            removeBtn.addEventListener('click', function (e) {
                e.stopPropagation();

                // 1) Убираем выделение
                li.classList.remove('selected');
                if (servicesSelect._selectedOptions && typeof servicesSelect._selectedOptions.delete === 'function') {
                    servicesSelect._selectedOptions.delete(li);
                }

                // 2) Обновляем текст выбранного значения
                if (typeof servicesSelect._updateSelectedText === 'function') {
                    // Для create у нас есть отдельная функция, которую может вызывать внешний код
                    servicesSelect._updateSelectedText();
                } else {
                    updateServicesSummaryText(servicesSelect, 'Выберите услугу');
                }

                if (typeof servicesSelect._applyServicesSearchFilter === 'function') {
                    servicesSelect._applyServicesSearchFilter();
                }
                if (typeof servicesSelect._reorderServicesOptions === 'function') {
                    servicesSelect._reorderServicesOptions();
                }

                // 3) Перестраиваем бейджи и уведомляем о смене
                renderServicesBadges(config);

                if (typeof config.onSelectionChanged === 'function') {
                    config.onSelectionChanged();
                }
            });

            badge.appendChild(removeBtn);
            container.appendChild(badge);
        });

        if (typeof config.onAfterBadgesRendered === 'function') {
            config.onAfterBadgesRendered();
        }
    }

    /* =========================================================================
     * СЕКЦИЯ 3: Множественный выбор услуг в кастомном селекте
     * ========================================================================= */

    /**
     * Инициализирует multi-select для услуг.
     *
     * Модуль НЕ создаёт разметку; он лишь навешивает обработчики на уже существующий кастомный селект.
     *
     * @param {Object} config
     * @param {HTMLElement} config.selectEl - DOM-элемент кастомного селекта
     * @param {HTMLElement} config.optionsContainerEl - контейнер опций (ul.options / .options)
     * @param {string} config.placeholderText - плейсхолдер
     * @param {string} config.resetBtnId - id кнопки/ссылки "Сбросить всё"
     * @param {Function} [config.closeAll] - функция закрытия других селектов (актуально для edit)
     * @param {Function} [config.onSelectionChanged] - колбэк при изменении выбранных услуг
     */
    function bindServicesMultiSelect(config) {
        if (!config || !config.selectEl) return;

        var selectEl = config.selectEl;
        if (selectEl._servicesMultiBound) return;
        selectEl._servicesMultiBound = true;

        var placeholder = config.placeholderText || 'Выберите услугу';
        var selectedSpan = selectEl.querySelector('.selected');
        var optionsContainer = config.optionsContainerEl || selectEl.querySelector('.options');
        if (!selectedSpan || !optionsContainer) return;

        var searchOptionId = config.searchOptionId || null;
        ensureServicesOriginalOrder(selectEl, optionsContainer);
        selectEl._applyServicesVisibility = function () {
            applyServicesVisibility(selectEl, optionsContainer, searchOptionId);
        };
        selectEl._reorderServicesOptions = function () {
            reorderServicesOptions(selectEl, optionsContainer, searchOptionId);
        };

        bindServicesSearch(selectEl, optionsContainer, {
            searchInputSelector: config.searchInputSelector,
            searchOptionId: searchOptionId
        });

        // Храним выбранные опции в Set, чтобы внешний код мог читать/править состояние.
        if (!selectEl._selectedOptions || typeof selectEl._selectedOptions.add !== 'function') {
            selectEl._selectedOptions = new Set();
        }

        // Функция, которую может вызвать внешний код (пример: фильтрация услуг по сценарию/комнате)
        selectEl._updateSelectedText = function () {
            updateServicesSummaryText(selectEl, placeholder);
        };

        // Клик по самому селекту: открыть/закрыть.
        selectEl.addEventListener('click', function (e) {
            // Клик по li обрабатывается отдельно (в optionsContainer), здесь не нужно
            if (e.target && e.target.tagName === 'LI') return;

            if (typeof config.closeAll === 'function') {
                var wasOpen = selectEl.classList.contains('open');
                config.closeAll();
                if (!wasOpen) {
                    selectEl.classList.add('open');
                    if (config.focusSearchOnOpen) {
                        var inp = config.searchInputSelector
                            ? selectEl.querySelector(config.searchInputSelector)
                            : (getServicesSearchOptionLi(optionsContainer, searchOptionId)
                                ? getServicesSearchOptionLi(optionsContainer, searchOptionId).querySelector('input')
                                : null);
                        if (inp) {
                            setTimeout(function () { inp.focus(); }, 0);
                        }
                    }
                }
                return;
            }

            var wasOpen2 = selectEl.classList.contains('open');
            selectEl.classList.toggle('open');
            if (!wasOpen2 && selectEl.classList.contains('open') && config.focusSearchOnOpen) {
                var inp2 = config.searchInputSelector
                    ? selectEl.querySelector(config.searchInputSelector)
                    : (getServicesSearchOptionLi(optionsContainer, searchOptionId)
                        ? getServicesSearchOptionLi(optionsContainer, searchOptionId).querySelector('input')
                        : null);
                if (inp2) {
                    setTimeout(function () { inp2.focus(); }, 0);
                }
            }
        });

        // Не даём кликам по опциям закрывать селект (мультивыбор)
        optionsContainer.addEventListener('mousedown', function (e) {
            e.stopPropagation();
        });

        optionsContainer.addEventListener('click', function (e) {
            var li = e.target && e.target.closest ? e.target.closest('li') : null;
            if (!li) return;
            e.stopPropagation();

            if (li.classList.contains('search-option') || (searchOptionId && String(li.id || '') === String(searchOptionId))) {
                var inp = li.querySelector('input');
                if (inp) inp.focus();
                return;
            }

            // Toggle selection
            if (li.classList.contains('selected')) {
                li.classList.remove('selected');
                selectEl._selectedOptions.delete(li);
            } else {
                li.classList.add('selected');
                selectEl._selectedOptions.add(li);
            }

            // Обновляем summary text
            selectEl._updateSelectedText();

            if (typeof selectEl._applyServicesSearchFilter === 'function') {
                selectEl._applyServicesSearchFilter();
            } else {
                if (typeof selectEl._reorderServicesOptions === 'function') {
                    selectEl._reorderServicesOptions();
                }
            }

            if (typeof config.onSelectionChanged === 'function') {
                config.onSelectionChanged();
            }
        });

        // Кнопка "Сбросить всё"
        var resetBtn = document.getElementById(config.resetBtnId);
        if (resetBtn && !resetBtn._servicesResetBound) {
            resetBtn._servicesResetBound = true;
            resetBtn.addEventListener('click', function (e) {
                e.preventDefault();

                var inp = config.searchInputSelector
                    ? selectEl.querySelector(config.searchInputSelector)
                    : null;
                if (inp) {
                    inp.value = '';
                }

                selectEl._selectedOptions.clear();
                Array.from(selectEl.querySelectorAll('ul.options li')).forEach(function (opt) {
                    opt.classList.remove('selected');
                });

                selectEl._updateSelectedText();

                if (typeof selectEl._applyServicesSearchFilter === 'function') {
                    selectEl._applyServicesSearchFilter();
                }
                if (typeof selectEl._reorderServicesOptions === 'function') {
                    selectEl._reorderServicesOptions();
                }

                if (typeof config.onSelectionChanged === 'function') {
                    config.onSelectionChanged();
                }
            });
        }

        // Первичная синхронизация
        selectEl._updateSelectedText();
        if (typeof selectEl._reorderServicesOptions === 'function') {
            selectEl._reorderServicesOptions();
        }
    }

    /**
     * Устанавливает множественный выбор (по data-value) в селекте услуг.
     * Используется в edit-модалке при prefill и при "Сбросить всё".
     *
     * @param {Object} config
     * @param {HTMLElement} config.selectEl
     * @param {Array<string|number>} config.values
     * @param {string} config.placeholderText
     */
    function setMultiSelectedValues(config) {
        if (!config || !config.selectEl) return;

        var selectEl = config.selectEl;
        var valuesSet = new Set((config.values || []).map(String));
        if (!selectEl._selectedOptions || typeof selectEl._selectedOptions.clear !== 'function') {
            selectEl._selectedOptions = new Set();
        }
        selectEl._selectedOptions.clear();

        Array.from(selectEl.querySelectorAll('ul.options li')).forEach(function (li) {
            var val = String(li.getAttribute('data-value') || '');
            var isSelected = valuesSet.has(val);
            li.classList.toggle('selected', isSelected);
            if (isSelected) {
                selectEl._selectedOptions.add(li);
            }
        });

        if (typeof selectEl._updateSelectedText === 'function') {
            selectEl._updateSelectedText();
        } else {
            updateServicesSummaryText(selectEl, config.placeholderText || 'Выберите услугу');
        }

        if (typeof selectEl._reorderServicesOptions === 'function') {
            selectEl._reorderServicesOptions();
        }
    }

    /* =========================================================================
     * СЕКЦИЯ 4: Итоговая стоимость (периоды + услуги)
     * ========================================================================= */

    /**
     * Пересчитывает итоговую стоимость и пишет в DOM.
     *
     * ВАЖНО: мы сохраняем поведение проекта:
     * - если периоды не выбраны (null/undefined) — стоимость периодов считается как 0,
     *   но стоимость услуг учитывается всегда.
     *
     * @param {Object} config
     * @param {string} config.costElementId
     * @param {string} config.servicesSelectId
     * @param {number|null|undefined} config.selectedPeriods
     * @param {number} config.periodCost
     */
    function calculateAndUpdateTotalCost(config) {
        if (!config) return;

        var costElement = document.getElementById(config.costElementId);
        if (!costElement) return;

        var selectedPeriods = (config.selectedPeriods !== null && config.selectedPeriods !== undefined)
            ? Number(config.selectedPeriods)
            : null;

        var periodCost = Number(config.periodCost) || 0;
        var periodsTotalCost = (selectedPeriods !== null && Number.isFinite(selectedPeriods))
            ? (selectedPeriods * periodCost)
            : 0;

        var servicesSelect = document.getElementById(config.servicesSelectId);
        var servicesCost = getSelectedServicesCost(servicesSelect);

        var total = periodsTotalCost + servicesCost;
        costElement.textContent = formatMoney(total) + ' BYN';
    }

    /* =========================================================================
     * ЭКСПОРТ
     * ========================================================================= */

    window.BookingServicesUtils = {
        // Выбор/стоимость
        getSelectedServicesCost: getSelectedServicesCost,
        formatMoney: formatMoney,
        calculateAndUpdateTotalCost: calculateAndUpdateTotalCost,

        // UI селекта
        bindServicesMultiSelect: bindServicesMultiSelect,
        setMultiSelectedValues: setMultiSelectedValues,
        updateServicesSummaryText: updateServicesSummaryText,

        // Бейджи
        renderServicesBadges: renderServicesBadges,
        getServiceDisplayName: getServiceDisplayName
    };
})();
