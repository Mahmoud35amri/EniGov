import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const API = 'http://localhost:8081/api';
export const ACCOUNTS_FILE = new URL('./.accounts.json', import.meta.url);

// Crée 2 étudiants de test et valide leur e-mail directement en base (l'envoi d'e-mail n'est pas configuré en local)
export default async function globalSetup() {
  const run = Date.now().toString(36);
  const students = [
    { fullName: 'Amira Ben Salah', email: `e2e.amira.${run}@enicar.ucar.tn` },
    { fullName: 'Youssef Trabelsi', email: `e2e.youssef.${run}@enicar.ucar.tn` },
  ].map((s) => ({ ...s, password: 'Etudiant2026', filiere: 'INFO', promotion: 'DEUXIEME_ANNEE' }));

  for (const s of students) {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (!res.ok) throw new Error(`Inscription ${s.email} : HTTP ${res.status} ${await res.text()}`);
  }

  const emails = students.map((s) => `'${s.email}'`).join(',');
  execFileSync('docker', ['exec', 'enigov-postgres', 'psql', '-U', 'postgres', '-d', 'enigov', '-c',
    `UPDATE users SET email_verified = true WHERE email IN (${emails})`], { stdio: 'pipe' });

  writeFileSync(ACCOUNTS_FILE, JSON.stringify({
    delegue: { email: 'delegue@enicar.ucar.tn', password: 'Delegue2026' },
    amira: students[0],
    youssef: students[1],
  }, null, 2));
}
