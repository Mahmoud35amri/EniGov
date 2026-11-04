# Journal des modifications

## [1.0.1] — 2026-11-04 — Ateliers de test logiciel

Mise en place d'une démarche de test complète (exigences, plan de test, tests manuels et automatisés, outil de gestion Squash TM) et correction de deux anomalies détectées. Le compte rendu se trouve dans `qa/report/Compte_Rendu_Tests_EniGov_Mahmoud_Amri.pdf` ; le mode d'emploi des tests dans [`qa/README.md`](qa/README.md).

### Corrigé

| Anomalie | Fichier | Modification |
|----------|---------|--------------|
| **ANO-01 (critique)** — n'importe quel étudiant pouvait lire une réclamation **privée** d'un autre étudiant via `GET /api/complaints/{id}` | `backend/src/main/java/com/unigov/service/ComplaintService.java` | `getById` vérifie désormais que la réclamation est publique, ou que l'utilisateur en est l'auteur, ou qu'il est délégué ; sinon `AccessDeniedException` → HTTP 403 |
| **ANO-02 (mineure)** — `validateJwtToken` levait une `SignatureException` au lieu de renvoyer `false` pour un jeton signé avec une autre clé | `backend/src/main/java/com/unigov/security/JwtUtils.java` | Ajout d'un `catch (io.jsonwebtoken.security.SecurityException)` |

### Ajouté — tests backend

| Fichier | Contenu |
|---------|---------|
| `backend/src/test/java/com/unigov/unit/PollServiceTest.java` | 11 tests unitaires (Mockito) : création ≥ 2 options, vote unique, sondage clôturé, date limite, index d'option (valeurs limites), pourcentages |
| `backend/src/test/java/com/unigov/unit/PollVisibilityTest.java` | Table de décision (9 cas) sur le ciblage filière / promotion des sondages |
| `backend/src/test/java/com/unigov/unit/ComplaintServiceTest.java` | 5 tests : statut initial, bascule des votes pour/contre, vote interdit sur réclamation privée, notification au changement de statut |
| `backend/src/test/java/com/unigov/unit/JwtUtilsTest.java` | 4 tests : jeton valide, signé avec une autre clé, expiré, mal formé |
| `backend/src/test/java/com/unigov/integration/IntegrationTestBase.java` | Base commune : contexte Spring complet + MockMvc + PostgreSQL de test ; `EmailService` simulé |
| `backend/src/test/java/com/unigov/integration/AuthIntegrationTest.java` | Domaine e-mail, politique de mot de passe (valeurs limites 7/8 et 40/41), doublon, vérification e-mail, verrouillage après 5 échecs, ANO-03 (désactivé) |
| `backend/src/test/java/com/unigov/integration/SecurityIntegrationTest.java` | Matrice d'autorisations (sans jeton, jeton falsifié, étudiant, délégué), messagerie étudiant → étudiant interdite |
| `backend/src/test/java/com/unigov/integration/ComplaintPollIntegrationTest.java` | Confidentialité des réclamations (ANO-01), vote public, notification de statut, vote unique aux sondages |
| `backend/src/test/resources/application-test.properties` | Profil `test` : base `enigov_test` (PostgreSQL Docker, port 5433) recréée à chaque exécution, secrets factices |

Résultat : **52 tests — 51 réussis, 1 ignoré** (TI-09, en attente du correctif ANO-03).

### Modifié — configuration

| Fichier | Modification | Raison |
|---------|--------------|--------|
| `backend/pom.xml` | Plugin **JaCoCo 0.8.14** (rapport `target/site/jacoco/` à chaque `mvn test`) | Mesure de la couverture de code (tests structurels) |
| `backend/pom.xml` | Propriété `argLine = -Dnet.bytebuddy.experimental=true` | Mockito / Byte Buddy 1.14 ne reconnaît pas officiellement le JDK 25 ; à retirer après une mise à jour de Spring Boot (≥ 3.5) |
| `backend/src/test/java/com/unigov/UniGovApplicationTests.java` | `@ActiveProfiles("test")` | Le test existant utilise la base de test au lieu de la base de développement |
| `frontend/.eslintrc.cjs` (nouveau) | Configuration ESLint (React, hooks, react-refresh) | Le script `npm run lint` existait mais ESLint n'était ni installé ni configuré |
| `frontend/package.json`, `package-lock.json` | `eslint@8`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` en devDependencies | Idem |

### Ajouté — dossier `qa/` (tests système, acceptation, charge, Squash TM, compte rendu)

| Chemin | Contenu |
|--------|---------|
| `qa/e2e/` | Tests système **Playwright** TS-01 à TS-07 (connexion, annonces, parcours réclamation, sondage, contrôle d'accès, affichage mobile) |
| `qa/acceptance/run-acceptance.mjs` | Exécution pas à pas des fiches d'acceptation TA-01 à TA-05 avec capture de chaque étape |
| `qa/perf/charge-api.js` | Test de charge **k6** : 20 utilisateurs, seuils p(95) < 500 ms et erreurs < 1 % |
| `qa/squash/referentiel.mjs` | Référentiel unique : 27 exigences, 33 cas de test, campagne en 2 itérations, 8 anomalies |
| `qa/squash/seed.mjs`, `qa/squash/capture.mjs` | Alimentation de **Squash TM** par son API REST ; captures d'écran de Squash |
| `qa/report/` | Générateur du compte rendu (HTML → PDF) et le PDF final |
| `qa/results/` | Preuves : sorties des exécutions, rapports Surefire / Playwright, résultats k6, ESLint, npm audit, captures d'écran |

### Anomalies connues (non corrigées)

| Réf. | Gravité | Description | Correctif proposé |
|------|---------|-------------|-------------------|
| ANO-03 | Majeure | Le compteur d'échecs de connexion n'est jamais remis à zéro après expiration du verrouillage : un seul échec reverrouille le compte 15 min | Remettre `failedLoginAttempts` à 0 quand `lockoutUntil` est dépassé (`AuthController`) puis réactiver le test `compteurRemisAZeroApresExpiration` |
| ANO-04 | Majeure | `DatabaseSeeder` exécute `eventRepository.deleteAll()` à chaque démarrage : les événements créés par le délégué sont perdus | `if (eventRepository.count() == 0) seedEvents();` |
| ANO-05 | Majeure | Sur mobile, la barre latérale n'est pas repliable (débordement horizontal de 107 px sur Pixel 7) | Menu « burger » sous le point de rupture `md` |
| ANO-06 | Majeure | `npm audit` : 29 vulnérabilités (15 hautes), dont axios et react-router | `npm audit fix` puis mise à jour d'axios et react-router |
| ANO-07 | Mineure | 55 erreurs ESLint, 10 violations PMD, 8 blocs dupliqués | Nettoyage + lint bloquant en intégration continue |
| ANO-08 | Mineure | Variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` obligatoires mais non documentées (le backend ne démarre pas sans elles) ; README annonce le port 5174 au lieu de 5173 | Documenter dans le README et `backend/.env.example` |
