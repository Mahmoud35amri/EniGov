// Test de charge (ENF-03 / ENF-04) : 20 utilisateurs simultanés consultent les principales pages.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API || 'http://host.docker.internal:8081/api';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // montée en charge
    { duration: '40s', target: 20 }, // palier
    { duration: '10s', target: 0 },  // descente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // ENF-03 : 95 % des réponses en moins de 500 ms
    http_req_failed: ['rate<0.01'],   // ENF-04 : moins de 1 % d'erreurs
  },
};

export function setup() {
  const res = http.post(`${API}/auth/signin`, JSON.stringify({ email: 'delegue@enicar.ucar.tn', password: 'Delegue2026' }),
    { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'connexion OK': (r) => r.status === 200 });
  return { token: res.json('token') };
}

export default function ({ token }) {
  const params = { headers: { Authorization: `Bearer ${token}` } };
  for (const path of ['/announcements', '/events', '/polls', '/complaints', '/stats']) {
    const res = http.get(`${API}${path}`, { ...params, tags: { endpoint: path } });
    check(res, { [`GET ${path} = 200`]: (r) => r.status === 200 });
  }
  sleep(1);
}
