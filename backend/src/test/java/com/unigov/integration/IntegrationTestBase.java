package com.unigov.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import com.unigov.repository.UserRepository;
import com.unigov.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Base des tests d'intégration : contexte Spring complet + MockMvc + vraie base PostgreSQL de test
 * (profil "test"). Seul l'envoi d'e-mails (service externe Brevo) est simulé.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class IntegrationTestBase {

    static final String DELEGUE_EMAIL = "delegue@enicar.ucar.tn";
    static final String DELEGUE_PASSWORD = "Delegue2026";
    static final String PASSWORD = "Etudiant2026";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @MockBean EmailService emailService;

    record Session(String token, String id) {
        String bearer() { return "Bearer " + token; }
    }

    static String uniqueEmail(String prefix) {
        return prefix + "." + UUID.randomUUID().toString().substring(0, 8) + "@enicar.ucar.tn";
    }

    MvcResult signup(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of(
                                "email", email, "password", password, "fullName", "Etudiant " + email))))
                .andReturn();
    }

    MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andReturn();
    }

    void verifyEmail(String email) throws Exception {
        String token = userRepository.findByEmail(email).orElseThrow().getVerificationToken();
        mvc.perform(get("/api/auth/verify-email").param("token", token)).andReturn();
    }

    Session session(MvcResult loginResult) throws Exception {
        String body = loginResult.getResponse().getContentAsString();
        return new Session(JsonPath.read(body, "$.token"), JsonPath.read(body, "$.id"));
    }

    /** Inscrit, vérifie et connecte un nouvel étudiant. */
    Session nouvelEtudiant(String prefix) throws Exception {
        String email = uniqueEmail(prefix);
        signup(email, PASSWORD);
        verifyEmail(email);
        return session(login(email, PASSWORD));
    }

    Session delegue() throws Exception {
        return session(login(DELEGUE_EMAIL, DELEGUE_PASSWORD));
    }
}
