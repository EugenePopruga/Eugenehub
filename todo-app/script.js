const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_NAMES_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const calendarEl = document.getElementById('calendar');
const monthTitle = document.getElementById('monthTitle');
const todayBtn = document.getElementById('todayBtn');
const selectedDateTitle = document.getElementById('selectedDateTitle');
const taskCounter = document.getElementById('taskCounter');
const filterImportant = document.getElementById('filterImportant');
const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const imageInput = document.getElementById('imageInput');
const imageName = document.getElementById('imageName');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const moveBtn = document.getElementById('moveBtn');

// ===== Состояние =====
let data = JSON.parse(localStorage.getItem('plannerData')) || {};

const now = new Date();
const todayKey = keyFromParts(now.getFullYear(), now.getMonth(), now.getDate());
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let selectedDate = todayKey;
let attachedImage = null;
let showOnlyImportant = false;

function keyFromParts(year, month, day) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return year + '-' + m + '-' + d;
}

function saveData() {
    try {
        localStorage.setItem('plannerData', JSON.stringify(data));
    } catch (error) {
        alert('Хранилище браузера переполнено. Удалите часть задач с картинками.');
    }
}

// ===== Календарь =====
function renderCalendar() {
    monthTitle.textContent = MONTH_NAMES[currentMonth] + ' ' + currentYear;
    calendarEl.innerHTML = '';

    WEEKDAYS.forEach(function (name) {
        const el = document.createElement('div');
        el.className = 'weekday';
        el.textContent = name;
        calendarEl.appendChild(el);
    });

    const firstWeekday = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        calendarEl.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const key = keyFromParts(currentYear, currentMonth, day);
        const btn = document.createElement('button');
        btn.className = 'day';
        btn.textContent = day;

        if (key === todayKey) btn.classList.add('today');
        if (key === selectedDate) btn.classList.add('selected');

        if (data[key] && data[key].length > 0) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            btn.appendChild(dot);
        }

        btn.addEventListener('click', function () {
            selectedDate = key;
            renderAll();
        });

        calendarEl.appendChild(btn);
    }
}

document.getElementById('prevMonth').addEventListener('click', function () {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', function () {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
});

// ===== Кнопка «Сегодня» =====
todayBtn.addEventListener('click', function () {
    const d = new Date();
    currentYear = d.getFullYear();
    currentMonth = d.getMonth();
    selectedDate = keyFromParts(d.getFullYear(), d.getMonth(), d.getDate());
    renderAll();
});

// ===== Заголовок выбранной даты =====
function renderSelectedTitle() {
    const parts = selectedDate.split('-');
    const day = Number(parts[2]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[0]);
    selectedDateTitle.textContent = 'Задачи на ' + day + ' ' + MONTH_NAMES_GEN[month] + ' ' + year;
}

// ===== Список задач =====
function showHint(text) {
    const hint = document.createElement('li');
    hint.className = 'empty-hint';
    hint.textContent = text;
    taskList.appendChild(hint);
}

