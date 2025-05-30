import axios from 'axios';
import dotenv from 'dotenv';
import cron from 'node-cron';
import crypto from 'crypto';

dotenv.config();

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

async function enviarMensajeTelegram(mensaje) {
  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: mensaje,
    });
  } catch (error) {
    console.error('❌ Error al enviar mensaje a Telegram:', error.message);
  }
}

async function obtenerSaldoDisponible() {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = getSignature(queryString);
  const res = await axios.get(`${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`, {
    headers: { 'X-MEXC-APIKEY': API_KEY },
  });
  const usdt = res.data.balances.find(b => b.asset === 'USDT');
  return parseFloat(usdt.free);
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;
  const precio = await obtenerPrecioActual();
  const cantidad = 15 / precio;
  const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${Date.now()}`;
  const signature = getSignature(queryString);
  await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY },
  });
  historial.push({ tipo: 'compra', precioCompra: precio, cantidad });
  primeraCompraRealizada = true;
  console.log(`✅ Compra inicial realizada a ${precio}`);
  await enviarMensajeTelegram(`✅ Compra inicial de XRP a ${precio.toFixed(4)} USDT`);
}

async function evaluarYOperar() {
  if (!primeraCompraRealizada) return;
  const precioActual = await obtenerPrecioActual();
  const decision = Math.random() > 0.5 ? 'compra' : 'venta';

  if (decision === 'compra' && capitalTotal >= 15) {
    const cantidad = 15 / precioActual;
    const queryString = `symbol=${SYMBOL}&side=BUY&type=MARKET&quantity=${cantidad.toFixed(2)}&timestamp=${Date.now()}`;
    const signature = getSignature(queryString);
    await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
      headers: { 'X-MEXC-APIKEY': API_KEY },
    });
    historial.push({ tipo: 'compra', precioCompra: precioActual, cantidad });
    capitalTotal -= 15;
    console.log(`🟢 Compra aleatoria a ${precioActual}`);
    await enviarMensajeTelegram(`🟢 Compra aleatoria de XRP a ${precioActual.toFixed(4)} USDT`);
  } else if (decision === 'venta') {
    for (let i = 0; i < historial.length; i++) {
      const compra = historial[i];
      if (!compra.vendida && precioActual >= compra.precioCompra * 1.15) {
        const queryString = `symbol=${SYMBOL}&side=SELL&type=MARKET&quantity=${compra.cantidad.toFixed(2)}&timestamp=${Date.now()}`;
        const signature = getSignature(queryString);
        await axios.post(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {}, {
          headers: { 'X-MEXC-APIKEY': API_KEY },
        });
        capitalTotal += precioActual * compra.cantidad;
        historial[i].vendida = true;
        console.log(`🔴 Venta a ${precioActual} con ganancia 15%`);
        const saldo = await obtenerSaldoDisponible();
        await enviarMensajeTelegram(`🔴 Venta a ${precioActual.toFixed(4)} USDT\n💰 Nuevo saldo: ${saldo.toFixed(2)} USDT`);
      }
    }
  }
}

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot XRP...');
  await hacerCompraInicial();
  await evaluarYOperar();
});
