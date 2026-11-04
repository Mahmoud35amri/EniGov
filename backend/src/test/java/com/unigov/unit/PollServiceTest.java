package com.unigov.unit;

import com.unigov.dto.PollDtos.PollRequest;
import com.unigov.dto.PollDtos.PollResponse;
import com.unigov.dto.PollDtos.VoteRequest;
import com.unigov.entity.Poll;
import com.unigov.entity.PollOption;
import com.unigov.entity.Role;
import com.unigov.entity.User;
import com.unigov.repository.PollRepository;
import com.unigov.repository.UserRepository;
import com.unigov.service.NotificationService;
import com.unigov.service.PollService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires de PollService (EF-07 / EF-08) — dépendances simulées avec Mockito.
 * Techniques : partitions d'équivalence + analyse des valeurs limites.
 */
@ExtendWith(MockitoExtension.class)
class PollServiceTest {

    @Mock PollRepository pollRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @InjectMocks PollService pollService;

    @BeforeEach
    void setUp() {
        lenient().when(userRepository.findByUsername("etudiant"))
                .thenReturn(Optional.of(user("u-etu", "etudiant", Role.ROLE_ETUDIANT)));
        lenient().when(pollRepository.save(any(Poll.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static User user(String id, String username, Role role) {
        User u = new User();
        u.setId(id);
        u.setUsername(username);
        u.setFullName(username);
        u.setRole(role);
        return u;
    }

    private static Poll poll(String id, int nbOptions) {
        Poll p = new Poll();
        p.setId(id);
        p.setQuestion("Question ?");
        for (int i = 0; i < nbOptions; i++) {
            PollOption o = new PollOption("Option " + i);
            o.setOptionIndex(i);
            o.setPoll(p);
            p.getOptions().add(o);
        }
        return p;
    }

    private static VoteRequest vote(int index) {
        VoteRequest v = new VoteRequest();
        v.setOptionIndex(index);
        return v;
    }

    private PollRequest requete(List<String> options) {
        when(userRepository.findByUsername("delegue"))
                .thenReturn(Optional.of(user("u-del", "delegue", Role.ROLE_DELEGUE)));
        PollRequest req = new PollRequest();
        req.setQuestion("Q ?");
        req.setOptions(options);
        return req;
    }

    @Test
    @DisplayName("Création refusée avec 1 seule option (valeur limite < 2)")
    void creationRefuseeAvecUneOption() {
        PollRequest req = requete(List.of("Seule option"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> pollService.createPoll(req, "delegue"));
        assertEquals("Un sondage doit avoir au moins 2 options", ex.getMessage());
        verify(pollRepository, never()).save(any());
    }

    @Test
    @DisplayName("Création acceptée avec 2 options (valeur limite = 2) et notification envoyée")
    void creationAccepteeAvecDeuxOptions() {
        PollResponse res = pollService.createPoll(requete(List.of("Oui", "Non")), "delegue");

        assertEquals(2, res.getOptions().size());
        assertTrue(res.isActive());
        verify(notificationService).notifyTargetedStudents(eq(true), anySet(), anySet(), any(), anyString(), any());
    }

    @Test
    @DisplayName("Vote valide : le vote est compté (100 %)")
    void voteValide() {
        when(pollRepository.findById("p1")).thenReturn(Optional.of(poll("p1", 3)));

        PollResponse res = pollService.vote("p1", vote(1), "etudiant");

        assertEquals(1, res.getTotalVotes());
        assertEquals(1, res.getOptions().get(1).getVoteCount());
        assertEquals(100.0, res.getOptions().get(1).getPercentage());
        assertTrue(res.isUserVoted());
    }

    @Test
    @DisplayName("Double vote interdit (un seul vote par étudiant)")
    void doubleVoteInterdit() {
        Poll p = poll("p1", 2);
        p.getOptions().get(0).getVoterIds().add("u-etu");
        when(pollRepository.findById("p1")).thenReturn(Optional.of(p));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> pollService.vote("p1", vote(1), "etudiant"));
        assertEquals("Vous avez déjà voté pour ce sondage", ex.getMessage());
    }

    @Test
    @DisplayName("Vote refusé sur un sondage clôturé")
    void voteRefuseSondageCloture() {
        Poll p = poll("p1", 2);
        p.setActive(false);
        when(pollRepository.findById("p1")).thenReturn(Optional.of(p));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> pollService.vote("p1", vote(0), "etudiant"));
        assertEquals("Ce sondage est clôturé", ex.getMessage());
    }

    @Test
    @DisplayName("Vote refusé après la date limite")
    void voteRefuseApresDeadline() {
        Poll p = poll("p1", 2);
        p.setDeadline(LocalDateTime.now().minusMinutes(1));
        when(pollRepository.findById("p1")).thenReturn(Optional.of(p));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> pollService.vote("p1", vote(0), "etudiant"));
        assertEquals("La date limite de ce sondage est dépassée", ex.getMessage());
    }

    @ParameterizedTest(name = "index d''option invalide = {0}")
    @ValueSource(ints = {-1, 3, 99})
    @DisplayName("Valeurs limites de l'index d'option (sondage à 3 options : 0..2)")
    void indexOptionInvalide(int index) {
        when(pollRepository.findById("p1")).thenReturn(Optional.of(poll("p1", 3)));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> pollService.vote("p1", vote(index), "etudiant"));
        assertEquals("Option invalide", ex.getMessage());
    }

    @Test
    @DisplayName("Pourcentages arrondis à 1 décimale (2/3 = 66.7 %, 1/3 = 33.3 %)")
    void pourcentagesArrondis() {
        Poll p = poll("p1", 2);
        p.getOptions().get(0).getVoterIds().addAll(List.of("a", "b"));
        when(pollRepository.findById("p1")).thenReturn(Optional.of(p));

        PollResponse res = pollService.vote("p1", vote(1), "etudiant");

        assertEquals(66.7, res.getOptions().get(0).getPercentage());
        assertEquals(33.3, res.getOptions().get(1).getPercentage());
    }

    @Test
    @DisplayName("Clôture d'un sondage : active passe à false")
    void cloture() {
        when(pollRepository.findById("p1")).thenReturn(Optional.of(poll("p1", 2)));

        assertFalse(pollService.closePoll("p1").isActive());
    }
}
