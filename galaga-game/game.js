// ======================================================
//  GALAGA — космический шутер
// ======================================================

// ---------- 1. Холст и элементы интерфейса ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;    // 480
const H = canvas.height;   // 640

// ---------- 2. Элементы интерфейса ----------
const scoreEl = document.getElementById('score');
const waveEl = document.getElementById('wave');
const livesEl = document.getElementById('lives');
const weaponEl = document.getElementById('weapon');
const menuScreen = document.getElementById('menuScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// ---------- 3. Состояние игры ----------
let gameRunning = false;
let score = 0;
let wave = 1;
let lives = 3;
let frame = 0;   // счётчик кадров — «сердцебиение» всех анимаций

// ---------- 4. Игрок ----------
const player = {
    x: W / 2,
    y: H - 60,
    speed: 5,
    width: 36,
    height: 24,
    cooldown: 0,        // кадров до следующего выстрела
    weapon: 'normal',   // normal | rapid | triple | laser
    weaponTimer: 0,     // сколько кадров продлится бонус
    invulnerable: 0     // кадры неуязвимости после попадания
};

// ---------- 5. Массивы игровых объектов ----------
let bullets = [];        // выстрелы игрока
let enemyBullets = [];   // выстрелы врагов
let enemies = [];        // враги
let powerups = [];       // падающие бонусы
let particles = [];      // осколки взрывов

// ---------- 6. Звёздное небо ----------
const stars = [];
for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.3   // у каждой звезды своя скорость — эффект глубины
    });
}

function drawStars() {
    for (const s of stars) {
        s.y += s.speed;
        if (s.y > H) {              // улетела вниз — появляется сверху
            s.y = 0;
            s.x = Math.random() * W;
        }
        ctx.fillStyle = 'rgba(255,255,255,' + (s.size / 2.5) + ')';
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
}

// ---------- 7. Управление ----------
const keys = {};
document.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();   // чтобы страница не прокручивалась
    }
});
document.addEventListener('keyup', function (e) {
    keys[e.code] = false;
});

// ---------- 8. Создание волны врагов ----------
function spawnWave() {
    enemies = [];
    const rows = Math.min(2 + wave, 4);      // рядов: от 3 до 4
    const cols = Math.min(6 + wave, 10);     // колонок растёт с волной
    const startX = 70;
    const startY = 70;
    const gapX = (W - startX * 2) / (cols - 1);
    const gapY = 44;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            enemies.push({
                baseX: startX + c * gapX,    // «домашняя» клетка в строю
                baseY: startY + r * gapY,
                x: startX + c * gapX,
                y: startY + r * gapY,
                phase: Math.random() * Math.PI * 2,  // личный ритм анимации
                type: r === 0 ? 'boss' : 'normal',   // верхний ряд — командиры
                hp: r === 0 ? 2 : 1,                  // командир держит 2 попадания
                state: 'formation',                   // formation | diving | returning
                diveT: 0,
                diveStartX: 0,
                diveStartY: 0,
                diveTargetX: 0,
                width: 30,
                height: 22
            });
        }
    }
}

