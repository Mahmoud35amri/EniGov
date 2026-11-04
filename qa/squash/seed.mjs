// Alimente Squash TM (API REST) avec le référentiel EniGov : projet, exigences, cas de test,
// liens de couverture, campagne, itérations et résultats d'exécution.
import { readFileSync } from 'node:fs';
import { exigences, dossiers, casDeTest, iterations } from './referentiel.mjs';

const BASE = process.env.SQUASH_URL || 'http://localhost:8090/squash/api/rest/latest';
const AUTH = 'Basic ' + Buffer.from(process.env.SQUASH_AUTH || 'admin:admin').toString('base64');
const PROJET = 'EniGov';

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

const html = (s) => `<p>${s}</p>`;
const etapesManuelles = Object.groupBy(JSON.parse(readFileSync('results/acceptance.json', 'utf8')), (e) => e.tc);

const existant = (await api('GET', '/projects?size=100'))._embedded?.projects?.find((p) => p.name === PROJET);
if (existant) throw new Error(`Le projet ${PROJET} existe déjà (id ${existant.id}) : supprimez-le avant de relancer.`);

const projet = await api('POST', '/projects', {
  _type: 'project', name: PROJET, label: 'Plateforme du délégué étudiant — ENICarthage',
  description: html('Projet de recette de la plateforme EniGov (Spring Boot + React). Atelier de test logiciel — Mahmoud Amri.'),
});
console.log(`Projet ${PROJET} créé (id ${projet.id})`);

// ---- Exigences ----
const dossierReq = {};
for (const nom of ['Exigences fonctionnelles', 'Exigences non fonctionnelles']) {
  dossierReq[nom] = (await api('POST', '/requirement-folders', { _type: 'requirement-folder', name: nom, parent: { _type: 'project', id: projet.id } })).id;
}
const idExigence = {};
for (const e of exigences) {
  const dossier = e.ref.startsWith('ENF') ? 'Exigences non fonctionnelles' : 'Exigences fonctionnelles';
  const r = await api('POST', '/requirements', {
    _type: 'requirement',
    current_version: {
      _type: 'requirement-version', name: e.nom, reference: e.ref, criticality: e.criticite,
      category: { code: e.categorie }, status: 'WORK_IN_PROGRESS', description: html(e.description),
    },
    parent: { _type: 'requirement-folder', id: dossierReq[dossier] },
  });
  idExigence[e.ref] = r.id;
}
console.log(`${exigences.length} exigences créées`);

// ---- Cas de test ----
const idDossierTc = [];
for (const nom of dossiers) {
  idDossierTc.push((await api('POST', '/test-case-folders', { _type: 'test-case-folder', name: nom, parent: { _type: 'project', id: projet.id } })).id);
}
const idCas = {};
for (const c of casDeTest) {
  const etapes = c.etapes ?? etapesManuelles[c.ref].map((e) => [e.action, e.attendu]);
  const tc = await api('POST', '/test-cases', {
    _type: 'test-case', name: c.nom, reference: c.ref,
    parent: { _type: 'test-case-folder', id: idDossierTc[c.dossier] },
    importance: c.importance, status: 'APPROVED',
    nature: { code: c.nature }, type: { code: c.type },
    prerequisite: html(c.prerequis ?? 'Environnement de test démarré (PostgreSQL :5433, backend :8081, frontend :5173)'),
    description: html(`<strong>Mode :</strong> ${c.mode}<br><strong>Technique :</strong> ${c.technique}${c.script ? `<br><strong>Script :</strong> <code>${c.script}</code>` : ''}`),
    steps: etapes.map(([action, attendu]) => ({ _type: 'action-step', action: html(action), expected_result: html(attendu) })),
  });
  idCas[c.ref] = tc.id;
  await api('POST', `/test-cases/${tc.id}/coverages/${c.exigences.map((r) => idExigence[r]).join(',')}`);
}
console.log(`${casDeTest.length} cas de test créés et liés aux exigences`);

// Les exigences passent au statut « Approuvée » une fois la couverture établie
for (const ref of Object.keys(idExigence)) {
  for (const status of ['UNDER_REVIEW', 'APPROVED']) {
    await api('PATCH', `/requirements/${idExigence[ref]}`, { _type: 'requirement', current_version: { _type: 'requirement-version', status } });
  }
}

// ---- Campagne, itérations, exécutions ----
const campagne = await api('POST', '/campaigns', {
  _type: 'campaign', name: 'Campagne de recette EniGov v1.0', reference: 'CR-V1', status: 'FINISHED',
  description: html('Recette complète : tests unitaires, intégration, système, acceptation, non fonctionnels, re-test et non-régression.'),
  scheduled_start_date: '2026-11-04T08:00:00.000Z', scheduled_end_date: '2026-11-05T18:00:00.000Z',
  parent: { _type: 'project', id: projet.id },
});
for (const it of iterations) {
  const iteration = await api('POST', `/campaigns/${campagne.id}/iterations`, {
    _type: 'iteration', name: it.nom, description: html(it.description), status: 'FINISHED', parent: { _type: 'campaign', id: campagne.id },
  });
  for (const [ref, [statut, commentaire]] of Object.entries(it.resultats)) {
    const item = await api('POST', `/iterations/${iteration.id}/test-plan`, { _type: 'test-plan-item', test_case: { _type: 'test-case', id: idCas[ref] } });
    const exe = await api('POST', `/test-plan-items/${item.id}/executions`);
    const steps = (await api('GET', `/executions/${exe.id}/execution-steps`))._embedded?.['execution-steps'] ?? [];
    for (const [i, s] of steps.entries()) {
      // En échec, seule la dernière étape porte l'échec ; bloqué : toutes les étapes sont bloquées
      const st = statut === 'SUCCESS' ? 'Success' : statut === 'BLOCKED' ? 'Blocked' : i === steps.length - 1 ? 'Failure' : 'Success';
      await api('PATCH', `/execution-steps/${s.id}/execution-status/${st}`);
    }
    await api('PATCH', `/executions/${exe.id}`, { _type: 'execution', execution_status: statut, comment: html(commentaire || 'Conforme au résultat attendu') });
  }
  console.log(`${it.nom} : ${Object.keys(it.resultats).length} exécutions enregistrées`);
}
console.log('Terminé.');
