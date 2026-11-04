package com.unigov.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration de la matrice d'autorisations (ENF-02 sécurité, EF-11 rôles).
 */
class SecurityIntegrationTest extends IntegrationTestBase {

    private Session etudiant;
    private Session delegue;

    @BeforeEach
    void sessions() throws Exception {
        etudiant = nouvelEtudiant("secu");
        delegue = delegue();
    }

    private static void refuse(int statut) {
        assertTrue(statut == 401 || statut == 403, "Accès attendu refusé (401/403) mais HTTP " + statut);
    }

    @Test
    @DisplayName("Sans jeton : l'API protégée est inaccessible")
    void sansJeton() throws Exception {
        refuse(mvc.perform(get("/api/announcements")).andReturn().getResponse().getStatus());
    }

    @Test
    @DisplayName("Jeton falsifié : accès refusé (et pas d'erreur 500)")
    void jetonFalsifie() throws Exception {
        String falsifie = etudiant.token().substring(0, etudiant.token().length() - 3) + "abc";
        refuse(mvc.perform(get("/api/announcements").header("Authorization", "Bearer " + falsifie))
                .andReturn().getResponse().getStatus());
    }

    @Test
    @DisplayName("Étudiant : création de sondage interdite (403)")
    void etudiantNePeutPasCreerSondage() throws Exception {
        mvc.perform(post("/api/polls").header("Authorization", etudiant.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"Q?\",\"options\":[\"a\",\"b\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Étudiant : statistiques et liste des étudiants interdites (403)")
    void etudiantSansAccesAdmin() throws Exception {
        mvc.perform(get("/api/stats").header("Authorization", etudiant.bearer())).andExpect(status().isForbidden());
        mvc.perform(get("/api/users/students").header("Authorization", etudiant.bearer())).andExpect(status().isForbidden());
        mvc.perform(get("/api/complaints").header("Authorization", etudiant.bearer())).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Délégué : accès aux statistiques autorisé (200)")
    void delegueAccesStats() throws Exception {
        mvc.perform(get("/api/stats").header("Authorization", delegue.bearer())).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Messagerie : un étudiant ne peut pas écrire à un autre étudiant")
    void messagerieEtudiantVersEtudiantInterdite() throws Exception {
        Session autre = nouvelEtudiant("autre");
        mvc.perform(post("/api/messages").header("Authorization", etudiant.bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"salut\",\"recipientId\":\"" + autre.id() + "\"}"))
                .andExpect(status().isBadRequest());
    }
}