// ---------- 9. Поведение врагов ----------
function updateEnemies() {
    // Весь строй плавно «дышит» влево-вправо
    const sway = Math.sin(frame * 0.02) * 30;

    for (const e of enemies) {

        if (e.state === 'formation') {
            // Покачивание строя + лёгкое индивидуальное дрожание
            e.x = e.baseX + sway + Math.sin(frame * 0.05 + e.phase) * 5;
            e.y = e.baseY + Math.cos(frame * 0.04 + e.phase) * 3;

            // Случайный шанс пикировать (растёт с каждой волной)
            if (Math.random() < 0.0003 * wave) {
                e.state = 'diving';
                e.diveT = 0;
                e.diveStartX = e.x;
                e.diveStartY = e.y;
                e.diveTargetX = player.x;   // целится туда, где игрок сейчас
            }
            // Случайный выстрел из строя
            else if (Math.random() < 0.0008 * wave) {
                enemyBullets.push({ x: e.x, y: e.y + 14, speed: 3 + wave * 0.4, r: 4 });
            }

        } else if (e.state === 'diving') {
            // Пикирование: дуга вниз, заканчивается за нижним краем экрана
            e.diveT += 0.012 + wave * 0.001;
            e.x = e.diveStartX + Math.sin(e.diveT * Math.PI * 2) * 70
                  + (e.diveTargetX - e.diveStartX) * e.diveT;
            e.y = e.diveStartY + e.diveT * (H + 60 - e.diveStartY);

            // Во время пикирования стреляет чаще
            if (Math.random() < 0.02) {
                enemyBullets.push({ x: e.x, y: e.y + 14, speed: 3 + wave * 0.4, r: 4 });
            }

            if (e.diveT >= 1) {
                e.state = 'returning';
                e.x = W / 2 + (Math.random() - 0.5) * W * 0.7;
                e.y = -30;   // появится сверху
            }

        } else if (e.state === 'returning') {
            // Возвращение на своё место в строю
            const targetX = e.baseX + sway;
            const targetY = e.baseY;
            e.x += (targetX - e.x) * 0.04;
            e.y += (targetY - e.y) * 0.04 + 1.2;

            if (Math.abs(e.x - targetX) < 6 && Math.abs(e.y - targetY) < 6) {
                e.state = 'formation';
            }
        }
    }
}

// ---------- 10. Игрок: движение и стрельба ----------
function updatePlayer() {
    if (keys['ArrowLeft'] && player.x > 24) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < W - 24) player.x += player.speed;
    if (keys['Space']) shoot();

    if (player.cooldown > 0) player.cooldown--;
    if (player.invulnerable > 0) player.invulnerable--;

    // Отсчёт времени бонусного оружия
    if (player.weaponTimer > 0) {
        player.weaponTimer--;
        if (player.weaponTimer === 0) {
            player.weapon = 'normal';
            weaponEl.textContent = '';
        }
    }
}

function shoot() {
    if (player.cooldown > 0) return;   // пушка ещё «перезаряжается»

    if (player.weapon === 'laser') {
        // Пробивной луч: летит сквозь врагов
        bullets.push({ x: player.x, y: player.y - 16, vx: 0, speed: 16,
                       damage: 1, piercing: true, type: 'laser' });
        player.cooldown = 20;

    } else if (player.weapon === 'triple') {
        // Три снаряда веером
        bullets.push({ x: player.x, y: player.y - 16, vx: 0,    speed: 12, damage: 1 });
        bullets.push({ x: player.x, y: player.y - 16, vx: -2.5, speed: 12, damage: 1 });
        bullets.push({ x: player.x, y: player.y - 16, vx: 2.5,  speed: 12, damage: 1 });
        player.cooldown = 24;

    } else if (player.weapon === 'rapid') {
        bullets.push({ x: player.x, y: player.y - 16, vx: 0, speed: 13, damage: 1 });
        player.cooldown = 6;   // в 2.5 раза быстрее обычного

    } else {
        bullets.push({ x: player.x, y: player.y - 16, vx: 0, speed: 13, damage: 1 });
        player.cooldown = 15;
    }
}

// ---------- 11. Полёт снарядов и попадания ----------
function updateBullets() {

    // --- Снаряды игрока (летят вверх) ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.y -= b.speed;
        b.x += b.vx || 0;

        if (b.y < -20) { bullets.splice(i, 1); continue; }

        // Проверяем столкновение с каждым врагом
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (Math.abs(b.x - e.x) < e.width / 2 + 3 &&
                Math.abs(b.y - e.y) < e.height / 2 + 6) {

                e.hp -= b.damage;

                if (e.hp <= 0) {
                    explode(e.x, e.y, e.type === 'boss' ? '#ff00ff' : '#06d6a0');
                    score += e.type === 'boss' ? 150 : 50;
                    maybeDropPowerup(e.x, e.y);
                    enemies.splice(j, 1);
                } else {
                    explode(b.x, b.y, '#ffffff', 5);   // вспышка на подбитом командире
                    score += 10;
                }

                if (b.piercing) {
                    b.y = e.y - e.height / 2 - 10;   // луч «проскакивает» сквозь цель
                } else {
                    bullets.splice(i, 1);
                }
                break;
            }
        }
    }

    // --- Снаряды врагов (летят вниз) ---
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.y += b.speed;

        if (b.y > H + 10) { enemyBullets.splice(i, 1); continue; }

        if (player.invulnerable === 0 &&
            Math.abs(b.x - player.x) < player.width / 2 - 4 &&
            Math.abs(b.y - player.y) < player.height / 2) {
            enemyBullets.splice(i, 1);
            hitPlayer();
        }
    }
}

