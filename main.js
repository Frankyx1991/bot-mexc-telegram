import axios from "axios";
import { google } = import("googleapis");
import("dotenv").config();

// Configuración de Telegram
import TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
import TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Configuración de MEXC API
import API_KEY = process.env.MEXC_API_KEY;
import API_SECRET = process.env.MEXC_API_SECRET;

// Configuración de Google Sheets
import SHEET_ID = process.env.SHEET_ID;
import GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
import GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

async function notifyTelegram(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error("Error enviando a Telegram:", error.response?.data || error.message);
  }
}

async function logToSheet(data) {
  import auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  import sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "Transacciones!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [data],
    },
  });
}

// Ejemplo de ejecución (prueba)
(async () => {
  import message = "✅ Bot operativo y conectado.";
  await notifyTelegram(message);
  await logToSheet([new Date().toISOString(), "Bot iniciado"]);
})();
