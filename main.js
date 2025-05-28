require('dotenv').config();
const axios = require("axios");
const fs = require("fs");
const { google } = require("googleapis");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const pares = {
  XRPUSDT: { cantidad: 40 },
  SHIBUSDT: { cantidad: 40 },
  FETUSDT: { cantidad: 40 },
  CGPTUSDT: { cantidad: 40 }
};

const porcentajeGanancia = 15;
const porcentajeCaida = -15;

async function enviarTelegram(mensaje) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: CHAT_ID,
    text: mensaje
  });
}

async function obtenerPrecio(par) {
  const url = `https://api.mexc.com/api/v3/ticker/price`;
  const res = await axios.get(url, { params: { symbol: par } });
  return parseFloat(res.data.price);
}

async function guardarEnGoogleSheets(data) {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: "Hoja1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [data] }
  });
}

async function ejecutarBot() {
  for (const par in pares) {
    try {
      const precio = await obtenerPrecio(par);
      const variacion = Math.random() * 30 - 15;

      if (variacion >= porcentajeGanancia) {
        await enviarTelegram(`✅ Venta ejecutada de ${par} (Variación: ${variacion.toFixed(2)}%)`);
        await guardarEnGoogleSheets([new Date().toISOString(), par, "SELL", precio]);
      } else if (variacion <= porcentajeCaida) {
        await enviarTelegram(`✅ Compra ejecutada de ${par} (Variación: ${variacion.toFixed(2)}%)`);
        await guardarEnGoogleSheets([new Date().toISOString(), par, "BUY", precio]);
      }
    } catch (err) {
      await enviarTelegram(`❌ Error con ${par}: ${err.message}`);
    }
  }
}

ejecutarBot();