// ---------- 12. Таран: враг врезался в игрока ----------
function checkPlayerCollision() {
    if (player.invulnerable > 0) return;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (Math.abs(e.x - player.x) < 26 && Math.abs(e.y - player.y) < 22) {
            explode(e.x, e.y, '#ff00ff');
            enemies.splice(i, 1);
            hitPlayer();
            break;
        }
    }
}

function hitPlayer() {
    lives--;
    explode(player.x, player.y, '#00ffea', 30);
    player.invulnerable = 100;   // полторы секунды мерцания-неуязвимости
    player.x = W / 2;
    updateHUD();
    if (lives <= 0) gameOver();
}

// ---------- 13. Бонусы ----------
const POWERUP_TYPES = [
    { kind: 'rapid',  letter: 'R',  color: '#ffd166', name: '⚡ СКОРОСТРЕЛЬНОСТЬ' },
    { kind: 'triple', letter: 'T',  color: '#06d6a0', name: '🔱 ТРОЙНОЙ ЗАЛП' },
    { kind: 'laser',  letter: 'L',  color: '#ef476f', name: '🔆 ЛАЗЕР' },
    { kind: 'life',   letter: '+1', color: '#ff5964', name: '❤ ЖИЗНЬ' }
];

function maybeDropPowerup(x, y) {
    if (Math.random() < 0.15) {   // 15% шанс выпадения из врага
        const t = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({ x: x, y: y, speed: 2, kind: t.kind,
                        letter: t.letter, color: t.color, name: t.name });
    }
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.y += p.speed;

        if (p.y > H + 20) { powerups.splice(i, 1); continue; }

        // Пойман игроком
        if (Math.abs(p.x - player.x) < 28 && Math.abs(p.y - player.y) < 24) {
            applyPowerup(p);
            powerups.splice(i, 1);
        }
    }
}

function applyPowerup(p) {
    if (p.kind === 'life') {
        lives = Math.min(lives + 1, 5);   // максимум 5 жизней
        updateHUD();
    } else {
        player.weapon = p.kind;
        player.weaponTimer = 60 * 12;     // бонус работает 12 секунд
    }
    weaponEl.textContent = p.name;
    score += 25;
}

// ---------- 14. Частицы взрывов ----------
function explode(x, y, color, count) {
    count = count || 18;
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30 + Math.random() * 20,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = p.life / 40;   // плавно гаснут
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
}

