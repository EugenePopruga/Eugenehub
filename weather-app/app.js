const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// ---------- Запросы к API ----------

async function getWeather(city) {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=ru`;
  const res = await fetch(url);
  if (res.status === 404) throw new Error('Город не найден. Проверьте написание.');
  if (res.status === 401) throw new Error('Неверный API-ключ (или он ещё не активирован).');
  if (!res.ok) throw new Error('Ошибка сети. Попробуйте позже.');
  return res.json();
}

async function getForecast(city) {
  const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=ru`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Не удалось загрузить прогноз.');
  return res.json();
}

// ---------- Иконки погоды и день/ночь ----------

// Определяем день или ночь по времени восхода/заката из ответа API
function isDayTime(data) {
  return data.dt >= data.sys.sunrise && data.dt < data.sys.sunset;
}

// Подбираем иконку по коду погоды (id приходит в ответе)
function getWeatherEmoji(weatherId, isDay) {
  if (weatherId >= 200 && weatherId < 300) return '⛈️'; // гроза
  if (weatherId >= 300 && weatherId < 400) return '🌦️'; // морось
  if (weatherId >= 500 && weatherId < 600) return '🌧️'; // дождь
  if (weatherId >= 600 && weatherId < 700) return '❄️'; // снег
  if (weatherId >= 700 && weatherId < 800) return '🌫️'; // туман
  if (weatherId === 800) return isDay ? '☀️' : '🌙';     // ясно
  if (weatherId === 801) return isDay ? '🌤️' : '☁️';    // мало облаков
  if (weatherId === 802) return '⛅';                    // облачно
  return '☁️';                                           // пасмурно
}

// Перевод unix-времени в "ЧЧ:ММ" с учётом часового пояса города
function formatTime(unix, tzOffset) {
  const date = new Date((unix + tzOffset) * 1000);
  return date.toUTCString().slice(17, 22);
}

// ---------- Советы по одежде ----------

function getClothingAdvice(temp, weatherId, wind) {
  const tips = [];

  if (temp <= -20) tips.push('Экстремальный холод: пуховик, термобельё, шапка-ушанка, варежки.');
  else if (temp <= -10) tips.push('Сильный мороз: тёплый пуховик, шапка, шарф, варежки.');
  else if (temp <= 0) tips.push('Морозно: зимняя куртка, шапка и перчатки.');
  else if (temp <= 10) tips.push('Прохладно: куртка или тёплое худи.');
  else if (temp <= 18) tips.push('Свежо: лёгкая куртка, ветровка или свитер.');
  else if (temp <= 25) tips.push('Тепло: футболка, вечером — лёгкая накидка.');
  else tips.push('Жарко: лёгкая одежда, головной убор, возьмите воду.');

  if (weatherId >= 200 && weatherId < 300) tips.push('Гроза: дождевик надёжнее зонта, лучше не выходить без надобности.');
  else if (weatherId >= 300 && weatherId < 600) tips.push('Дождь: возьмите зонт или дождевик, наденьте непромокаемую обувь.');
  if (weatherId >= 600 && weatherId < 700) tips.push('Снег: обувь с нескользящей подошвой будет кстати.');
  if (weatherId >= 700 && weatherId < 800) tips.push('Туман: на дороге видимость хуже, будьте внимательнее.');
  if (wind >= 10) tips.push('Сильный ветер: добавьте ветровку — ощущается холоднее, чем есть.');

  return tips;
}

// ---------- Закреплённые города (localStorage) ----------

function getPinned() {
  return JSON.parse(localStorage.getItem('pinnedCities') || '[]');
}

function togglePin(city) {
  let cities = getPinned();
  if (cities.includes(city)) {
    cities = cities.filter(c => c !== city);
  } else {
    cities.push(city);
  }
  localStorage.setItem('pinnedCities', JSON.stringify(cities));
  renderPinned();
  updatePinButton(city);
}

function updatePinButton(city) {
  const btn = document.getElementById('pin-btn');
  btn.textContent = getPinned().includes(city) ? '✅ Закреплено' : '📌 Закрепить';
}

