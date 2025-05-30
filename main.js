import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Estado para verificar si el bot está activo
app.get('/', (req, res) => {
  res.send('✅ Bot MEXC activo y esperando señales de TradingView.');
});

// Ejecutar orden market en MEXC
async function ejecutarOrden(par, tipoOperacion, cantidad) {
  try {
    const endpoint = '/api/v3/order';
    const timestamp = Date.now();
    const data = {
      symbol: par,
      side: tipoOperacion,
      type: 'MARKET',
      quantity: cantidad,
      timestamp
    };

    // Generar firma con tu clave secreta
    const query = new URLSearchParams(data).toString();
    const signature = new URLSearchParams({
      signature: crypto.createHmac('sha256', process.env.MEXC_SECRET)
        .update(query)
        .digest('hex')
    }).toString();

    const url = `https://api.mexc.com${endpoint}?${query}&${signature}`;
    const response = await axios.post(url, null, {
      headers: {
        'X-MEXC-APIKEY': process.env.MEXC_KEY
      }
    });

    console.log(`✅ Orden ${tipoOperacion} ejecutada en ${par}:`, response.data);
  } catch (error) {
    console.error(`❌ Error ejecutando orden ${tipoOperacion} en ${par}:`, error.response?.data || error.message);
  }
}

// Webhook desde TradingView
app.post('/webhook', async (req, res) => {
  const { par, tipo, cantidad } = req.body;
  if (!par || !tipo || !cantidad) {
    return res.status(400).send('❌ Faltan datos en la señal.');
  }

  await ejecutarOrden(par, tipo.toUpperCase(), cantidad);
  res.send('✅ Señal recibida y orden ejecutada.');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor activo en puerto ${PORT}`);
});