// ---------- 15. Игрок (с анимированным пламенем двигателя) ----------
function drawPlayer() {
    // Мерцание во время неуязвимости: корабль рисуется через кадр
    if (player.invulnerable > 0 && Math.floor(frame / 4) % 2 === 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    // Пламя двигателя — длина каждый кадр случайная, поэтому «трепещет»
    const flame = 10 + Math.random() * 8;
    ctx.fillStyle = '#ff9f1c';
    ctx.shadowColor = '#ff9f1c';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(0, 12 + flame);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();

    // Корпус
    ctx.fillStyle = '#00ffea';
    ctx.shadowColor = '#00ffea';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(-14, 12);
    ctx.lineTo(-5, 8);
    ctx.lineTo(0, 10);
    ctx.lineTo(5, 8);
    ctx.lineTo(14, 12);
    ctx.closePath();
    ctx.fill();

    // Кабина
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ---------- 16. Враги (с машущими крыльями) ----------
function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

        const isBoss = e.type === 'boss';
        const color = isBoss ? '#ff00ff' : '#06d6a0';

        // Крылья машут: синус от кадра + личная фаза врага,
        // поэтому строй машет не синхронно, а «волной»
        const flap = Math.sin(frame * 0.25 + e.phase) * 8;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;

        // Левое крыло
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-16, -6 - flap);
        ctx.lineTo(-16, 6 + flap);
        ctx.closePath();
        ctx.fill();

        // Правое крыло
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(16, -6 - flap);
        ctx.lineTo(16, 6 + flap);
        ctx.closePath();
        ctx.fill();

        // Тело
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Глаз
        ctx.shadowBlur = 0;
        ctx.fillStyle = isBoss ? '#ffffff' : '#ff5964';
        ctx.beginPath();
        ctx.arc(0, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Подбитый командир (осталось 1 hp) — белая «трещина»
        if (isBoss && e.hp === 1) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-4, -8);
            ctx.lineTo(3, 6);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ---------- 17. Снаряды и бонусы ----------
function drawBullets() {
    for (const b of bullets) {
        if (b.type === 'laser') {
            // Лазер — длинная светящаяся линия
            ctx.strokeStyle = '#ef476f';
            ctx.shadowColor = '#ef476f';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x, b.y - 32);
            ctx.stroke();
            ctx.lineWidth = 1;
        } else {
            ctx.fillStyle = '#ffd166';
            ctx.shadowColor = '#ffd166';
            ctx.shadowBlur = 8;
            ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        }
    }

    ctx.fillStyle = '#ff5964';
    ctx.shadowColor = '#ff5964';
    ctx.shadowBlur = 8;
    for (const b of enemyBullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawPowerups() {
    for (const p of powerups) {
        // Бонус пульсирует, чтобы привлекать внимание
        const pulse = 1 + Math.sin(frame * 0.15) * 0.15;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(pulse, pulse);

        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#050510';
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.letter, 0, 1);

        ctx.restore();
    }
}

// ---------- 18. Таблица рекордов (localStorage) ----------
function getHighScores() {
    return JSON.parse(localStorage.getItem('galagaHighScores') || '[]');
}

function saveHighScore(value) {
    const scores = getHighScores();
    scores.push(value);
    scores.sort(function (a, b) { return b - a; });   // по убыванию
    localStorage.setItem('galagaHighScores', JSON.stringify(scores.slice(0, 5)));
}

function renderHighScores() {
    const scores = getHighScores();
    let html = '';
    if (scores.length === 0) {
        html = '<li>Рекордов пока нет — стань первым!</li>';
    } else {
        for (let i = 0; i < scores.length; i++) {
            html += '<li><span>#' + (i + 1) + '</span>' + scores[i] + '</li>';
        }
    }
    document.getElementById('highScoresMenu').innerHTML = html;
    document.getElementById('highScoresEnd').innerHTML = html;
}

// ---------- 19. HUD, старт и конец игры ----------
function updateHUD() {
    scoreEl.textContent = score;
    waveEl.textContent = wave;
    livesEl.textContent = '❤'.repeat(Math.max(lives, 0));
}

function checkWaveClear() {
    if (enemies.length === 0) {
        wave++;
        score += 500;   // бонус за зачистку волны
        spawnWave();
        updateHUD();
    }
}

function startGame() {
    score = 0;
    wave = 1;
    lives = 3;
    frame = 0;
    bullets = [];
    enemyBullets = [];
    powerups = [];
    particles = [];

    player.x = W / 2;
    player.weapon = 'normal';
    player.weaponTimer = 0;
    player.cooldown = 0;
    player.invulnerable = 0;
    weaponEl.textContent = '';

    spawnWave();
    updateHUD();
    renderHighScores();

    menuScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
}

function gameOver() {
    gameRunning = false;
    saveHighScore(score);
    finalScoreEl.textContent = score;
    renderHighScores();
    gameOverScreen.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// ---------- 20. Главный игровой цикл ----------
function loop() {
    frame++;
    ctx.clearRect(0, 0, W, H);   // стираем прошлый кадр
    drawStars();

    if (gameRunning) {
        updatePlayer();
        updateEnemies();
        updateBullets();
        updatePowerups();
        updateParticles();
        checkPlayerCollision();
        checkWaveClear();
        updateHUD();
    }

    drawEnemies();
    drawPowerups();
    drawBullets();
    drawParticles();
    if (gameRunning) drawPlayer();

    requestAnimationFrame(loop);   // браузер вызовет loop снова (~60 раз в секунду)
}

renderHighScores();   // показать рекорды ещё на стартовом экране
loop();               // запуск!