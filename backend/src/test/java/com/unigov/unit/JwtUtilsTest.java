package com.unigov.unit;

import com.unigov.entity.Role;
import com.unigov.entity.User;
import com.unigov.security.JwtUtils;
import com.unigov.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/** Tests unitaires de JwtUtils (EF-01 authentification, ENF-02 sécurité). */
class JwtUtilsTest {

    private static final String SECRET = "test-secret-key-for-junit-at-least-32-bytes-long!!";
    private JwtUtils jwtUtils;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 60_000);

        User u = new User();
        u.setId("id-1");
        u.setUsername("delegue");
        u.setEmail("delegue@enicar.ucar.tn");
        u.setRole(Role.ROLE_DELEGUE);
        UserDetailsImpl principal = UserDetailsImpl.build(u);
        auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    @DisplayName("Un jeton généré est valide et contient le nom d'utilisateur")
    void jetonValide() {
        String token = jwtUtils.generateJwtToken(auth);

        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("delegue", jwtUtils.getUserNameFromJwtToken(token));
    }

    @Test
    @DisplayName("Un jeton signé avec une autre clé est rejeté (validateJwtToken renvoie false)")
    void jetonSigneAvecAutreCle() {
        JwtUtils pirate = new JwtUtils();
        ReflectionTestUtils.setField(pirate, "jwtSecret", "une-autre-cle-secrete-de-plus-de-32-octets!!");
        ReflectionTestUtils.setField(pirate, "jwtExpirationMs", 60_000);
        String tokenPirate = pirate.generateJwtToken(auth);

        assertFalse(jwtUtils.validateJwtToken(tokenPirate));
    }

    @Test
    @DisplayName("Un jeton expiré est rejeté")
    void jetonExpire() {
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", -1000);
        String token = jwtUtils.generateJwtToken(auth);

        assertFalse(jwtUtils.validateJwtToken(token));
    }

    @Test
    @DisplayName("Un jeton mal formé ou vide est rejeté")
    void jetonMalForme() {
        assertFalse(jwtUtils.validateJwtToken("pas.un.jwt"));
        assertFalse(jwtUtils.validateJwtToken(""));
    }
}
