import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import crypto from 'crypto';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

const API_KEY = process.env.MEXC_API_KEY;
const SECRET_KEY = process.env.MEXC_SECRET_KEY;
const BASE_URL = 'https://api.mexc.com';
const SYMBOL = 'XRPUSDT';

let capitalTotal = 180;
let historial = [];
let primeraCompraRealizada = false;

app.get('/', (_, res) => {
  res.send('✅ Bot activo');
});

function firmar(queryString) {
  return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function obtenerPrecioActual() {
  const res = await axios.get(`${BASE_URL}/api/v3/ticker/price?symbol=${SYMBOL}`);
  return parseFloat(res.data.price);
}

function decisionIA(tipo, precio) {
  const probabilidad = Math.random();
  if (tipo === 'compra') return probabilidad > 0.4; // 60% chance de comprar si es buena señal
  if (tipo === 'venta') return probabilidad > 0.5; // 50% chance de vender si supera el 15%
  return false;
}

async function hacerOrden(tipo, cantidad) {
  const side = tipo.toUpperCase();
  const timestamp = Date.now();
  const query = `symbol=${SYMBOL}&side=${side}&type=MARKET&quantity=${cantidad}&timestamp=${timestamp}`;
  const signature = firmar(query);
  const url = `${BASE_URL}/api/v3/order?${query}&signature=${signature}`;

  await axios.post(url, {}, {
    headers: { 'X-MEXC-APIKEY': API_KEY },
  });

  console.log(`📈 Orden ${tipo} ejecutada con ${cantidad.toFixed(2)} XRP`);
}

async function hacerCompraInicial() {
  if (primeraCompraRealizada) return;
  const precio = await obtenerPrecioActual();
  const cantidad = 15 / precio;

  if (decisionIA('compra', precio)) {
    await hacerOrden('buy', cantidad);
    historial.push({ precioCompra: precio, cantidad, vendida: false });
    capitalTotal -= 15;
    primeraCompraRealizada = true;
    console.log(`✅ Compra inicial realizada a ${precio}`);
  } else {
    console.log(`⏳ IA decidió NO comprar (compra inicial)`);
  }
}

async function evaluarYOperar() {
  const precio = await obtenerPrecioActual();

  // Simulación de venta
  for (let i = 0; i < historial.length; i++) {
    const c = historial[i];
    const margen = c.precioCompra * 1.15;
    if (!c.vendida && precio >= margen && decisionIA('venta', precio)) {
      await hacerOrden('sell', c.cantidad);
      const ganancia = precio * c.cantidad;
      capitalTotal += ganancia;
      historial[i].vendida = true;
      console.log(`🔴 Venta ejecutada a ${precio} con ganancia`);
    }
  }

  // Compra aleatoria si hay saldo
  if (capitalTotal >= 15 && decisionIA('compra', precio)) {
    const cantidad = 15 / precio;
    await hacerOrden('buy', cantidad);
    historial.push({ precioCompra: precio, cantidad, vendida: false });
    capitalTotal -= 15;
    console.log(`🟢 Compra aleatoria ejecutada a ${precio}`);
  }
}

cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando bot inteligente...');
  await hacerCompraInicial();
  await evaluarYOperar();
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
