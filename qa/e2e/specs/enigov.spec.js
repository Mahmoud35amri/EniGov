import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const accounts = JSON.parse(readFileSync(new URL('../.accounts.json', import.meta.url), 'utf8'));
const SHOTS = new URL('../../results/screens/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const run = Date.now().toString(36);

async function login(page, { email, password }, { attendSucces = true } = {}) {
  await page.goto('/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  if (attendSucces) await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

async function shot(page, name) {
  await page.waitForTimeout(600); // laisse finir les animations (framer-motion)
  await page.screenshot({ path: `${SHOTS}${name}.png` });
}

test.describe.configure({ mode: 'serial' });

test('TS-01 Connexion du délégué et affichage du tableau de bord', async ({ page }) => {
  await login(page, accounts.delegue);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  await expect(page.getByText('Nouvelle Annonce').first()).toBeVisible();
  await expect(page.getByText('Délégué ENICarthage').first()).toBeVisible();
  await shot(page, 'e2e-ts01-dashboard-delegue');
});

test('TS-02 Connexion refusée avec un mauvais mot de passe', async ({ page }) => {
  await login(page, { email: accounts.youssef.email, password: 'Mauvais2026' }, { attendSucces: false });
  await expect(page.getByText(/Mot de passe incorrect\. 4 tentative\(s\) restante\(s\)/)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await shot(page, 'e2e-ts02-login-refuse');
});

test('TS-03 Le délégué publie une annonce, visible par un étudiant', async ({ page }) => {
  const titre = `Report du DS de Réseaux ${run}`;
  await login(page, accounts.delegue);
  await page.goto('/announcements');
  await page.getByRole('button', { name: 'Nouvelle Annonce' }).click();
  await page.getByPlaceholder("Titre de l'annonce").fill(titre);
  await page.getByPlaceholder('Rédigez votre annonce...').fill('Le DS de Réseaux est reporté au lundi 16 novembre, 9h, Amphi B.');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText(titre)).toBeVisible();
  await shot(page, 'e2e-ts03-annonce-delegue');

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await login(page, accounts.amira);
  await page.goto('/announcements');
  await expect(page.getByText(titre)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nouvelle Annonce' })).toHaveCount(0);
  await shot(page, 'e2e-ts03-annonce-etudiant');
});

test('TS-04 Parcours réclamation : création par l’étudiant, traitement par le délégué', async ({ page }) => {
  const titre = `Climatisation en panne salle B12 ${run}`;
  await login(page, accounts.amira);
  await page.goto('/complaints');
  await page.getByRole('button', { name: 'Nouvelle Réclamation' }).first().click();
  await page.getByPlaceholder('Décrivez brièvement le problème').fill(titre);
  await page.getByPlaceholder('Donnez tous les détails...').fill('La climatisation de la salle B12 ne fonctionne plus depuis une semaine.');
  await page.getByRole('button', { name: 'Soumettre' }).click();
  const carteEtu = page.locator('div', { hasText: titre }).filter({ hasText: 'En attente' }).last();
  await expect(carteEtu).toBeVisible();
  await shot(page, 'e2e-ts04-reclamation-creee');

  await page.evaluate(() => localStorage.clear());
  await login(page, accounts.delegue);
  await page.goto('/complaints');
  const carteDel = page.locator('div', { hasText: titre }).filter({ has: page.getByRole('button', { name: 'Répondre' }) }).last();
  await carteDel.getByRole('button', { name: 'Répondre' }).click();
  await page.locator('select').filter({ hasText: 'Statut...' }).selectOption('RESOLVED');
  await page.getByPlaceholder('Votre réponse...').fill('Technicien intervenu, climatisation réparée.');
  await shot(page, 'e2e-ts04-delegue-repond');
  await page.locator('button:has(svg.lucide-send)').click();
  await expect(page.locator('div', { hasText: titre }).filter({ hasText: 'Résolue' }).last()).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await login(page, accounts.amira);
  await page.goto('/complaints');
  const carteFinale = page.locator('div', { hasText: titre }).filter({ hasText: 'Résolue' }).last();
  await expect(carteFinale).toBeVisible();
  await expect(page.getByText('Technicien intervenu, climatisation réparée.')).toBeVisible();
  await shot(page, 'e2e-ts04-etudiant-resolue');
});

test('TS-05 Sondage : création par le délégué et vote d’un étudiant', async ({ page }) => {
  const question = `Faut-il décaler les examens de janvier ? ${run}`;
  await login(page, accounts.delegue);
  await page.goto('/polls');
  await page.getByRole('button', { name: 'Nouveau Sondage' }).first().click();
  await page.getByPlaceholder('ex: Faut-il décaler les examens ?').fill(question);
  await page.getByPlaceholder('Option 1').fill('Oui, d’une semaine');
  await page.getByPlaceholder('Option 2').fill('Non, garder le calendrier');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByText(question)).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await login(page, accounts.youssef);
  await page.goto('/polls');
  const carte = page.locator('div', { hasText: question }).filter({ hasText: 'Non, garder le calendrier' }).last();
  await carte.getByText('Oui, d’une semaine').click();
  await expect(carte.getByText('100%').first()).toBeVisible();
  await shot(page, 'e2e-ts05-vote-etudiant');
});

test('TS-06 Contrôle d’accès : un étudiant ne peut pas ouvrir la page Étudiants', async ({ page }) => {
  await login(page, accounts.youssef);
  await expect(page.getByText('Youssef Trabelsi').first()).toBeVisible();
  await page.goto('/students');
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByRole('link', { name: 'Étudiants' })).toHaveCount(0);
  await shot(page, 'e2e-ts06-acces-etudiant');
});

test('TS-07 @mobile Affichage responsive sur smartphone (Pixel 7)', async ({ page }) => {
  await page.goto('/login');
  await shot(page, 'e2e-ts07-mobile-login');
  await login(page, accounts.amira);
  await expect(page).toHaveURL('http://localhost:5173/');
  await expect(page.getByText(/Amira/).first()).toBeAttached();
  await page.waitForLoadState('networkidle');
  await shot(page, 'e2e-ts07-mobile-accueil');
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(debordement, 'aucun défilement horizontal (largeur en trop, px)').toBeLessThanOrEqual(0);
});
