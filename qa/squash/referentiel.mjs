// Référentiel de test EniGov : exigences, cas de test, campagne et anomalies.
// Source unique utilisée pour alimenter Squash TM (seed.mjs) et pour générer le compte rendu.

export const exigences = [
  // ---- Exigences fonctionnelles ----
  ['EF-01', 'Inscription des étudiants', 'CAT_FUNCTIONAL', 'CRITICAL', "Un étudiant s'inscrit avec un e-mail @enicar.ucar.tn unique, son nom, sa filière et sa promotion. Le mot de passe contient 8 à 40 caractères, dont au moins une majuscule et un chiffre."],
  ['EF-02', "Vérification de l'adresse e-mail", 'CAT_FUNCTIONAL', 'MAJOR', "Un compte n'est utilisable qu'après le clic sur le lien de vérification reçu par e-mail ; avant cela, la connexion est refusée."],
  ['EF-03', 'Connexion sécurisée et verrouillage du compte', 'CAT_SECURITY', 'CRITICAL', 'Connexion par e-mail et mot de passe délivrant un jeton JWT. Après 5 échecs consécutifs, le compte est verrouillé pendant 15 minutes.'],
  ['EF-04', 'Mot de passe oublié', 'CAT_FUNCTIONAL', 'MINOR', 'Réinitialisation du mot de passe via un lien envoyé par e-mail, valable 15 minutes.'],
  ['EF-05', 'Dépôt de réclamations', 'CAT_FUNCTIONAL', 'CRITICAL', "L'étudiant dépose une réclamation (titre, description, pièce jointe optionnelle), privée ou publique. Le statut initial est « En attente »."],
  ['EF-06', 'Confidentialité des réclamations privées', 'CAT_SECURITY', 'CRITICAL', "Une réclamation privée n'est visible que par l'étudiant qui l'a créée et par le délégué."],
  ['EF-07', 'Vote sur les réclamations publiques', 'CAT_FUNCTIONAL', 'MAJOR', 'Les étudiants votent pour ou contre une réclamation publique (bascule, un seul vote par étudiant). Score = pour − contre. Vote impossible sur une réclamation privée.'],
  ['EF-08', 'Traitement des réclamations par le délégué', 'CAT_FUNCTIONAL', 'CRITICAL', "Le délégué change le statut (En cours, Résolue, Rejetée) et répond ; l'étudiant concerné est notifié."],
  ['EF-09', 'Publication des annonces', 'CAT_FUNCTIONAL', 'MAJOR', 'Le délégué publie des annonces (titre, contenu, pièce jointe) ; les étudiants les consultent en lecture seule.'],
  ['EF-10', 'Création et ciblage des sondages', 'CAT_FUNCTIONAL', 'MAJOR', 'Le délégué crée un sondage (au moins 2 options, date limite optionnelle, ciblage par filière et promotion) et peut le clôturer.'],
  ['EF-11', 'Vote aux sondages', 'CAT_FUNCTIONAL', 'CRITICAL', "Un étudiant vote une seule fois, sans modification possible, tant que le sondage est ouvert et avant la date limite. Les résultats s'affichent en pourcentages."],
  ['EF-12', 'Décisions', 'CAT_FUNCTIONAL', 'MINOR', 'Le délégué publie des décisions liées à une réclamation ou à un sondage.'],
  ['EF-13', 'Messagerie étudiant ↔ délégué', 'CAT_FUNCTIONAL', 'MAJOR', "Un étudiant ne peut écrire qu'au délégué ; le délégué peut écrire à tout étudiant. Statut lu / non lu."],
  ['EF-14', 'Calendrier des événements', 'CAT_FUNCTIONAL', 'MINOR', 'Le délégué crée et supprime des événements ; les étudiants consultent le calendrier.'],
  ['EF-15', 'Règlements et documents', 'CAT_FUNCTIONAL', 'MINOR', 'Le délégué dépose des PDF ; les étudiants les consultent et les téléchargent.'],
  ['EF-16', 'Notifications in-app', 'CAT_FUNCTIONAL', 'MAJOR', 'Cloche avec compteur de notifications non lues, déclenchées par : annonce, changement de statut de réclamation, sondage, décision, message, événement.'],
  ['EF-17', 'Tableau de bord du délégué', 'CAT_FUNCTIONAL', 'MINOR', 'Statistiques agrégées (étudiants, réclamations par statut, sondages, annonces…) réservées au délégué.'],
  ['EF-18', 'Rôles et contrôle d’accès', 'CAT_SECURITY', 'CRITICAL', 'Deux rôles : DÉLÉGUÉ et ÉTUDIANT. Les fonctions de gestion (publication, traitement, statistiques, liste des étudiants) sont réservées au délégué.'],
  // ---- Exigences non fonctionnelles ----
  ['ENF-01', 'Sécurité des identifiants et des jetons', 'CAT_SECURITY', 'CRITICAL', 'Mots de passe hachés avec BCrypt ; API sans état authentifiée par JWT signé (HS256). Un jeton falsifié ou expiré est rejeté.'],
  ['ENF-02', "Protection de l'API", 'CAT_SECURITY', 'CRITICAL', 'Toute requête non authentifiée ou non autorisée est refusée (HTTP 401/403), sans erreur serveur (500).'],
  ['ENF-03', 'Performance', 'CAT_PERFORMANCE', 'MAJOR', '95 % des requêtes de consultation répondent en moins de 500 ms avec 20 utilisateurs simultanés.'],
  ['ENF-04', 'Fiabilité sous charge', 'CAT_PERFORMANCE', 'MAJOR', "Taux d'erreur inférieur à 1 % sous la charge nominale (20 utilisateurs)."],
  ['ENF-05', 'Ergonomie et affichage responsive', 'CAT_ERGONOMIC', 'MAJOR', 'Interface utilisable sur smartphone (largeur ≥ 360 px) sans défilement horizontal ; thème clair/sombre mémorisé.'],
  ['ENF-06', 'Maintenabilité', 'CAT_TECHNICAL', 'MINOR', 'Code analysé statiquement (PMD, CPD, ESLint) ; couverture des tests automatisés ≥ 40 % des instructions du backend.'],
  ['ENF-07', 'Portabilité', 'CAT_TECHNICAL', 'MINOR', 'Fonctionne sur JDK 17+ et Node.js 18+ ; déployable par conteneur (Dockerfile, Render, Vercel).'],
  ['ENF-08', 'Sécurité des dépendances', 'CAT_SECURITY', 'MAJOR', 'Aucune dépendance présentant une vulnérabilité connue de sévérité haute ou critique.'],
  ['ENF-09', 'Intégrité et persistance des données', 'CAT_TECHNICAL', 'CRITICAL', "Les données saisies (base PostgreSQL) sont conservées après un redémarrage de l'application."],
].map(([ref, nom, categorie, criticite, description]) => ({ ref, nom, categorie, criticite, description }));

