import express from 'express';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Mensaje de estado para UptimeRobot
app.get('/', (req, res) => {
  res.send('✅ El bot está funcionando correctamente.');
});

// Función para agregar datos a Google Sheets
async function agregarDatosASheets() {
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

    const response = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=SHIBUSDT`);
    const precio = parseFloat(response.data.price);
    const timestamp = new Date().toISOString();

    const sheetResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Hoja1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, 'SHIBA', precio]],
      },
    });

    console.log('📥 Precio agregado:', precio, '⏰', timestamp);
  } catch (error) {
    console.error('❌ Error al añadir datos a Sheets:', error);
  }
}

// Ejecutar cada 60 minutos
cron.schedule('0 * * * *', () => {
  console.log('🚀 Ejecutando tarea programada...');
  agregarDatosASheets();
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en el puerto ${port}`);
});
