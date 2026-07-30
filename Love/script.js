// ======================================================
//  Открытка «Прости меня»
// ======================================================

// ---------- 1. Плавающие сердечки на фоне ----------
const bgSymbols = ['❤', '💕', '💗', '💖'];

function createBgHeart() {
    const h = document.createElement('span');
    h.className = 'bg-heart';
    h.textContent = bgSymbols[Math.floor(Math.random() * bgSymbols.length)];
    h.style.left = Math.random() * 100 + 'vw';               // случайное место по горизонтали
    h.style.fontSize = (10 + Math.random() * 22) + 'px';     // случайный размер
    h.style.animationDuration = (8 + Math.random() * 8) + 's';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 17000);                     // убираем, когда уплыло
}

// Несколько сразу, чтобы фон не был пустым, дальше — по таймеру
for (let i = 0; i < 8; i++) createBgHeart();
setInterval(createBgHeart, 700);

// ---------- 2. Кнопка «Нет», которая убегает ----------
const noBtn = document.getElementById('noBtn');

// Подписи, которые появляются при каждом побеге
const noTexts = [
    'Нет', 'Точно нет!', 'Не поймаешь 😜', 'Мимо!',
    'Промах!', 'Ни за что 🙈', 'Я быстрая!',
    'Попробуй ещё!', 'Ха-ха!'
];
let escapes = 0;

function runAway() {
    escapes++;
    noBtn.textContent = noTexts[Math.min(escapes, noTexts.length - 1)];

    noBtn.classList.add('escaping');   // включаем position: fixed

    // Случайная точка на экране, не вылезая за края
    const pad = 20;
    const maxX = window.innerWidth - noBtn.offsetWidth - pad * 2;
    const maxY = window.innerHeight - noBtn.offsetHeight - pad * 2;
    noBtn.style.left = pad + Math.random() * Math.max(maxX, 1) + 'px';
    noBtn.style.top = pad + Math.random() * Math.max(maxY, 1) + 'px';
}

// Убегаем, когда курсор ПРИБЛИЖАЕТСЯ (не надо даже наводить точно)
document.addEventListener('mousemove', function (e) {
    const rect = noBtn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 130) runAway();   // 130 пикселей — «зона страха» кнопки
});

// На телефоне: ускользает от пальца в момент касания
noBtn.addEventListener('touchstart', function (e) {
    e.preventDefault();
    runAway();
});

// На случай, если она всё-таки умудрилась нажаться
noBtn.addEventListener('click', runAway);

// ---------- 3. Кнопка «Да» и празднование ----------
const yesBtn = document.getElementById('yesBtn');
const celebration = document.getElementById('celebration');

yesBtn.addEventListener('click', function () {
    celebration.classList.remove('hidden');
    heartRain();
});

// Дождь из сердечек
function heartRain() {
    const symbols = ['❤️', '💕', '💖', '💗', '✨'];
    for (let i = 0; i < 35; i++) {
        setTimeout(function () {
            const h = document.createElement('div');
            h.className = 'rain-heart';
            h.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            h.style.left = Math.random() * 100 + 'vw';
            h.style.fontSize = (16 + Math.random() * 26) + 'px';
            h.style.animationDuration = (2.5 + Math.random() * 3) + 's';
            document.body.appendChild(h);
            setTimeout(() => h.remove(), 6000);
        }, i * 120);   // сердечки падают волной, а не все разом
    }
}