const mvn = (classe, nb) => [[`Exécuter <code>mvn test -Dtest=${classe}</code> dans <code>backend/</code>`, `${nb} test(s) exécuté(s), 0 échec, 0 erreur`]];
const pw = (id) => [[`Exécuter <code>npx playwright test -c e2e/playwright.config.js -g "${id}"</code> dans <code>qa/</code>`, 'Test au vert, captures enregistrées dans results/screens']];

export const dossiers = [
  '01 - Tests unitaires (JUnit 5 + Mockito)',
  "02 - Tests d'intégration (Spring Boot + MockMvc + PostgreSQL)",
  '03 - Tests système (E2E Playwright)',
  "04 - Tests d'acceptation (manuels)",
  '05 - Tests non fonctionnels',
  '06 - Tests liés aux changements et de maintenance',
];

export const casDeTest = [
  // ---- Unitaires ----
  { ref: 'TU-01', dossier: 0, nom: 'Règles de vote et de création d’un sondage', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-10', 'EF-11'], mode: 'Automatisé', technique: 'Partitions d’équivalence, valeurs limites (index −1, 3, 99 ; 1 et 2 options)', script: 'backend/src/test/java/com/unigov/unit/PollServiceTest.java', etapes: mvn('PollServiceTest', 11) },
  { ref: 'TU-02', dossier: 0, nom: 'Visibilité d’un sondage ciblé (table de décision)', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['EF-10'], mode: 'Automatisé', technique: 'Table de décision (9 combinaisons filière × promotion)', script: 'backend/src/test/java/com/unigov/unit/PollVisibilityTest.java', etapes: mvn('PollVisibilityTest', 9) },
  { ref: 'TU-03', dossier: 0, nom: 'Votes et changement de statut d’une réclamation', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-05', 'EF-07', 'EF-08'], mode: 'Automatisé', technique: 'Test de transitions d’états (aucun → pour → aucun, pour → contre)', script: 'backend/src/test/java/com/unigov/unit/ComplaintServiceTest.java', etapes: mvn('ComplaintServiceTest', 5) },
  { ref: 'TU-04', dossier: 0, nom: 'Validation des jetons JWT', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-03', 'ENF-01'], mode: 'Automatisé', technique: 'Partitions : jeton valide, signé avec une autre clé, expiré, mal formé', script: 'backend/src/test/java/com/unigov/unit/JwtUtilsTest.java', etapes: mvn('JwtUtilsTest', 4) },
  // ---- Intégration ----
  { ref: 'TI-01', dossier: 1, nom: 'Inscription : domaine et politique de mot de passe', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-01'], mode: 'Automatisé', technique: 'Valeurs limites (7/8 et 40/41 caractères), classes invalides (sans majuscule, sans chiffre), doublon', script: 'backend/src/test/java/com/unigov/integration/AuthIntegrationTest.java', etapes: mvn('AuthIntegrationTest#domaineRefuse+politiqueMotDePasse+emailDuplique', 8) },
  { ref: 'TI-02', dossier: 1, nom: 'Vérification d’e-mail obligatoire avant connexion', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-02'], mode: 'Automatisé', technique: 'Scénario : inscription → connexion (403) → vérification → connexion (200)', script: 'AuthIntegrationTest#verificationEmailObligatoire', etapes: mvn('AuthIntegrationTest#verificationEmailObligatoire', 1) },
  { ref: 'TI-03', dossier: 1, nom: 'Verrouillage du compte après 5 échecs', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-03'], mode: 'Automatisé', technique: 'Valeur limite : 4e échec (401) puis 5e échec (429)', script: 'AuthIntegrationTest#verrouillageApres5Echecs', etapes: mvn('AuthIntegrationTest#verrouillageApres5Echecs', 1) },
  { ref: 'TI-04', dossier: 1, nom: 'Matrice d’autorisations par rôle', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-18', 'ENF-02', 'EF-17'], mode: 'Automatisé', technique: 'Matrice rôle × ressource (sans jeton, jeton falsifié, étudiant, délégué)', script: 'backend/src/test/java/com/unigov/integration/SecurityIntegrationTest.java', etapes: mvn('SecurityIntegrationTest', 6) },
  { ref: 'TI-05', dossier: 1, nom: 'Confidentialité d’une réclamation privée (accès par identifiant)', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-06'], mode: 'Automatisé', technique: 'Test négatif : un autre étudiant demande GET /api/complaints/{id}', script: 'ComplaintPollIntegrationTest#priveeInaccessibleParId', etapes: mvn('ComplaintPollIntegrationTest#priveeInaccessibleParId', 1) },
  { ref: 'TI-06', dossier: 1, nom: 'Traitement d’une réclamation et notification de l’étudiant', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-08', 'EF-16'], mode: 'Automatisé', technique: 'Scénario inter-modules : réclamation → statut → notification', script: 'ComplaintPollIntegrationTest#statutNotifie', etapes: mvn('ComplaintPollIntegrationTest#statutNotifie', 1) },
  { ref: 'TI-07', dossier: 1, nom: 'Vote unique à un sondage', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-11'], mode: 'Automatisé', technique: 'Scénario : création (délégué) → vote → second vote refusé', script: 'ComplaintPollIntegrationTest#sondageVoteUnique', etapes: mvn('ComplaintPollIntegrationTest#sondageVoteUnique', 1) },
  { ref: 'TI-08', dossier: 1, nom: 'Messagerie : étudiant vers étudiant interdit', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['EF-13'], mode: 'Automatisé', technique: 'Test négatif', script: 'SecurityIntegrationTest#messagerieEtudiantVersEtudiantInterdite', etapes: mvn('SecurityIntegrationTest#messagerieEtudiantVersEtudiantInterdite', 1) },
  { ref: 'TI-09', dossier: 1, nom: 'Remise à zéro du compteur après expiration du verrouillage', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-03'], mode: 'Automatisé', technique: 'Test de transition d’état (verrouillé → expiré → 1 échec)', script: 'AuthIntegrationTest#compteurRemisAZeroApresExpiration', etapes: mvn('AuthIntegrationTest#compteurRemisAZeroApresExpiration', 1) },
  // ---- Système (E2E) ----
  { ref: 'TS-01', dossier: 2, nom: 'Connexion du délégué et tableau de bord', nature: 'NAT_BUSINESS_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'HIGH', exigences: ['EF-03', 'EF-17'], mode: 'Automatisé', technique: 'Cas d’utilisation (scénario nominal)', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-01') },
  { ref: 'TS-02', dossier: 2, nom: 'Connexion refusée avec un mauvais mot de passe', nature: 'NAT_BUSINESS_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'MEDIUM', exigences: ['EF-03'], mode: 'Automatisé', technique: 'Cas d’utilisation (scénario d’erreur)', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-02') },
  { ref: 'TS-03', dossier: 2, nom: 'Publication d’une annonce visible par un étudiant', nature: 'NAT_BUSINESS_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'HIGH', exigences: ['EF-09'], mode: 'Automatisé', technique: 'Cas d’utilisation multi-acteurs', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-03') },
  { ref: 'TS-04', dossier: 2, nom: 'Parcours complet d’une réclamation', nature: 'NAT_BUSINESS_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'VERY_HIGH', exigences: ['EF-05', 'EF-08'], mode: 'Automatisé', technique: 'Cycle de vie : En attente → Résolue', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-04') },
  { ref: 'TS-05', dossier: 2, nom: 'Création d’un sondage et vote d’un étudiant', nature: 'NAT_BUSINESS_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'HIGH', exigences: ['EF-10', 'EF-11'], mode: 'Automatisé', technique: 'Cas d’utilisation multi-acteurs', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-05') },
  { ref: 'TS-06', dossier: 2, nom: 'Contrôle d’accès dans l’interface (page Étudiants)', nature: 'NAT_SECURITY_TESTING', type: 'TYP_END_TO_END_TESTING', importance: 'HIGH', exigences: ['EF-18'], mode: 'Automatisé', technique: 'Test négatif', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-06') },
  { ref: 'TS-07', dossier: 2, nom: 'Affichage responsive sur smartphone (Pixel 7)', nature: 'NAT_NON_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['ENF-05'], mode: 'Automatisé', technique: 'Émulation mobile 412 × 915, mesure du débordement horizontal', script: 'qa/e2e/specs/enigov.spec.js', etapes: pw('TS-07') },
  // ---- Acceptation (manuels) : étapes reprises de results/acceptance.json ----
  { ref: 'TA-01', dossier: 3, nom: 'Inscription d’un nouvel étudiant', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['EF-01', 'EF-02'], mode: 'Manuel', technique: 'Test d’acceptation utilisateur', prerequis: 'Application démarrée ; navigateur sur http://localhost:5173' },
  { ref: 'TA-02', dossier: 3, nom: 'Réclamation publique et vote', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-05', 'EF-07'], mode: 'Manuel', technique: 'Test d’acceptation utilisateur', prerequis: 'Comptes étudiants Amira et Youssef vérifiés' },
  { ref: 'TA-03', dossier: 3, nom: 'Message au délégué et notification', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['EF-13', 'EF-16'], mode: 'Manuel', technique: 'Test d’acceptation utilisateur', prerequis: 'Comptes étudiant (Youssef) et délégué disponibles' },
  { ref: 'TA-04', dossier: 3, nom: 'Calendrier des événements', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['EF-14'], mode: 'Manuel', technique: 'Test d’acceptation utilisateur', prerequis: 'Comptes délégué et étudiant disponibles' },
  { ref: 'TA-05', dossier: 3, nom: 'Thème clair / sombre', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'LOW', exigences: ['ENF-05'], mode: 'Manuel', technique: 'Test d’utilisabilité', prerequis: 'Étudiant connecté' },
  { ref: 'TA-06', dossier: 3, nom: 'Persistance des événements après redémarrage', nature: 'NAT_USER_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'VERY_HIGH', exigences: ['ENF-09', 'EF-14'], mode: 'Manuel', technique: 'Test exploratoire guidé par la revue de code', prerequis: 'Délégué connecté (jeton JWT) ; accès au terminal du backend',
    etapes: [
      ['Le délégué crée l’événement « Reunion TEST-ANO04 » (POST /api/events)', 'HTTP 200, l’événement est renvoyé avec son identifiant'],
      ['Lister les événements (GET /api/events)', 'L’événement apparaît (1 occurrence ; 12 événements au total)'],
      ['Redémarrer le backend (mvn spring-boot:run)', 'L’application redémarre sans erreur'],
      ['Lister à nouveau les événements', 'L’événement créé est toujours présent'],
    ] },
  // ---- Non fonctionnels ----
  { ref: 'TNF-01', dossier: 4, nom: 'Test de charge : 20 utilisateurs simultanés (k6)', nature: 'NAT_PERFORMANCE_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['ENF-03', 'ENF-04'], mode: 'Automatisé', technique: 'Test de charge : montée 10 s, palier 40 s à 20 VU, descente 10 s ; 5 endpoints de consultation', script: 'qa/perf/charge-api.js',
    etapes: [['Exécuter <code>docker run grafana/k6 run /scripts/charge-api.js</code>', 'Seuils respectés : p(95) < 500 ms et taux d’échec < 1 %']] },
  { ref: 'TNF-02', dossier: 4, nom: 'Audit de sécurité des dépendances (npm audit)', nature: 'NAT_SECURITY_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'HIGH', exigences: ['ENF-08'], mode: 'Automatisé', technique: 'Analyse statique de composition logicielle (SCA)', script: 'npm audit --workspace=frontend',
    etapes: [['Exécuter <code>npm audit --workspace=frontend</code>', 'Aucune vulnérabilité haute ou critique']] },
  { ref: 'TNF-03', dossier: 4, nom: 'Analyse statique du code (PMD, CPD, ESLint)', nature: 'NAT_NON_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['ENF-06'], mode: 'Automatisé', technique: 'Analyse statique outillée + revue de code manuelle', script: 'mvn pmd:pmd pmd:cpd ; npx eslint .',
    etapes: [['Exécuter <code>mvn pmd:pmd pmd:cpd</code> (backend)', 'Aucune violation de priorité 1 ou 2'], ['Exécuter <code>npx eslint . --ext js,jsx</code> (frontend)', 'Aucune erreur ESLint']] },
  { ref: 'TNF-04', dossier: 4, nom: 'Couverture de code des tests automatisés (JaCoCo)', nature: 'NAT_NON_FUNCTIONAL_TESTING', type: 'TYP_COMPLIANCE_TESTING', importance: 'MEDIUM', exigences: ['ENF-06'], mode: 'Automatisé', technique: 'Test structurel (boîte blanche) : couverture des instructions et des branches', script: 'target/site/jacoco/index.html',
    etapes: [['Exécuter <code>mvn test</code> puis ouvrir target/site/jacoco/index.html', 'Couverture des instructions ≥ 40 %']] },
  // ---- Changements & maintenance ----
  { ref: 'TR-01', dossier: 5, nom: 'Re-test de confirmation des correctifs ANO-01 et ANO-02', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_CORRECTION_TESTING', importance: 'VERY_HIGH', exigences: ['EF-06', 'ENF-01'], mode: 'Automatisé', technique: 'Test de confirmation (re-test) des cas en échec TI-05 et TU-04', script: 'mvn test -Dtest=JwtUtilsTest,ComplaintPollIntegrationTest',
    etapes: [['Appliquer les correctifs (ComplaintService.getById, JwtUtils.validateJwtToken)', 'Compilation sans erreur'], ['Ré-exécuter TU-04 et TI-05', 'Les tests auparavant en échec passent']] },
  { ref: 'TR-02', dossier: 5, nom: 'Non-régression : ré-exécution de la suite automatisée complète', nature: 'NAT_FUNCTIONAL_TESTING', type: 'TYP_REGRESSION_TESTING', importance: 'VERY_HIGH', exigences: ['EF-01', 'EF-03', 'EF-05', 'EF-11', 'EF-18'], mode: 'Automatisé', technique: 'Test de régression (suite unitaire + intégration + E2E)', script: 'mvn test ; npx playwright test',
    etapes: [['Exécuter <code>mvn test</code> sur la version corrigée', 'Aucun nouvel échec par rapport à l’exécution 1'], ['Exécuter la suite E2E Playwright', 'Aucun nouvel échec fonctionnel']] },
  { ref: 'TM-01', dossier: 5, nom: 'Migration d’environnement : JDK 25 et PostgreSQL 16 (Docker)', nature: 'NAT_NON_FUNCTIONAL_TESTING', type: 'TYP_EVOLUTION_TESTING', importance: 'MEDIUM', exigences: ['ENF-07'], mode: 'Automatisé', technique: 'Test de maintenance (portage vers un nouvel environnement)', script: 'mvn test (JDK 25.0)',
    etapes: [['Compiler et exécuter les tests avec le JDK 25 (projet cible Java 17)', 'Compilation et tests réussis'], ['Démarrer l’application sur PostgreSQL 16 en conteneur Docker', 'Schéma créé par Hibernate, application opérationnelle']] },
];

export const anomalies = [
  { ref: 'ANO-01', gravite: 'Critique', statut: 'Corrigée (v1.0.1)', titre: 'Fuite de confidentialité : une réclamation privée est lisible par n’importe quel étudiant via GET /api/complaints/{id} (IDOR)', detection: 'Revue de code + TI-05', exigence: 'EF-06' },
  { ref: 'ANO-02', gravite: 'Mineure', statut: 'Corrigée (v1.0.1)', titre: 'JwtUtils.validateJwtToken lève SignatureException au lieu de renvoyer false pour un jeton signé avec une autre clé', detection: 'TU-04', exigence: 'ENF-01' },
  { ref: 'ANO-03', gravite: 'Majeure', statut: 'Ouverte', titre: 'Le compteur d’échecs n’est jamais remis à zéro après expiration du verrouillage : un seul échec reverrouille le compte 15 min', detection: 'Revue de code + TI-09', exigence: 'EF-03' },
  { ref: 'ANO-04', gravite: 'Majeure', statut: 'Ouverte', titre: 'DatabaseSeeder supprime tous les événements à chaque démarrage (eventRepository.deleteAll()) : perte des événements créés par le délégué', detection: 'Revue de code + TA-06', exigence: 'ENF-09' },
  { ref: 'ANO-05', gravite: 'Majeure', statut: 'Ouverte', titre: 'Mobile : la barre latérale n’est pas repliable, débordement horizontal de 107 px sur Pixel 7', detection: 'TS-07', exigence: 'ENF-05' },
  { ref: 'ANO-06', gravite: 'Majeure', statut: 'Ouverte', titre: '29 vulnérabilités connues dans les dépendances frontend (15 hautes, 11 modérées, 3 faibles), dont axios et react-router', detection: 'TNF-02 (npm audit)', exigence: 'ENF-08' },
  { ref: 'ANO-07', gravite: 'Mineure', statut: 'Ouverte', titre: 'Dette technique : 55 erreurs ESLint, 10 violations PMD (3 catch vides, equals sans hashCode…), 8 blocs dupliqués (CPD)', detection: 'TNF-03 (analyse statique)', exigence: 'ENF-06' },
  { ref: 'ANO-08', gravite: 'Mineure', statut: 'Ouverte', titre: 'Documentation : variables CLOUDINARY_* obligatoires non documentées (le backend ne démarre pas) ; port frontend annoncé 5174 au lieu de 5173', detection: 'Installation (revue de la documentation)', exigence: 'ENF-07' },
];

// Résultats d'exécution par itération (statuts Squash TM : SUCCESS, FAILURE, BLOCKED…)
export const iterations = [
  {
    nom: 'Itération 1 - Build initial v1.0.0',
    description: 'Exécution initiale des tests unitaires et d’intégration (52 tests JUnit) sur le code cloné.',
    resultats: {
      'TU-01': ['SUCCESS', '11/11 tests réussis'], 'TU-02': ['SUCCESS', '9/9 tests réussis'], 'TU-03': ['SUCCESS', '5/5 tests réussis'],
      'TU-04': ['FAILURE', 'jetonSigneAvecAutreCle : SignatureException non interceptée → ANO-02'],
      'TI-01': ['SUCCESS', '6 valeurs limites + domaine + doublon conformes'], 'TI-02': ['SUCCESS', '403 puis 200 après vérification'],
      'TI-03': ['SUCCESS', '4 × 401 puis 429 au 5e échec'], 'TI-04': ['SUCCESS', '6/6 contrôles d’accès conformes'],
      'TI-05': ['FAILURE', 'Attendu 403, obtenu 200 : réclamation privée lue par un autre étudiant → ANO-01'],
      'TI-06': ['SUCCESS', 'Statut RESOLVED + notification COMPLAINT_STATUS_CHANGED'], 'TI-07': ['SUCCESS', 'Second vote refusé (400)'],
      'TI-08': ['SUCCESS', 'Message étudiant → étudiant refusé (400)'],
      'TI-09': ['FAILURE', 'Attendu 401, obtenu 429 : compte reverrouillé dès le 1er échec → ANO-03'],
    },
  },
  {
    nom: 'Itération 2 - Build corrigé v1.0.1',
    description: 'Re-test des correctifs, non-régression, tests système, acceptation, non fonctionnels et maintenance.',
    resultats: {
      'TU-04': ['SUCCESS', 'Re-test après correctif ANO-02 : 4/4'], 'TI-05': ['SUCCESS', 'Re-test après correctif ANO-01 : 403 pour un autre étudiant, 200 pour l’auteur et le délégué'],
      'TI-09': ['BLOCKED', 'ANO-03 ouverte : test désactivé (@Disabled) en attendant le correctif'],
      'TR-01': ['SUCCESS', 'TU-04 et TI-05 passent après correctifs'], 'TR-02': ['SUCCESS', '52 tests : 51 réussis, 1 ignoré (TI-09) ; E2E : 6/7, seul échec = ANO-05 déjà connue'],
      'TS-01': ['SUCCESS', ''], 'TS-02': ['SUCCESS', ''], 'TS-03': ['SUCCESS', ''], 'TS-04': ['SUCCESS', ''], 'TS-05': ['SUCCESS', ''], 'TS-06': ['SUCCESS', ''],
      'TS-07': ['FAILURE', 'Débordement horizontal de 107 px : barre latérale non repliable → ANO-05'],
      'TA-01': ['SUCCESS', ''], 'TA-02': ['SUCCESS', ''], 'TA-03': ['SUCCESS', ''], 'TA-04': ['SUCCESS', ''], 'TA-05': ['SUCCESS', ''],
      'TA-06': ['FAILURE', 'Événement absent après redémarrage (0 occurrence, 11 événements au lieu de 12) → ANO-04'],
      'TNF-01': ['SUCCESS', 'p(95) = 35,7 ms ; échecs = 0,02 % (1 / 4 631)'],
      'TNF-02': ['FAILURE', '29 vulnérabilités dont 15 hautes → ANO-06'],
      'TNF-03': ['FAILURE', 'PMD : 10 violations (priorités 3-4) ; CPD : 8 duplications ; ESLint : 55 erreurs → ANO-07'],
      'TNF-04': ['SUCCESS', 'Couverture des instructions : 49 % (seuil 40 %)'],
      'TM-01': ['SUCCESS', 'Build et tests OK sur JDK 25 (option -Dnet.bytebuddy.experimental=true requise pour Mockito)'],
    },
  },
];
