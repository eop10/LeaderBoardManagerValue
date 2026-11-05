Автотест экскурсии (Playwright + Chromium)

Подготовка (один раз), в папке tests:
  npm init -y && npm i playwright @fontsource/manrope @fontsource/hanken-grotesk material-symbols react@18.3.1 react-dom@18.3.1
  npx playwright install chromium

Запуск (из корня проекта поднимите сервер: python3 -m http.server 8765):
  cd tests && node full.js                      # все размеры
  node full.js 1000x555,1280x720                # выбранные размеры
  node full.js 1000x555 shots                   # + скриншоты шагов 8, 9, 10, 12 (папка shots/, масштаб ×2)
  INVITE=1 node full.js 1000x555                # запуск тура через плашку-приглашение

Шрифты (Google Fonts) и React (unpkg) подставляются из node_modules через перехват запросов,
поэтому тест работает без интернета и с настоящими шрифтами и иконками.
Результат: results.json и список FAIL в консоли; код возврата не меняется.

Плавность переходов (кадр за кадром, ищет скачки выреза и подсказки между шагами):
  node smooth.js 1000 555
