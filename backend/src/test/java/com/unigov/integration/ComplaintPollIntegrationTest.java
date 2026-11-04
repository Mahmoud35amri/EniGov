package com.unigov.integration;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration bout-en-bout côté API : Réclamations (EF-03..EF-05), Notifications (EF-10),
 * Sondages (EF-07, EF-08).
 */
class ComplaintPollIntegrationTest extends IntegrationTestBase {

    private String creerReclamation(Session etu, String titre, boolean publique) throws Exception {
        String body = mvc.perform(multipart("/api/complaints").header("Authorization", etu.bearer())
                        .param("title", titre).param("description", "Description de test")
                        .param("isPublic", String.valueOf(publique)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    @Test
    @DisplayName("Réclamation privée : absente de la liste publique des autres étudiants")
    void priveeAbsenteDeLaListePublique() throws Exception {
        Session a = nouvelEtudiant("a");
        Session b = nouvelEtudiant("b");
        String id = creerReclamation(a, "Privée liste", false);

        mvc.perform(get("/api/complaints/my").header("Authorization", a.bearer()))
                .andExpect(jsonPath("$[*].id", hasItem(id)));
        mvc.perform(get("/api/complaints/public").header("Authorization", b.bearer()))
                .andExpect(jsonPath("$[*].id", not(hasItem(id))));
    }

    @Test
    @DisplayName("ANO-01 : un autre étudiant ne doit pas lire une réclamation privée par son identifiant")
    void priveeInaccessibleParId() throws Exception {
        Session a = nouvelEtudiant("a");
        Session b = nouvelEtudiant("b");
        String id = creerReclamation(a, "Privée par id", false);

        mvc.perform(get("/api/complaints/" + id).header("Authorization", b.bearer()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/complaints/" + id).header("Authorization", a.bearer()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/complaints/" + id).header("Authorization", delegue().bearer()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Réclamation publique : vote d'un autre étudiant, score = 1")
    void votePublique() throws Exception {
        Session a = nouvelEtudiant("a");
        Session b = nouvelEtudiant("b");
        String id = creerReclamation(a, "WiFi bloc B", true);

        mvc.perform(post("/api/complaints/" + id + "/upvote").header("Authorization", b.bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voteScore").value(1))
                .andExpect(jsonPath("$.userVote").value("UP"));
    }

    @Test
    @DisplayName("Changement de statut par le délégué → l'étudiant reçoit une notification")
    void statutNotifie() throws Exception {
        Session a = nouvelEtudiant("a");
        String id = creerReclamation(a, "Climatisation", false);

        mvc.perform(put("/api/complaints/" + id + "/status").header("Authorization", delegue().bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"response\":\"Réparée\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));

        mvc.perform(get("/api/notifications").header("Authorization", a.bearer()))
                .andExpect(jsonPath("$[*].type", hasItem("COMPLAINT_STATUS_CHANGED")));
        mvc.perform(get("/api/complaints/my").header("Authorization", a.bearer()))
                .andExpect(jsonPath("$[0].delegateResponse").value("Réparée"));
    }

    @Test
    @DisplayName("Sondage : création par le délégué, vote unique de l'étudiant, second vote refusé")
    void sondageVoteUnique() throws Exception {
        String body = mvc.perform(post("/api/polls").header("Authorization", delegue().bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"Horaire de la cafétéria ?\",\"options\":[\"8h\",\"9h\",\"10h\"]}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String pollId = JsonPath.read(body, "$.id");
        Session etu = nouvelEtudiant("vote");

        mvc.perform(post("/api/polls/" + pollId + "/vote").header("Authorization", etu.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"optionIndex\":2}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalVotes").value(1))
                .andExpect(jsonPath("$.options[2].percentage").value(100.0));

        mvc.perform(post("/api/polls/" + pollId + "/vote").header("Authorization", etu.bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"optionIndex\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Vous avez déjà voté pour ce sondage"));
    }
}
