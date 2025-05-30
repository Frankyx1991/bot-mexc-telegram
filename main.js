
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const API_KEY = process.env.MEXC_API_KEY;
const API_SECRET = process.env.MEXC_API_SECRET;

const BASE_URL = 'https://api.mexc.com';

// Función para enviar orden de mercado
async function enviarOrden(symbol, side) {
  try {
    const timestamp = Date.now();
    const params = {
      symbol,
      side: side.toUpperCase(),
      type: 'MARKET',
      timestamp
    };

    const queryString = new URLSearchParams(params).toString();
    const signature = await createSignature(queryString);

    const response = await axios.post(`${BASE_URL}/api/v3/order`, null, {
      params: { ...params, signature },
      headers: {
        'X-MEXC-APIKEY': API_KEY
      }
    });

    console.log(`✅ Orden ${side} ejecutada para ${symbol}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al ejecutar orden ${side} para ${symbol}:`, error.response?.data || error.message);
  }
}

// Crear firma con API_SECRET
async function createSignature(queryString) {
  const crypto = await import('crypto');
  return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
}

// Ruta webhook para recibir señales de TradingView
app.post('/webhook', async (req, res) => {
  const { action, symbol } = req.body;

  if (!action || !symbol) {
    return res.status(400).send('❌ Parámetros faltantes');
  }

  console.log(`📩 Señal recibida: ${action.toUpperCase()} ${symbol}`);

  if (action === 'buy' || action === 'sell') {
    await enviarOrden(symbol, action);
    return res.status(200).send('✅ Orden procesada');
  }

  return res.status(400).send('❌ Acción no reconocida');
});

// Ruta base para comprobar funcionamiento
app.get('/', (req, res) => {
  res.send('✅ Bot conectado y esperando señales de TradingView');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en puer
    to ${port}`);
});
