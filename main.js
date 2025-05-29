import express from 'express';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Función para firmar solicitudes a la API de MEXC
function signRequest(queryString, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
}

// Obtener balance o ejecutar compra o venta
async function operarMEXC() {
  try {
    const timestamp = Date.now();
    const symbol = 'SHIBUSDT';

    // Paso 1: Obtener el precio actual
    const precioResp = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`);
    const precio = parseFloat(precioResp.data.price);

    // Paso 2: Ejecutar compra (ejemplo con market order)
    const query = `symbol=${symbol}&side=BUY&type=MARKET&quoteOrderQty=10&timestamp=${timestamp}`;
    const signature = signRequest(query, process.env.MEXC_SECRET_KEY);
    const response = await axios.post(`https://api.mexc.com/api/v3/order?${query}&signature=${signature}`, null, {
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
      },
    });

    console.log('✅ Orden ejecutada:', response.data);

    return { precio, timestamp, status: 'Compra ejecutada' };
  } catch (error) {
    console.error('❌ Error al operar en MEXC:', error.message);
    return { precio: null, timestamp: new Date().toISOString(), status: 'Error' };
  }
}

// Función para agregar datos a Google Sheets
async function agregarDatosASheets(precio, timestamp, status) {
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
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Hoja1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, 'SHIBA', precio, status]],
      },
    });

    console.log('📥 Datos añadidos a Sheets.');
  } catch (error) {
    console.error('❌ Error al añadir datos a Sheets:', error.message);
  }
}

// Ejecutar cada 60 minutos
cron.schedule('0 * * * *', async () => {
  console.log('🚀 Ejecutando tarea programada...');
  const result = await operarMEXC();
  await agregarDatosASheets(result.precio, result.timestamp, result.status);
});

// Ruta básica para UptimeRobot
app.get('/', (req, res) => {
  res.send('✅ Bot operativo y escuchando.');
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en el puerto ${port}`);
});
