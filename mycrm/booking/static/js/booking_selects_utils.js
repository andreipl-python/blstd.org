/**
 * BookingSelectsUtils — общий модуль для поведения кастомных селектов (.custom-select).
 *
 * Что централизуем:
 * - Открытие/закрытие селекта (класс open)
 * - Выбор опции для одиночных селектов (li.selected + обновление span.selected)
 * - Кнопка очистки для clearable-селектов (.custom-select-clear)
 * - Поиск по опциям (инпут внутри селекта)
 * - Закрытие открытых селектов по клику вне (document.click), с защитой от повторного биндинга
 *
 * Зависимости (опционально):
 * - window.BookingModalUtils (resetSelect, updateSelectHasSelection)
 */
(function () {
    if (window.BookingSelectsUtils) return;

    var _documentCloseHandlersBound = {};

    function _modalUtils() {
        return window.BookingModalUtils || null;
    }

    function _selectedSpan(selectEl) {
        return selectEl ? selectEl.querySelector('.selected') : null;
    }

    function _options(selectEl) {
        return selectEl ? selectEl.querySelector('.options') : null;
    }

    function _isDisabled(selectEl) {
        return !selectEl || selectEl.classList.contains('disabled');
    }

    function _closestLi(target) {
        if (!target) return null;
        if (target.tagName === 'LI') return target;
        return target.closest ? target.closest('li') : null;
    }

    function _updateHasSelection(selectEl, hasValue) {
        var u = _modalUtils();
        if (u && typeof u.updateSelectHasSelection === 'function') {
            u.updateSelectHasSelection(selectEl, hasValue);
            return;
        }
        if (!selectEl) return;
        if (hasValue) selectEl.classList.add('has-selection');
        else selectEl.classList.remove('has-selection');
    }

    function _resetSelect(selectEl) {
        var u = _modalUtils();
        if (u && typeof u.resetSelect === 'function') {
            u.resetSelect(selectEl);
            return;
        }
        if (!selectEl) return;

        var span = _selectedSpan(selectEl);
        var placeholder = selectEl.getAttribute('data-placeholder') || (span ? span.textContent : '');

        selectEl.querySelectorAll('ul.options li.selected').forEach(function (li) {
            li.classList.remove('selected');
        });

        if (span) span.textContent = placeholder;
        if (selectEl.classList && selectEl.classList.contains('custom-select--clearable')) {
            _updateHasSelection(selectEl, false);
        }
    }

    /**
     * Один document.click обработчик на key — закрывает .custom-select.open внутри root.
     *
     * config:
     * - key: string (обязательный)
     * - rootEl | rootId: HTMLElement | string (обязательный)
     * - onlyWhenClickInsideRoot: boolean (по умолчанию false)
     */
    function ensureCloseOnOutsideClick(config) {
        if (!config || !config.key) return;
        if (_documentCloseHandlersBound[config.key]) return;
        _documentCloseHandlersBound[config.key] = true;

        document.addEventListener('click', function (e) {
            var rootEl = config.rootEl || (config.rootId ? document.getElementById(config.rootId) : null);
            if (!rootEl) return;

            if (config.onlyWhenClickInsideRoot && !rootEl.contains(e.target)) {
                return;
            }

            rootEl.querySelectorAll('.custom-select.open').forEach(function (selectEl) {
                if (!selectEl.contains(e.target)) {
                    selectEl.classList.remove('open');
                }
            });
        });
    }

    /**
     * Программный выбор опции в одиночном селекте.
     */
    function selectOption(ctx) {
        if (!ctx || !ctx.selectEl || !ctx.optionEl) return;

        var selectEl = ctx.selectEl;
        var optionEl = ctx.optionEl;
        var ignoreIds = Array.isArray(ctx.ignoreOptionIds) ? ctx.ignoreOptionIds : [];

        if (ignoreIds.indexOf(optionEl.id) !== -1) return;

        var span = _selectedSpan(selectEl);
        var optionsEl = _options(selectEl);

        if (optionsEl) {
            optionsEl.querySelectorAll('li').forEach(function (li) {
                if (ignoreIds.indexOf(li.id) !== -1) return;
                li.classList.remove('selected');
            });
        }

        optionEl.classList.add('selected');
        if (span) span.textContent = optionEl.textContent;

        selectEl.classList.remove('open');
        if (selectEl.classList && selectEl.classList.contains('custom-select--clearable')) {
            _updateHasSelection(selectEl, true);
        }

        if (typeof ctx.onSelected === 'function') {
            ctx.onSelected({
                selectEl: selectEl,
                optionEl: optionEl,
                value: optionEl.getAttribute('data-value') || '',
                text: optionEl.textContent
            });
        }
    }

    /**
     * Биндинг поведения одиночного custom-select.
     *
     * config:
     * - selectEl: HTMLElement (обязательный)
     * - closeAll: Function (опционально)
     * - closeOthersOnOpen: boolean
     * - ignoreOptionIds: string[] (например, ['client-search'])
     * - onSelected: Function({selectEl, optionEl, value, text})
     * - onCleared: Function({selectEl})
     * - beforeClear: Function({selectEl}) => false чтобы отменить сброс
     * - searchInputSelector: string (например, 'input.client-search')
     * - searchOptionId: string (id li, внутри которого инпут поиска)
     * - focusSearchOnOpen: boolean
     * - clearSearchOnSelect: boolean
     */
    function bindSingleSelect(config) {
        if (!config || !config.selectEl) return;

        var selectEl = config.selectEl;
        if (selectEl._bookingSelectBound) return;
        selectEl._bookingSelectBound = true;

        var span = _selectedSpan(selectEl);
        var optionsEl = _options(selectEl);
        if (!span || !optionsEl) return;

        var ignoreIds = Array.isArray(config.ignoreOptionIds) ? config.ignoreOptionIds : [];

        // Открытие/закрытие
        selectEl.addEventListener('click', function (e) {
            if (_isDisabled(selectEl)) return;
            if (e.target && e.target.tagName === 'LI') return;

            var wasOpen = selectEl.classList.contains('open');
            if (!wasOpen) {
                if (config.closeOthersOnOpen && typeof config.closeAll === 'function') {
                    config.closeAll();
                }
                selectEl.classList.add('open');

                if (config.focusSearchOnOpen && config.searchInputSelector) {
                    var input = selectEl.querySelector(config.searchInputSelector);
                    if (input) {
                        setTimeout(function () {
                            try { input.focus(); } catch (err) { /* ignore */ }
                        }, 0);
                    }
                }
            } else {
                selectEl.classList.remove('open');
            }
        });

        // Выбор опции
        optionsEl.addEventListener('click', function (e) {
            if (_isDisabled(selectEl)) return;

            var li = _closestLi(e.target);
            if (!li) return;
            if (ignoreIds.indexOf(li.id) !== -1) return;

            e.stopPropagation();

            selectOption({
                selectEl: selectEl,
                optionEl: li,
                ignoreOptionIds: ignoreIds,
                onSelected: function (ctx) {
                    if (config.clearSearchOnSelect && config.searchInputSelector) {
                        var input = selectEl.querySelector(config.searchInputSelector);
                        if (input) input.value = '';
                        optionsEl.querySelectorAll('li').forEach(function (opt) {
                            if (ignoreIds.indexOf(opt.id) !== -1) return;
                            opt.style.display = '';
                        });
                    }

                    if (typeof config.onSelected === 'function') {
                        config.onSelected(ctx);
                    }
                }
            });
        });

        // Очистка
        var clearBtn = selectEl.querySelector('.custom-select-clear');
        if (clearBtn && !clearBtn._bookingClearBound) {
            clearBtn._bookingClearBound = true;
            clearBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (typeof config.beforeClear === 'function') {
                    var allow = config.beforeClear({ selectEl: selectEl });
                    if (allow === false) {
                        selectEl.classList.remove('open');
                        return;
                    }
                }

                _resetSelect(selectEl);
                selectEl.classList.remove('open');

                if (typeof config.onCleared === 'function') {
                    config.onCleared({ selectEl: selectEl });
                }
            });
        }

        // Поиск
        if (config.searchInputSelector) {
            var inputEl = selectEl.querySelector(config.searchInputSelector);
            if (inputEl && !inputEl._bookingSearchBound) {
                inputEl._bookingSearchBound = true;
                inputEl.addEventListener('input', function () {
                    var filter = String(this.value || '').trim().toLowerCase();
                    optionsEl.querySelectorAll('li').forEach(function (opt) {
                        if (ignoreIds.indexOf(opt.id) !== -1) return;
                        var text = String(opt.textContent || '').trim().toLowerCase();
                        opt.style.display = text.indexOf(filter) !== -1 ? '' : 'none';
                    });
                });
            }

            // li с инпутом поиска не должен закрывать/выбирать селект
            if (config.searchOptionId) {
                var searchLi = selectEl.querySelector('#' + config.searchOptionId);
                if (searchLi && !searchLi._bookingSearchLiBound) {
                    searchLi._bookingSearchLiBound = true;
                    searchLi.addEventListener('mousedown', function (e) { e.stopPropagation(); });
                    searchLi.addEventListener('click', function (e) { e.stopPropagation(); });
                }
            }
        }

        // Первичная синхронизация has-selection (важно для clearable)
        if (selectEl.classList.contains('custom-select--clearable')) {
            var hasValue = Boolean(selectEl.querySelector('ul.options li.selected'));
            _updateHasSelection(selectEl, hasValue);
        }
    }

    /**
     * Биндинг всех одиночных селектов в root.
     *
     * config:
     * - rootEl: HTMLElement
     * - closeAll: Function
     * - closeOthersOnOpen: boolean
     * - skipSelectIds: string[]
     * - selectConfigs: { [selectId]: bindSingleSelectConfig }
     */
    function bindSelectsInRoot(config) {
        if (!config || !config.rootEl) return;

        var rootEl = config.rootEl;
        var skipIds = Array.isArray(config.skipSelectIds) ? config.skipSelectIds : [];
        var per = config.selectConfigs || {};

        rootEl.querySelectorAll('.custom-select').forEach(function (selectEl) {
            var id = selectEl.id || '';
            if (id && skipIds.indexOf(id) !== -1) return;

            var perCfg = id && per[id] ? per[id] : {};
            bindSingleSelect({
                selectEl: selectEl,
                closeAll: config.closeAll,
                closeOthersOnOpen: config.closeOthersOnOpen === true,
                ignoreOptionIds: perCfg.ignoreOptionIds,
                onSelected: perCfg.onSelected,
                onCleared: perCfg.onCleared,
                beforeClear: perCfg.beforeClear,
                searchInputSelector: perCfg.searchInputSelector,
                searchOptionId: perCfg.searchOptionId,
                focusSearchOnOpen: perCfg.focusSearchOnOpen,
                clearSearchOnSelect: perCfg.clearSearchOnSelect
            });
        });
    }

    window.BookingSelectsUtils = {
        ensureCloseOnOutsideClick: ensureCloseOnOutsideClick,
        bindSingleSelect: bindSingleSelect,
        bindSelectsInRoot: bindSelectsInRoot,
        selectOption: selectOption,
        resetSelect: _resetSelect
    };
})();
