package com.unigov.unit;

import com.unigov.dto.ComplaintDtos.ComplaintRequest;
import com.unigov.dto.ComplaintDtos.ComplaintResponse;
import com.unigov.dto.ComplaintDtos.ComplaintUpdate;
import com.unigov.entity.Complaint;
import com.unigov.entity.ComplaintEnums.ComplaintStatus;
import com.unigov.entity.Notification.NotificationType;
import com.unigov.entity.Role;
import com.unigov.entity.User;
import com.unigov.repository.ComplaintRepository;
import com.unigov.repository.UserRepository;
import com.unigov.service.ComplaintService;
import com.unigov.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests unitaires de ComplaintService (EF-03 / EF-04 / EF-05).
 * Technique : test de transitions d'états du vote (aucun -> UP -> aucun, UP -> DOWN).
 */
@ExtendWith(MockitoExtension.class)
class ComplaintServiceTest {

    @Mock ComplaintRepository complaintRepository;
    @Mock UserRepository userRepository;
    @Mock NotificationService notificationService;
    @InjectMocks ComplaintService complaintService;

    private Complaint publique;

    @BeforeEach
    void setUp() {
        User etu = new User();
        etu.setId("u-etu");
        etu.setUsername("etudiant");
        etu.setFullName("Étudiant Test");
        etu.setRole(Role.ROLE_ETUDIANT);
        lenient().when(userRepository.findByUsername("etudiant")).thenReturn(Optional.of(etu));
        lenient().when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        publique = new Complaint();
        publique.setId("c1");
        publique.setTitle("WiFi");
        publique.setPublic(true);
        publique.setStudentId("u-autre");
        lenient().when(complaintRepository.findById("c1")).thenReturn(Optional.of(publique));
    }

    @Test
    @DisplayName("Une nouvelle réclamation est créée au statut EN ATTENTE")
    void creationStatutEnAttente() {
        ComplaintRequest req = new ComplaintRequest();
        req.setTitle("Climatisation");
        req.setDescription("En panne");
        req.setPublic(false);

        ComplaintResponse res = complaintService.createComplaint(req, "etudiant", null);

        assertEquals(ComplaintStatus.PENDING, res.getStatus());
        assertFalse(res.isPublic());
        assertEquals("Étudiant Test", res.getStudentName());
    }

    @Test
    @DisplayName("Upvote puis re-clic : le vote est annulé (toggle)")
    void upvoteToggle() {
        assertEquals("UP", complaintService.toggleUpvote("c1", "etudiant").getUserVote());

        ComplaintResponse res = complaintService.toggleUpvote("c1", "etudiant");
        assertNull(res.getUserVote());
        assertEquals(0, res.getVoteScore());
    }

    @Test
    @DisplayName("Upvote puis downvote : le downvote remplace l'upvote (score = -1)")
    void downvoteRemplaceUpvote() {
        complaintService.toggleUpvote("c1", "etudiant");

        ComplaintResponse res = complaintService.toggleDownvote("c1", "etudiant");

        assertEquals("DOWN", res.getUserVote());
        assertEquals(-1, res.getVoteScore());
    }

    @Test
    @DisplayName("Vote impossible sur une réclamation privée")
    void voteSurPriveeRefuse() {
        publique.setPublic(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> complaintService.toggleUpvote("c1", "etudiant"));
        assertEquals("Impossible de voter sur une réclamation privée", ex.getMessage());
    }

    @Test
    @DisplayName("Changement de statut par le délégué : notification envoyée à l'étudiant")
    void changementStatutNotifie() {
        ComplaintUpdate up = new ComplaintUpdate();
        up.setStatus(ComplaintStatus.RESOLVED);
        up.setResponse("Routeur remplacé");

        ComplaintResponse res = complaintService.updateStatus("c1", up);

        assertEquals(ComplaintStatus.RESOLVED, res.getStatus());
        assertEquals("Routeur remplacé", res.getDelegateResponse());
        verify(notificationService).notifyUser(eq("u-autre"), eq(NotificationType.COMPLAINT_STATUS_CHANGED),
                contains("résolue"), eq("c1"));
    }
}
