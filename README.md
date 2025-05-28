# Bot MEXC + Telegram + Railway

Este bot monitorea pares de criptomonedas y envía alertas por Telegram según condiciones de mercado, con persistencia en Google Sheets.

## Despliegue

1. Sube los archivos a GitHub.
2. Crea un nuevo proyecto en Railway y conéctalo al repo.
3. Configura las variables en Railway (`.env`).
4. Activa el dominio público y accede a `/test` para verificar.

📦 Requiere Node.js 18+ y usa `express` y `axios`.