function renderTasks() {
    taskList.innerHTML = '';
    const tasks = data[selectedDate] || [];

    // --- Счётчик ---
    const total = tasks.length;
    const done = tasks.filter(function (t) { return t.done; }).length;
    const remaining = total - done;

    if (total === 0) {
        taskCounter.textContent = 'Задач нет';
    } else {
        taskCounter.textContent = 'Всего: ' + total + ' · Готово: ' + done + ' · Осталось: ' + remaining;
    }

    // --- Кнопка переноса показывает, сколько задач переедет ---
    moveBtn.disabled = remaining === 0;
    moveBtn.textContent = remaining > 0
        ? 'Перенести невыполненные (' + remaining + ') на завтра →'
        : 'Невыполненных задач нет';

    // --- Пустые состояния ---
    if (total === 0) {
        showHint('На этот день задач пока нет');
        return;
    }
    const hasVisible = tasks.some(function (t) {
        return !showOnlyImportant || t.priority === 'important';
    });
    if (!hasVisible) {
        showHint('Важных задач на этот день нет');
        return;
    }

    // Важно: перебираем ИСХОДНЫЙ массив, а не отфильтрованный.
    // Неважные задачи просто пропускаем — тогда index остаётся настоящим,
    // и удаление/отметка работают с правильной задачей.
    tasks.forEach(function (task, index) {
        if (showOnlyImportant && task.priority !== 'important') return;

        const li = document.createElement('li');
        li.className = 'task ' + task.priority;
        if (task.done) li.classList.add('done');

        const row = document.createElement('div');
        row.className = 'task-row';

        const badge = document.createElement('button');
        badge.className = 'priority-badge ' + task.priority;
        badge.title = 'Клик — сменить важность';
        badge.addEventListener('click', function () {
            const order = ['normal', 'important', 'useful'];
            const next = (order.indexOf(task.priority) + 1) % order.length;
            task.priority = order[next];
            saveData();
            renderTasks();
        });

        const span = document.createElement('span');
        span.textContent = task.text;
        span.addEventListener('click', function () {
            task.done = !task.done;
            saveData();
            renderTasks();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', function () {
            tasks.splice(index, 1);
            if (tasks.length === 0) delete data[selectedDate];
            saveData();
            renderAll();
        });

        row.appendChild(badge);
        row.appendChild(span);
        row.appendChild(deleteBtn);
        li.appendChild(row);

        if (task.image) {
            const img = document.createElement('img');
            img.src = task.image;
            img.alt = 'Картинка к задаче';
            img.className = 'task-img';
            img.title = 'Клик — открыть в полном размере';
            img.addEventListener('click', function () {
                window.open(task.image, '_blank');
            });
            li.appendChild(img);
        }

        taskList.appendChild(li);
    });
}

// ===== Добавление задачи =====
function addTask() {
    const text = taskInput.value.trim();
    if (text === '') return;

    if (!data[selectedDate]) data[selectedDate] = [];
    data[selectedDate].push({
        text: text,
        done: false,
        priority: prioritySelect.value,
        image: attachedImage
    });

    taskInput.value = '';
    imageInput.value = '';
    imageName.textContent = '';
    attachedImage = null;

    saveData();
    renderAll();
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') addTask();
});

// ===== Фильтр «только важные» =====
filterImportant.addEventListener('change', function () {
    showOnlyImportant = filterImportant.checked;
    renderTasks();
});

// ===== Перенос невыполненных на следующий день =====
moveBtn.addEventListener('click', function () {
    const tasks = data[selectedDate] || [];
    const toMove = tasks.filter(function (t) { return !t.done; });
    if (toMove.length === 0) return;

    // «Дата + 1 день». new Date сам обрабатывает конец месяца и года:
    // например, 32 января автоматически станет 1 февраля.
    const parts = selectedDate.split('-');
    const next = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + 1);
    const nextKey = keyFromParts(next.getFullYear(), next.getMonth(), next.getDate());

    if (!data[nextKey]) data[nextKey] = [];
    data[nextKey] = data[nextKey].concat(toMove);

    // В текущем дне остаются только выполненные
    data[selectedDate] = tasks.filter(function (t) { return t.done; });
    if (data[selectedDate].length === 0) delete data[selectedDate];

    saveData();
    renderAll();
});

// ===== Прикрепление картинки с уменьшением =====
imageInput.addEventListener('change', function () {
    const file = imageInput.files[0];
    if (!file) {
        attachedImage = null;
        imageName.textContent = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const MAX = 400;
            let w = img.width;
            let h = img.height;
            if (w > MAX || h > MAX) {
                if (w > h) { h = h * MAX / w; w = MAX; }
                else { w = w * MAX / h; h = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            attachedImage = canvas.toDataURL('image/jpeg', 0.7);
            imageName.textContent = file.name;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// ===== Запуск =====
function renderAll() {
    renderCalendar();
    renderSelectedTitle();
    renderTasks();
}

renderAll();