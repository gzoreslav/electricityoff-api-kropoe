# ElectricityOff API — Кропивницький (KROPOE)

Публічне API графіків відключень для **Кіровоградобленерго** (провайдер `KROPOE`).

Джерело — `https://kiroe.com.ua/electricity-blackout/websearch/v3/{addressId}`, тіло `ajax=1`. Сайт стоїть за Cloudflare, тож запит іде через український проксі, як у Запоріжжя.

Черги `1.1` … `6.2` збираються всі разом. Коди годин: `0` вимкнено, `1` увімкнено, `2` немає даних, `3` вимкнено з 30-ї хвилини, `4` вимкнено до 30-ї хвилини.

## Endpoints

- `GET /api/v1` — статус
- `GET /api/v1/off` або `GET /api/v1/off/KROPOE` — події відключень

### Формат відповіді

```json
{
  "events": [
    {
      "date": "2026-10-08",
      "startTime": "09:00",
      "endTime": "12:30",
      "provider": "KROPOE",
      "electricity": "off",
      "queue": "1.1"
    }
  ],
  "hasTodayData": true,
  "hasTomorrowData": true,
  "serverTime": "08-10-2026 10:00"
}
```

## Deploy

```bash
npm install
npx vercel --prod
```
