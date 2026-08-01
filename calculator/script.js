const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

buttons.forEach(function (button) {
    button.addEventListener('click', function () {
        const value = button.textContent;

        if (value === 'C') {
            display.value = '';
        } else if (value === '=') {
            try {
                display.value = eval(display.value);
            } catch (error) {
                display.value = 'Ошибка';
            }
        } else {
            display.value += value;
        }
    });
});