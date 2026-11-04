// Exécution pas à pas des tests d'acceptation manuels (fiches TA-xx de Squash TM).
// Chaque étape est réalisée dans le navigateur et capturée ; le résultat observé est consigné dans results/acceptance.json.
import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const SHOTS = 'results/screens/';
const accounts = JSON.parse(readFileSync('e2e/.accounts.json', 'utf8'));
const run = Date.now().toString(36);
const journal = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' });
const page = await ctx.newPage();

async function shot(name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}${name}.png` });
  return `${name}.png`;
}

async function login({ email, password }) {
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function etape(tc, numero, action, attendu, fn) {
  const entree = { tc, numero, action, attendu, statut: 'SUCCESS', capture: null, observe: '' };
  try {
    const r = await fn();
    entree.capture = r?.capture ?? null;
    entree.observe = r?.observe ?? 'Conforme au résultat attendu';
  } catch (e) {
    entree.statut = 'FAILURE';
    entree.observe = e.message.split('\n')[0];
    entree.capture = await shot(`ta-${tc}-${numero}-echec`).catch(() => null);
  }
  journal.push(entree);
  console.log(`${entree.statut === 'SUCCESS' ? '✓' : '✗'} ${tc} étape ${numero} : ${action}`);
}

// ---------- TA-01 Inscription d'un nouvel étudiant ----------
const sarra = { email: `sarra.mejri.${run}@enicar.ucar.tn`, password: 'Etudiant2026' };
await etape('TA-01', 1, 'Ouvrir /register et s’inscrire avec une adresse @gmail.com',
  'Inscription refusée : seuls les e-mails @enicar.ucar.tn sont acceptés', async () => {
    await page.goto(`${BASE}/register`);
    await page.getByPlaceholder('Votre nom complet').fill('Sarra Mejri');
    await page.getByPlaceholder('prenom.nom@enicar.ucar.tn').fill('sarra.mejri@gmail.com');
    await page.locator('input[placeholder="••••••••"]').first().fill(sarra.password);
    await page.getByRole('button', { name: /Informatique/ }).first().click();
    await page.getByRole('button', { name: /^2A/ }).click();
    await page.getByRole('button', { name: /S'inscrire/ }).click();
    await expect(page.getByText(/enicar\.ucar\.tn/).last()).toBeVisible();
    return { capture: await shot('ta01-1-domaine-refuse') };
  });
await etape('TA-01', 2, 'Saisir une adresse valide avec un mot de passe faible « motdepasse »',
  'Indicateur « Faible — min. 8 caractères, 1 majuscule, 1 chiffre » et bouton S’inscrire désactivé', async () => {
    await page.getByPlaceholder('prenom.nom@enicar.ucar.tn').fill(sarra.email);
    await page.locator('input[placeholder="••••••••"]').first().fill('motdepasse');
    await expect(page.getByText(/Faible.*majuscule/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /S'inscrire/ })).toBeDisabled();
    return { capture: await shot('ta01-2-mdp-faible') };
  });
await etape('TA-01', 3, 'Saisir le mot de passe « Etudiant2026 » et valider',
  'Message « Vérifiez votre email ! » affiché', async () => {
    await page.locator('input[placeholder="••••••••"]').first().fill(sarra.password);
    await page.getByRole('button', { name: /S'inscrire/ }).click();
    await expect(page.getByText('Vérifiez votre email !')).toBeVisible();
    return { capture: await shot('ta01-3-inscription-ok') };
  });
await etape('TA-01', 4, 'Tenter de se connecter avant d’avoir cliqué sur le lien de vérification',
  'Connexion refusée : e-mail non vérifié', async () => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type=email]', sarra.email);
    await page.fill('input[type=password]', sarra.password);
    await page.click('button[type=submit]');
    await expect(page.getByText(/pas encore vérifié/)).toBeVisible();
    return { capture: await shot('ta01-4-email-non-verifie') };
  });

// ---------- TA-02 Réclamation publique et vote ----------
const titrePublique = `Wi-Fi instable au bloc B ${run}`;
await etape('TA-02', 1, 'Amira crée une réclamation PUBLIQUE « Wi-Fi instable au bloc B »',
  'Réclamation créée, statut « En attente », badge « Publique »', async () => {
    await login(accounts.amira);
    await page.goto(`${BASE}/complaints`);
    await page.getByRole('button', { name: 'Nouvelle Réclamation' }).first().click();
    await page.getByPlaceholder('Décrivez brièvement le problème').fill(titrePublique);
    await page.getByPlaceholder('Donnez tous les détails...').fill('Le Wi-Fi coupe toutes les 10 minutes dans les salles du bloc B.');
    await page.locator('form button', { hasText: 'Publique' }).click();
    await page.getByRole('button', { name: 'Soumettre' }).click();
    await expect(page.locator('div', { hasText: titrePublique }).filter({ hasText: 'En attente' }).last()).toBeVisible();
    return { capture: await shot('ta02-1-reclamation-publique') };
  });
const carteVote = () => page.locator('div', { hasText: titrePublique }).filter({ has: page.locator('svg.lucide-thumbs-up') }).last();
await etape('TA-02', 2, 'Youssef ouvre l’onglet « Publiques » et vote pour (pouce levé)',
  'La réclamation est visible avec le nom de l’auteur ; score = 1', async () => {
    await login(accounts.youssef);
    await page.goto(`${BASE}/complaints`);
    await page.getByRole('button', { name: 'Publiques' }).click();
    await expect(carteVote().getByText('Amira Ben Salah')).toBeVisible();
    await carteVote().locator('button:has(svg.lucide-thumbs-up)').click();
    await expect(carteVote().getByText('1', { exact: true })).toBeVisible();
    return { capture: await shot('ta02-2-vote-pour') };
  });
await etape('TA-02', 3, 'Youssef clique à nouveau sur le pouce levé',
  'Le vote est annulé (bascule) ; score = 0', async () => {
    await carteVote().locator('button:has(svg.lucide-thumbs-up)').click();
    await expect(carteVote().getByText('0', { exact: true })).toBeVisible();
    return { capture: await shot('ta02-3-vote-annule') };
  });

// ---------- TA-03 Messagerie étudiant -> délégué ----------
const message = `Bonjour, peut-on avoir les notes du DS avant vendredi ? (${run})`;
await etape('TA-03', 1, 'Youssef ouvre Messagerie et clique sur « Nouveau message »',
  'La liste de contacts ne propose que le délégué (pas les autres étudiants)', async () => {
    await page.goto(`${BASE}/messaging`);
    await page.locator('button[title="Nouveau message"]').click();
    await expect(page.getByText('Délégué ENICarthage').first()).toBeVisible();
    await expect(page.getByText('Amira Ben Salah')).toHaveCount(0);
    return { capture: await shot('ta03-1-contacts') };
  });
await etape('TA-03', 2, 'Sélectionner le délégué, écrire un message et l’envoyer',
  'Le message apparaît dans la conversation', async () => {
    await page.getByText('Délégué ENICarthage').first().click();
    await page.getByPlaceholder('Écrivez votre message...').fill(message);
    await page.getByPlaceholder('Écrivez votre message...').press('Enter');
    await expect(page.getByText(message).last()).toBeVisible();
    return { capture: await shot('ta03-2-message-envoye') };
  });
await etape('TA-03', 3, 'Le délégué se connecte et ouvre la conversation',
  'Badge de notification sur la cloche ; message reçu de Youssef', async () => {
    await login(accounts.delegue);
    await page.locator('header button:has(svg.lucide-bell)').click();
    await expect(page.getByText(/Nouveau message de Youssef Trabelsi/).first()).toBeVisible();
    await shot('ta03-3a-notification');
    await page.goto(`${BASE}/messaging`);
    await page.getByText('Youssef Trabelsi').first().click();
    await expect(page.getByText(message).last()).toBeVisible();
    return { capture: await shot('ta03-3-message-recu') };
  });

// ---------- TA-04 Calendrier des événements ----------
const evt = `Forum des clubs ${run}`;
await etape('TA-04', 1, 'Le délégué crée l’événement « Forum des clubs » (15/12/2026 10:00, Hall principal)',
  'L’événement apparaît dans la liste', async () => {
    await page.goto(`${BASE}/events`);
    await page.getByRole('button', { name: /Nouvel/ }).first().click();
    await page.getByPlaceholder("Nom de l'événement").fill(evt);
    await page.getByPlaceholder('Détails...').fill('Présentation des clubs de l’ENICarthage.');
    await page.locator('input[type=datetime-local]').first().fill('2026-12-15T10:00');
    await page.getByPlaceholder('ex: Amphi A, Hall, etc.').fill('Hall principal');
    await page.locator('form button[type=submit]').click();
    await page.locator('button:has(svg.lucide-list)').click(); // vue liste (le calendrier affiche le mois courant)
    await expect(page.getByText(evt).first()).toBeVisible();
    return { capture: await shot('ta04-1-evenement-cree') };
  });
await etape('TA-04', 2, 'Amira consulte la page Événements',
  'L’événement est visible ; aucun bouton de création pour l’étudiant', async () => {
    await login(accounts.amira);
    await page.goto(`${BASE}/events`);
    await page.locator('button:has(svg.lucide-list)').click();
    await expect(page.getByText(evt).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nouvel/ })).toHaveCount(0);
    return { capture: await shot('ta04-2-evenement-etudiant') };
  });

// ---------- TA-05 Thème clair / sombre ----------
await etape('TA-05', 1, 'Cliquer sur l’icône lune dans l’en-tête',
  'L’interface passe en thème sombre', async () => {
    await page.goto(`${BASE}/`);
    await page.locator('header button:has(svg.lucide-moon)').click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    return { capture: await shot('ta05-1-theme-sombre') };
  });
await etape('TA-05', 2, 'Recharger la page (F5)',
  'Le thème sombre est conservé', async () => {
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    const capture = await shot('ta05-2-theme-conserve');
    await page.locator('header button:has(svg.lucide-sun)').click(); // remet le thème clair
    return { capture };
  });

await browser.close();
writeFileSync('results/acceptance.json', JSON.stringify(journal, null, 2));
const ko = journal.filter((e) => e.statut !== 'SUCCESS').length;
console.log(`\n${journal.length - ko}/${journal.length} étapes conformes`);
