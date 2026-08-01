const API_KEY = '0191e53ffaa961c2173d956ad489c005';

const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

async function getWeather(city) {
    const url = 'https://api.openweathermap.org/data/2.5/weather?q='
        + encodeURIComponent(city)
        + '&appid=' + API_KEY
        + '&units=metric&lang=ru';

    // fetch уходит в сеть и возвращает Promise — «обещание» ответа.
    // await приостанавливает функцию, пока ответ не придёт.
    const response = await fetch(url);

    if (!response.ok) {
        // Сервер ответил, но с ошибкой: 404 — город не найден,
        // 401 — неверный или ещё не активированный ключ и т.д.
        throw new Error('HTTP ' + response.status);
    }

    // Тело ответа читается отдельным шагом и тоже асинхронно
    return await response.json();
}

function showStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
}

function renderWeather(data) {
    document.getElementById('cityName').textContent =
        data.name + ', ' + data.sys.country;
    document.getElementById('weatherIcon').src =
        'https://openweathermap.org/img/wn/' + data.weather[0].icon + '@2x.png';
    document.getElementById('temperature').textContent =
        Math.round(data.main.temp) + '°';
    document.getElementById('description').textContent =
        data.weather[0].description;
    document.getElementById('humidity').textContent = data.main.humidity + '%';
    document.getElementById('wind').textContent = data.wind.speed + ' м/с';
    document.getElementById('feelsLike').textContent =
        Math.round(data.main.feels_like) + '°';

    resultEl.classList.remove('hidden');
}

async function search() {
    const city = cityInput.value.trim();
    if (city === '') return;

    searchBtn.disabled = true;
    showStatus('Загрузка...', false);
    resultEl.classList.add('hidden');

    try {
        const data = await getWeather(city);
        showStatus('', false);
        renderWeather(data);
    } catch (error) {
        if (error.message === 'HTTP 404') {
            showStatus('Город не найден. Проверьте написание.', true);
        } else if (error.message === 'HTTP 401') {
            showStatus('Проблема с API-ключом. Проверьте ключ или подождите его активации.', true);
        } else {
            showStatus('Ошибка сети. Проверьте интернет и попробуйте ещё раз.', true);
        }
    } finally {
        // Выполняется всегда — и после успеха, и после ошибки
        searchBtn.disabled = false;
    }
}

searchBtn.addEventListener('click', search);
cityInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') search();
});