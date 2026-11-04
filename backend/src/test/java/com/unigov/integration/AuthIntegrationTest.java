package com.unigov.integration;

import com.unigov.entity.User;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * Tests d'intégration du module Authentification (EF-01, EF-02, ENF-02).
 * Contrôleur + sécurité + JPA + PostgreSQL réellement intégrés.
 */
class AuthIntegrationTest extends IntegrationTestBase {

    @Test
    @DisplayName("Inscription refusée hors domaine @enicar.ucar.tn")
    void domaineRefuse() throws Exception {
        var res = signup("etudiant@gmail.com", PASSWORD);
        assertEquals(400, res.getResponse().getStatus());
    }

    @ParameterizedTest(name = "mot de passe \"{0}\" -> HTTP {1}")
    @DisplayName("Politique de mot de passe : valeurs limites et classes d'équivalence")
    @CsvSource({
            "Abcdef1,   400",   // 7 caractères : juste sous la limite
            "Abcdefg1,  200",   // 8 caractères : limite exacte valide
            "abcdefg1,  400",   // sans majuscule
            "Abcdefgh,  400",   // sans chiffre
            "Abcdefghijklmnopqrstuvwxyz0123456789ABCD, 200", // 40 caractères : limite haute valide
            "Abcdefghijklmnopqrstuvwxyz0123456789ABCDE, 400" // 41 caractères : au-dessus de la limite
    })
    void politiqueMotDePasse(String password, int statutAttendu) throws Exception {
        var res = signup(uniqueEmail("pwd"), password);
        assertEquals(statutAttendu, res.getResponse().getStatus());
    }

    @Test
    @DisplayName("Inscription refusée si l'e-mail est déjà utilisé")
    void emailDuplique() throws Exception {
        String email = uniqueEmail("dup");
        assertEquals(200, signup(email, PASSWORD).getResponse().getStatus());
        assertEquals(400, signup(email, PASSWORD).getResponse().getStatus());
    }

    @Test
    @DisplayName("Connexion refusée (403) tant que l'e-mail n'est pas vérifié, acceptée après vérification")
    void verificationEmailObligatoire() throws Exception {
        String email = uniqueEmail("verif");
        signup(email, PASSWORD);

        var avant = login(email, PASSWORD);
        assertEquals(403, avant.getResponse().getStatus());
        jsonPath("$.code").value("EMAIL_NOT_VERIFIED").match(avant);

        verifyEmail(email);
        var apres = login(email, PASSWORD);
        assertEquals(200, apres.getResponse().getStatus());
        jsonPath("$.role").value("ROLE_ETUDIANT").match(apres);
    }

    @Test
    @DisplayName("Verrouillage du compte après 5 échecs : même le bon mot de passe est refusé (429)")
    void verrouillageApres5Echecs() throws Exception {
        String email = uniqueEmail("lock");
        signup(email, PASSWORD);
        verifyEmail(email);

        for (int i = 1; i <= 4; i++) {
            var r = login(email, "Mauvais" + i);
            assertEquals(401, r.getResponse().getStatus());
            jsonPath("$.message").value(containsString((5 - i) + " tentative(s) restante(s)")).match(r);
        }
        assertEquals(429, login(email, "Mauvais5").getResponse().getStatus());
        assertEquals(429, login(email, PASSWORD).getResponse().getStatus());
    }

    @Test
    @Disabled("ANO-03 ouverte (priorité moyenne) : correctif planifié, test réactivé à la correction")
    @DisplayName("ANO-03 : après expiration du verrouillage, un seul échec ne doit pas reverrouiller le compte")
    void compteurRemisAZeroApresExpiration() throws Exception {
        String email = uniqueEmail("relock");
        signup(email, PASSWORD);
        verifyEmail(email);
        for (int i = 1; i <= 5; i++) login(email, "Mauvais" + i);

        // Simule l'écoulement des 15 minutes de verrouillage
        User u = userRepository.findByEmail(email).orElseThrow();
        u.setLockoutUntil(LocalDateTime.now().minusSeconds(1));
        userRepository.save(u);

        assertEquals(401, login(email, "EncoreFaux1").getResponse().getStatus(),
                "Le compte est reverrouillé dès le 1er échec : le compteur n'est jamais remis à zéro");
    }
}
