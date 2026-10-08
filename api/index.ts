import express from 'express';
import axios from 'axios';
import * as moment from 'moment-timezone';
import { eventsFromSchedule, mergeQueueResults } from '../transform';

const app = express();

const PROVIDER_ID = 'KROPOE';
const TZ = 'Europe/Kyiv';
const BASE_URL = 'https://kiroe.com.ua/electricity-blackout/websearch/v3/';
const PROXY_URL = 'http://185.67.1.123:3000/provider';
const API_KEY = 'Z+GhQhqDy6mlRHQJarLMchzCxphCyIfmPwt1188T4MU=';

const addressIdByQueue: Record<string, string> = {
  '1.1': '31713',
  '1.2': '2',
  '2.1': '31702',
  '2.2': '39',
  '3.1': '31709',
  '3.2': '5',
  '4.1': '31707',
  '4.2': '1',
  '5.1': '31703',
  '5.2': '15',
  '6.1': '31705',
  '6.2': '35',
};

function payloadData(body: unknown): { Shedule?: Record<string, number | undefined>[] } {
  const parsed = (typeof body === 'string' ? JSON.parse(body) : body) as {
    data?: Array<{ Shedule?: Record<string, number | undefined>[] }>;
  };
  const row = parsed?.data?.[0];
  if (!row || typeof row !== 'object') {
    throw new Error('KROPOE: unexpected response');
  }
  return row;
}

async function fetchQueue(addressId: string) {
  const response = await axios.post(
    PROXY_URL,
    {
      url: `${BASE_URL}${addressId}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'ajax=1',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      timeout: 30_000,
    }
  );

  return payloadData(response.data);
}

app.get('/api/v1', (_req, res) => res.send('KropyvnytskyiOff (KROPOE) API Status: OK'));

app.get(['/api/v1/off', `/api/v1/off/${PROVIDER_ID}`], async (_req, res) => {
  try {
    const queues = Object.entries(addressIdByQueue);
    const responses = await Promise.all(queues.map(([, addressId]) => fetchQueue(addressId)));

    const today = moment.tz(TZ).format('YYYY-MM-DD');
    const tomorrow = moment.tz(TZ).add(1, 'day').format('YYYY-MM-DD');

    const merged = mergeQueueResults(
      responses.map((row, index) =>
        eventsFromSchedule(row.Shedule, today, tomorrow, queues[index][0])
      )
    );

    res.send({
      ...merged,
      serverTime: moment.tz(TZ).format('DD-MM-YYYY HH:mm'),
    });
  } catch (error: any) {
    console.error('KROPOE fetch failed', error?.message || error);
    res.status(500).send({ error: error?.message || String(error) });
  }
});

app.listen(process.env.PORT || 3010, () => console.log('KropyvnytskyiOff (KROPOE) API is ready'));

module.exports = app;
