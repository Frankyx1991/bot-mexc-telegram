import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import crypto from 'crypto';

dotenv.config();

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';

let capitalTotal = 180;
let historial = [];
let primeraCompraRealizada = false;

function getSignature(queryString) {
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function obtenerPrecioActual() {
  const res = await axios.get(`${BASE_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
  return parseFloat(res.data.price);
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;

  const precio = await obtenerPrecioActual();
  const cantidad = 15 / precio;
  const timestamp = Date.now();
  const queryString = `symbol=${SYMBOL}&side=BUY&type=LIMIT&timeInForce=GTC&quantity=${cantidad.toFixed(2)}&price=${precio.toFixed(4)}&timestamp=${timestamp}`;
  const signature = getSignature(queryString);

  await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY }
  });

  historial.push({ tipo: 'compra', precioCompra: precio, cantidad });
  primeraCompraRealizada = true;

  console.log(`✅ Compra inicial realizada a ${precio}`);
}

async function evaluarYOperar() {
  if (!primeraCompraRealizada) return;

  const precioActual = await obtenerPrecioActual();
  const decision = Math.random() > 0.5 ? 'compra' : 'venta';

  if (decision === 'compra' && capitalTotal >= 15) {
    const cantidad = 15 / precioActual;
    const timestamp = Date.now();
    const queryString = `symbol=${SYMBOL}&side=BUY&type=LIMIT&timeInForce=GTC&quantity=${cantidad.toFixed(2)}&price=${precioActual.toFixed(4)}&timestamp=${timestamp}`;
    const signature = getSignature(queryString);

    await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
      headers: { 'X-MEXC-APIKEY': API_KEY }
    });

    historial.push({ tipo: 'compra', precioCompra: precioActual, cantidad });
    capitalTotal -= 15;

    console.log(`🟢 Compra aleatoria a ${precioActual}`);
  } else if (decision === 'venta') {
    for (let i = 0; i < historial.length; i++) {
      const compra = historial[i];
      if (!compra.vendida && precioActual >= compra.precioCompra * 1.15) {
        const timestamp = Date.now();
        const queryString = `symbol=${SYMBOL}&side=SELL&type=LIMIT&timeInForce=GTC&quantity=${compra.cantidad.toFixed(2)}&price=${precioActual.toFixed(4)}&timestamp=${timestamp}`;
        const signature = getSignature(queryString);

        await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
          headers: { 'X-MEXC-APIKEY': API_KEY }
        });

        capitalTotal += precioActual * compra.cantidad;
        historial[i].vendida = true;

        console.log(`🔴 Venta ejecutada a ${precioActual} (ganancia 15%)`);
      }
    }
  }
}

// Ejecutar cada hora
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot...');
  await hacerCompraInicial();
  await evaluarYOperar();
});
