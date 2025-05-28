const express = require("express");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 8080;

// Variables de entorno (desde .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Endpoint de prueba para Railway
app.get("/test", async (req, res) => {
  try {
    const mensaje = "✅ Tu bot en Railway está activo y respondiendo correctamente.";
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensaje
    });

    res.send("📨 Mensaje enviado correctamente a Telegram.");
  } catch (err) {
    console.error("❌ Error enviando mensaje a Telegram:", err.message);
    res.status(500).send("Error enviando mensaje a Telegram");
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
});
