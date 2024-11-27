-- Удаляем все записи о миграциях для приложения booking
DELETE FROM django_migrations WHERE app = 'booking';

-- Удаляем все записи о типах контента для приложения booking
DELETE FROM django_content_type WHERE app_label = 'booking';

-- Удаляем все связанные разрешения
DELETE FROM auth_permission 
WHERE content_type_id IN (
    SELECT id FROM django_content_type WHERE app_label = 'booking'
);