function renderPinned() {
  const box = document.getElementById('pinned');
  const cities = getPinned();
  box.innerHTML = '';

  if (cities.length === 0) {
    box.innerHTML = '<span class="muted">Пока пусто — найдите город и нажмите «Закрепить».</span>';
    return;
  }

  cities.forEach(city => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span class="chip-name">${city}</span>
                      <span class="chip-temp">…</span>
                      <button class="chip-del" title="Удалить">×</button>`;
    chip.querySelector('.chip-name').addEventListener('click', () => showWeather(city));
    chip.querySelector('.chip-temp').addEventListener('click', () => showWeather(city));
    chip.querySelector('.chip-del').addEventListener('click', (e) => {
      e.stopPropagation();
      togglePin(city);
    });
    box.appendChild(chip);
  });

  // Подгружаем мини-погоду для каждого закреплённого города
  cities.forEach(async (city, i) => {
    try {
      const data = await getWeather(city);
      const tempEl = box.querySelectorAll('.chip-temp')[i];
      if (tempEl) {
        tempEl.textContent = `${getWeatherEmoji(data.weather[0].id, isDayTime(data))} ${Math.round(data.main.temp)}°`;
      }
    } catch { /* если не загрузилось — оставляем многоточие */ }
  });
}

// ---------- Отображение ----------

function renderCurrent(data) {
  const day = isDayTime(data);
  const weatherId = data.weather[0].id;

  document.getElementById('city-name').textContent = `${data.name}, ${data.sys.country}`;
  document.getElementById('day-night').textContent = day ? '☀️ Сейчас день' : '🌙 Сейчас ночь';
  document.getElementById('weather-icon').textContent = getWeatherEmoji(weatherId, day);
  document.getElementById('temp').textContent = `${Math.round(data.main.temp)}°C`;
  document.getElementById('description').textContent = data.weather[0].description;
  document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('wind').textContent = `${data.wind.speed} м/с`;
  document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise, data.timezone);
  document.getElementById('sunset').textContent = formatTime(data.sys.sunset, data.timezone);

  const list = document.getElementById('clothing-list');
  list.innerHTML = '';
  getClothingAdvice(data.main.temp, weatherId, data.wind.speed).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    list.appendChild(li);
  });

  updatePinButton(data.name);
}

function renderHourly(list) {
  const box = document.getElementById('hourly');
  box.innerHTML = '';
  // Берём 8 ближайших отметок = прогноз на сутки вперёд
  list.slice(0, 8).forEach(item => {
    const isDay = item.sys.pod === 'd'; // в прогнозе API само говорит, день или ночь
    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `<div>${item.dt_txt.slice(11, 16)}</div>
                      <div class="h-icon">${getWeatherEmoji(item.weather[0].id, isDay)}</div>
                      <div class="h-temp">${Math.round(item.main.temp)}°</div>
                      <div>${item.weather[0].description}</div>`;
    box.appendChild(card);
  });
}

function renderDaily(list) {
  const box = document.getElementById('daily');
  box.innerHTML = '';

  // Группируем 3-часовые отметки по датам
  const days = {};
  list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    (days[date] = days[date] || []).push(item);
  });

  Object.entries(days).forEach(([date, items]) => {
    const temps = items.map(i => i.main.temp);
    const noon = items.find(i => i.dt_txt.includes('12:00')) || items[0];
    const dayName = new Date(date + 'T12:00:00')
      .toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

    const row = document.createElement('div');
    row.className = 'day-row';
    row.innerHTML = `<div>${dayName}</div>
                     <div class="d-icon">${getWeatherEmoji(noon.weather[0].id, true)}</div>
                     <div class="d-desc">${noon.weather[0].description}</div>
                     <div class="d-temp">${Math.round(Math.min(...temps))}° / ${Math.round(Math.max(...temps))}°</div>`;
    box.appendChild(row);
  });
}

// ---------- Главный сценарий ----------

let currentCity = null;

async function showWeather(city) {
  const errorEl = document.getElementById('error');
  const resultEl = document.getElementById('result');
  errorEl.classList.add('hidden');
  resultEl.classList.add('hidden');

  try {
    // Запрашиваем текущую погоду и прогноз одновременно
    const [current, forecast] = await Promise.all([getWeather(city), getForecast(city)]);
    currentCity = current.name;
    renderCurrent(current);
    renderHourly(forecast.list);
    renderDaily(forecast.list);
    resultEl.classList.remove('hidden');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
}

// ---------- События ----------

const input = document.getElementById('city-input');

document.getElementById('search-btn').addEventListener('click', () => {
  if (input.value.trim()) showWeather(input.value.trim());
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim()) showWeather(input.value.trim());
});

document.getElementById('pin-btn').addEventListener('click', () => {
  if (currentCity) togglePin(currentCity);
});

renderPinned();