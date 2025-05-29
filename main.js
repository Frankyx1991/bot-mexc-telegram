import express from 'express';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Ruta para comprobar el estado del bot
app.get('/', (req, res) => {
  res.send('✅ El bot está funcionando correctamente.');
});

// Función para registrar datos en Google Sheets
async function registrarPrecioEnSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const symbol = process.env.MEXC_PAIR || 'SHIBUSDT';
    const apiUrl = `https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`;

    const { data } = await axios.get(apiUrl);
    const precio = parseFloat(data.price);
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Hoja1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, symbol, precio]],
      },
    });

    console.log(`📈 Registrado: ${symbol} a ${precio} en ${timestamp}`);
  } catch (error) {
    console.error('❌ Error registrando en Google Sheets:', error.message);
  }
}

// Ejecutar cada hora en punto
cron.schedule('0 * * * *', () => {
  console.log('🕒 Ejecutando tarea programada...');
  registrarPrecioEnSheets();
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${port}`);
});
