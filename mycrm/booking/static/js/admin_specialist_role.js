(function () {
    'use strict';

    var TEACHER_ROLE = 'teacher';
    var TEACHER_ONLY_FIELDS = ['directions', 'specialist_services'];

    function getFieldRow(fieldName) {
        // Django admin wraps filter_horizontal fields in a div with class "field-<name>"
        var el = document.querySelector('.field-' + fieldName);
        if (el) {
            // Walk up to the closest .form-row
            var row = el.closest('.form-row');
            return row || el;
        }
        return null;
    }

    function toggleTeacherFields(roleValue) {
        var isTeacher = (roleValue === TEACHER_ROLE);
        TEACHER_ONLY_FIELDS.forEach(function (fieldName) {
            var row = getFieldRow(fieldName);
            if (row) {
                row.style.display = isTeacher ? '' : 'none';
            }
        });
    }

    function init() {
        var roleSelect = document.getElementById('id_role');
        if (!roleSelect) {
            return;
        }

        // Apply initial state
        toggleTeacherFields(roleSelect.value);

        // Listen for changes
        roleSelect.addEventListener('change', function () {
            toggleTeacherFields(roleSelect.value);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
