// main.js definitivo sin Google Sheets ni Telegram

import express from 'express'; import dotenv from 'dotenv'; import axios from 'axios'; import crypto from 'crypto'; import cron from 'node-cron';

dotenv.config();

const app = express(); const port = process.env.PORT || 3000;

const MEXC_API_KEY = process.env.MEXC_KEY; const MEXC_SECRET_KEY = process.env.MEXC_SECRET;

const pares = ['SHIBUSDT', 'XRPUSDT', 'FETUSDT', 'CGPTUSDT'];

app.use(express.json());

// Respuesta de estado app.get('/', (req, res) => { res.send('✅ Bot MEXC funcionando.'); });

// Función para generar firma function firmar(query_string, secretKey) { return crypto.createHmac('sha256', secretKey).update(query_string).digest('hex'); }

// Ejecutar compra o venta market async function ejecutarOrden(tipo, simbolo) { const timestamp = Date.now(); const quantity = await calcularCantidad(simbolo);

const params = symbol=${simbolo}&side=${tipo.toUpperCase()}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}; const signature = firmar(params, MEXC_SECRET_KEY);

try { const response = await axios.post( https://api.mexc.com/api/v3/order?${params}&signature=${signature}, {}, { headers: { 'X-MEXC-APIKEY': MEXC_API_KEY, }, } ); console.log(✅ Orden ${tipo} ejecutada para ${simbolo}:, response.data); } catch (error) { console.error(❌ Error al ejecutar orden ${tipo} para ${simbolo}:, error.response?.data || error.message); } }

// Calcular cantidad para operar 40 USDT por par (aproximadamente) async function calcularCantidad(simbolo) { try { const { data } = await axios.get(https://api.mexc.com/api/v3/ticker/price?symbol=${simbolo}); const precio = parseFloat(data.price); const cantidad = (40 / precio).toFixed(0); return cantidad; } catch (error) { console.error(❌ Error obteniendo precio de ${simbolo}:, error.message); return 0; } }

// Ruta webhook para TradingView app.post('/webhook', async (req, res) => { const { action, symbol } = req.body;

if (!action || !symbol) { return res.status(400).send('Faltan campos obligatorios.'); }

if (!pares.includes(symbol)) { return res.status(400).send('Par no permitido.'); }

if (action.toUpperCase() === 'BUY' || action.toUpperCase() === 'SELL') { await ejecutarOrden(action.toUpperCase(), symbol); res.send(✅ Orden ${action} recibida para ${symbol}); } else { res.status(400).send('Acción no válida'); } });

// Cron opcional: ejecutar automáticamente cada hora cron.schedule('0 * * * *', async () => { console.log('⏰ Ejecutando revisión automática...'); for (const simbolo of pares) { // lógica para decidir si comprar/vender puede ir aquí } });

// Iniciar servidor app.listen(port, '0.0.0.0', () => { console.log(🚀 Bot corriendo en puerto ${port}); });

