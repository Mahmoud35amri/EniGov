# QA — Tests d'EniGov

Tests système, d'acceptation et de charge, référentiel Squash TM et génération du compte rendu.
Les tests unitaires et d'intégration sont dans `backend/src/test/`. Le détail des modifications est dans [`../CHANGELOG.md`](../CHANGELOG.md).

## Prérequis

- JDK 17+, Maven, Node.js 18+ (22 recommandé pour `Object.groupBy`), Docker Desktop
- `backend/.env` : comme `backend/.env.example`, avec `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/enigov` et `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (valeurs factices acceptées hors upload de fichiers)
- `frontend/.env` : `VITE_API_URL=http://localhost:8081/api`

## 1. Infrastructure Docker

```bash
docker run -d --name enigov-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=enigov -p 5433:5432 postgres:16
docker exec enigov-postgres psql -U postgres -c "CREATE DATABASE enigov_test;" -c "CREATE DATABASE squashtm;"
docker network create qa-net && docker network connect qa-net enigov-postgres

# Squash TM (http://localhost:8090/squash, admin / admin)
docker run -d --name squash-tm --network qa-net -p 8090:8080 \
  -e SQTM_DB_TYPE=postgresql -e SQTM_DB_HOST=enigov-postgres -e SQTM_DB_NAME=squashtm \
  -e SQTM_DB_USERNAME=postgres -e SQTM_DB_PASSWORD=postgres \
  -e SQUASH_RESTAPI_DISALLOWBASICAUTHENTICATION=false squashtest/squash
```

## 2. Application

```bash
cd backend  && mvn spring-boot:run          # http://localhost:8081
cd frontend && npm install && npm run dev    # http://localhost:5173
```

## 3. Lancer les tests

| Tests | Commande | Dossier |
|-------|----------|---------|
| Unitaires + intégration + couverture JaCoCo | `mvn test` → `target/site/jacoco/index.html` | `backend/` |
| Analyse statique Java | `mvn pmd:pmd pmd:cpd` | `backend/` |
| Analyse statique JavaScript | `npx eslint . --ext js,jsx` | `frontend/` |
| Dépendances vulnérables | `npm audit --workspace=frontend` | racine |
| Installation des outils QA | `npm install && npx playwright install chromium` | `qa/` |
| Système (E2E) | `npx playwright test -c e2e/playwright.config.js` | `qa/` |
| Acceptation (preuves pas à pas) | `node acceptance/run-acceptance.mjs` (après les E2E, qui créent les comptes de test) | `qa/` |
| Charge | `docker run --rm -v ./perf:/scripts grafana/k6 run /scripts/charge-api.js` | `qa/` |
| Alimenter Squash TM (projet vide) | `node squash/seed.mjs` | `qa/` |
| Régénérer le compte rendu PDF | `node report/build-report.mjs` | `qa/` |

Résultats attendus : JUnit 52 tests (51 réussis, 1 ignoré — ANO-03), E2E 6/7 (TS-07 en échec — ANO-05), acceptation 14/14 étapes, k6 seuils respectés.

## Structure

```
qa/
├── e2e/            tests Playwright (global-setup crée 2 étudiants de test et valide leur e-mail en base)
├── acceptance/     exécution assistée des fiches d'acceptation TA-01 à TA-05
├── perf/           scénario k6
├── squash/         referentiel.mjs (exigences, cas, campagne, anomalies) + seed + captures
├── report/         générateur du compte rendu + PDF
└── results/        sorties brutes, rapports et captures d'écran (preuves)
```
