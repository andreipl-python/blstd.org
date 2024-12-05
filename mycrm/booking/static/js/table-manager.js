// Проверяем, не объявлен ли уже класс TableManager
if (typeof TableManager === 'undefined') {
    /**
     * Менеджер таблицы бронирований
     * Отвечает за эффективное обновление и управление состоянием таблицы
     */
    class TableManager {
        constructor() {
            // Проверяем, не создан ли уже экземпляр
            if (window.tableManager) {
                console.warn('TableManager already initialized');
                return window.tableManager;
            }
            
            console.log('TableManager: Initializing...');
            this.visibleDays = new Set();
            this.bookingsCache = new Map();
            this.updateThrottled = this.throttle(this.updateBookedCells.bind(this), 1000);
            this.intersectionObserver = null;
            this.init();
            
            // Сохраняем экземпляр
            window.tableManager = this;
        }

        /**
         * Инициализация менеджера
         */
        init() {
            console.log('TableManager: Starting initialization');
            this.setupIntersectionObserver();
            this.setupEventListeners();
            this.initialUpdate();
        }

        /**
         * Настройка наблюдателя за видимыми элементами
         */
        setupIntersectionObserver() {
            console.log('TableManager: Setting up IntersectionObserver');
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const dayElement = entry.target;
                    if (entry.isIntersecting) {
                        console.log('Day became visible:', dayElement.dataset.date);
                        this.visibleDays.add(dayElement.dataset.date);
                        this.updateBookedCellsForDay(dayElement.dataset.date);
                    } else {
                        this.visibleDays.delete(dayElement.dataset.date);
                    }
                });
            }, {
                root: null,
                rootMargin: '100px',
                threshold: 0.1
            });

            // Начинаем наблюдение за днями
            const days = document.querySelectorAll('.container_block');
            console.log('Found container blocks:', days.length);
            days.forEach(day => {
                this.intersectionObserver.observe(day);
            });
        }

        /**
         * Настройка обработчиков событий
         */
        setupEventListeners() {
            // Обновление при изменении размера окна
            window.addEventListener('resize', () => {
                this.updateThrottled();
            }, { passive: true });

            // Обновление при прокрутке
            window.addEventListener('scroll', () => {
                this.updateThrottled();
            }, { passive: true });
        }

        /**
         * Первоначальное обновление
         */
        initialUpdate() {
            this.updateBookedCells();
        }

        /**
         * Обновление забронированных ячеек
         */
        updateBookedCells() {
            console.log('TableManager: Updating booked cells');
            const bookingsElement = document.getElementById('bookings_in_range');
            if (!bookingsElement) {
                console.error('TableManager: bookings_in_range element not found');
                return;
            }
            
            let bookingsData;
            try {
                bookingsData = JSON.parse(bookingsElement.textContent);
                console.log('Parsed bookings data:', bookingsData);
            } catch (e) {
                console.error('TableManager: Failed to parse bookings data:', e);
                return;
            }

            // Очищаем все ячейки перед обновлением
            const cells = document.querySelectorAll('.highlight-cell');
            console.log('Found cells to update:', cells.length);
            
            cells.forEach(cell => {
                cell.classList.remove('booked');
                // Удаляем старый booking-block если есть
                const oldBlock = cell.querySelector('.booking-block');
                if (oldBlock) {
                    oldBlock.remove();
                }
            });

            bookingsData.forEach(booking => {
                this.updateBookingDisplay(booking);
            });
        }

        /**
         * Обновление отображения конкретного бронирования
         */
        updateBookingDisplay(booking) {
            console.log('Updating booking display:', booking);
            
            // Получаем дату из первого элемента blocks_datetime_range
            const bookingDate = booking.blocks_datetime_range[0].split(' ')[0];
            
            booking.blocks_datetime_range.forEach(datetime => {
                const cell = document.querySelector(`td[full_datetime="${datetime}"][room_id="${booking.idroom}"]`);
                if (cell) {
                    console.log('Found cell for datetime:', datetime);
                    cell.classList.remove('available');
                    cell.classList.add('booked');
                    
                    // Создаем блок бронирования
                    const bookingBlock = document.createElement('div');
                    bookingBlock.className = 'booking-block';
                    cell.appendChild(bookingBlock);
                    
                    // Добавляем информацию о бронировании
                    cell.setAttribute('data-booking-id', booking.id);
                    cell.setAttribute('data-client-name', booking.client_name);
                    cell.setAttribute('data-bs-target', '#editBookingModal');
                    cell.setAttribute('onclick', 'openEditModal(this)');
                } else {
                    console.warn('Cell not found for datetime:', datetime);
                }
            });
        }

        /**
         * Обновление ячеек для конкретного дня
         */
        updateBookedCellsForDay(date) {
            const bookingsData = JSON.parse(document.getElementById('bookings_in_range').textContent);
            const dayBookings = bookingsData.filter(booking => {
                const bookingDate = booking.blocks_datetime_range[0].split(' ')[0];
                return bookingDate === date;
            });
            
            dayBookings.forEach(booking => {
                this.updateBookingDisplay(booking);
            });
        }

        /**
         * Функция для ограничения частоты вызовов
         */
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            }
        }
    }

    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM fully loaded, initializing TableManager');
        if (!window.tableManager) {
            window.tableManager = new TableManager();
        }
    });
}
