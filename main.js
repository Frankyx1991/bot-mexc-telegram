import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { google } from 'googleapis';
import cron from 'node-cron';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('✅ Bot funcionando correctamente.');
});

// Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

function sign(queryString) {
  return crypto.createHmac('sha256', process.env.MEXC_SECRET_KEY)
    .update(queryString)
    .digest('hex');
}

async function placeOrder(symbol, side, quantity) {
  const timestamp = Date.now();
  const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
  const signature = sign(query);
  const url = `https://api.mexc.com/api/v3/order?${query}&signature=${signature}`;
  try {
    const response = await axios.post(url, null, {
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_API_KEY
      }
    });
    return response.data;
  } catch (err) {
    console.error('❌ Error al operar en MEXC:', err.response?.data || err.message);
    return null;
  }
}

async function agregarDatosASheets(data) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Hoja1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString(), ...data]],
      },
    });
  } catch (error) {
    console.error('❌ Error al añadir datos a Sheets:', error);
  }
}

const cryptos = ['SHIBUSDT', 'XRPUSDT', 'FETUSDT', 'CGPTUSDT'];
const cantidadPorOrden = 4;
let preciosCompra = {};

async function estrategia() {
  console.log('🚀 Ejecutando estrategia automática...');
  for (const symbol of cryptos) {
    try {
      const { data } = await axios.get(`https://api.mexc.com/api/v3/ticker/price?symbol=${symbol}`);
      const precioActual = parseFloat(data.price);

      if (!preciosCompra[symbol]) {
        const precioInicial = precioActual / 0.85;
        const orden = await placeOrder(symbol, 'BUY', (cantidadPorOrden / precioActual).toFixed(5));
        if (orden) {
          preciosCompra[symbol] = precioActual;
          await agregarDatosASheets([symbol, 'BUY', precioActual]);
        }
      } else if (precioActual >= preciosCompra[symbol] * 1.15) {
        const orden = await placeOrder(symbol, 'SELL', (cantidadPorOrden / preciosCompra[symbol]).toFixed(5));
        if (orden) {
          await agregarDatosASheets([symbol, 'SELL', precioActual]);
          delete preciosCompra[symbol];
        }
      }
    } catch (err) {
      console.error(`🔴 Error con ${symbol}:`, err.message);
    }
  }
}

cron.schedule('0 * * * *', estrategia);

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en el puerto ${port}`);
});
