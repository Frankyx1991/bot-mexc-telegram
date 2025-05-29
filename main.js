
import express from 'express';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Estado para UptimeRobot
app.get('/', (req, res) => {
  res.send('✅ El bot está funcionando correctamente.');
});

// Firmar para MEXC
function sign(queryString) {
  return crypto.createHmac('sha256', process.env.MEXC_API_SECRET)
    .update(queryString)
    .digest('hex');
}

// Enviar orden a MEXC
async function placeOrder(symbol, side, quantity) {
  const timestamp = Date.now();
  const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const signature = sign(query);
  const url = `https://api.mexc.com/api/v3/order?${query}&signature=${signature}`;
  try {
    const response = await axios.post(url, null, {
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log('✅ Orden ejecutada:', response.data);
    return response.data;
  } catch (err) {
    console.error('❌ Error al operar en MEXC:', err.response?.data || err.message);
    return null;
  }
}

// Añadir datos a Google Sheets
async function agregarDatosASheets(moneda, precio) {
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
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Hoja1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[timestamp, moneda, precio]],
      },
    });

    console.log('📥 Precio añadido a Sheets:', precio, '⏰', timestamp);
  } catch (error) {
    console.error('❌ Error al añadir datos a Sheets:', error.message);
  }
}

// Estrategia de compra/venta
async function estrategiaAutomatica() {
  try {
    console.log('🚀 Ejecutando estrategia automática...');
    const tokens = ['SHIBUSDT', 'XRPUSDT', 'FETUSDT', 'CGPTUSDT'];

    for (let symbol of tokens) {
      const response = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`);
      const price = parseFloat(response.data.price);
      console.log(`📊 Precio de ${symbol}: ${price}`);

      await agregarDatosASheets(symbol, price);

      if (price < 0.00002) {
        await placeOrder(symbol, 'BUY', 200000);
      } else if (price > 0.00003) {
        await placeOrder(symbol, 'SELL', 200000);
      }
    }
  } catch (error) {
    console.error('❌ Error en estrategia automática:', error.message);
  }
}

// Ejecutar cada hora
cron.schedule('0 * * * *', () => {
  estrategiaAutomatica();
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en el puerto ${port}`);
});
