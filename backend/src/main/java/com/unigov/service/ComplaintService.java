package com.unigov.service;

import com.unigov.dto.ComplaintDtos.*;
import com.unigov.entity.Complaint;
import com.unigov.entity.ComplaintEnums.ComplaintStatus;
import com.unigov.entity.Notification.NotificationType;
import com.unigov.entity.Role;
import com.unigov.entity.User;
import com.unigov.repository.ComplaintRepository;
import com.unigov.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public ComplaintResponse createComplaint(ComplaintRequest request, String username, String attachmentUrl) {
        User student = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        Complaint complaint = new Complaint();
        complaint.setTitle(request.getTitle());
        complaint.setDescription(request.getDescription());
        complaint.setPublic(request.isPublic());
        complaint.setStatus(ComplaintStatus.PENDING);
        complaint.setStudentId(student.getId());
        complaint.setStudentName(student.getFullName());
        complaint.setAttachmentPath(attachmentUrl); // URL Cloudinary

        Complaint saved = complaintRepository.save(complaint);
        return mapToResponse(saved, student.getId());
    }

    public List<ComplaintResponse> getMyComplaints(String username) {
        User student = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return complaintRepository.findByStudentIdOrderByCreatedAtDesc(student.getId()).stream()
                .map(c -> mapToResponse(c, student.getId()))
                .collect(Collectors.toList());
    }

    public List<ComplaintResponse> getPublicComplaints(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return complaintRepository.findByIsPublicTrueOrderByCreatedAtDesc().stream()
                .map(c -> mapToResponse(c, user.getId()))
                .collect(Collectors.toList());
    }

    public List<ComplaintResponse> getAllComplaints(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return complaintRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> mapToResponse(c, user.getId()))
                .collect(Collectors.toList());
    }

    public ComplaintResponse getById(String id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));
        boolean autorise = complaint.isPublic()
                || user.getId().equals(complaint.getStudentId())
                || user.getRole() == Role.ROLE_DELEGUE;
        if (!autorise) {
            throw new AccessDeniedException("Réclamation privée");
        }
        return mapToResponse(complaint, user.getId());
    }

    @Transactional
    public ComplaintResponse updateStatus(String id, ComplaintUpdate update) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));

        if (update.getStatus() != null) {
            complaint.setStatus(update.getStatus());
        }
        if (update.getResponse() != null) {
            complaint.setDelegateResponse(update.getResponse());
        }
        complaint.setUpdatedAt(LocalDateTime.now());

        Complaint saved = complaintRepository.save(complaint);

        String statusLabel = switch (saved.getStatus()) {
            case PENDING -> "en attente";
            case IN_PROGRESS -> "en cours";
            case RESOLVED -> "résolue";
            case REJECTED -> "rejetée";
        };
        notificationService.notifyUser(
                saved.getStudentId(),
                NotificationType.COMPLAINT_STATUS_CHANGED,
                "Votre réclamation \"" + saved.getTitle() + "\" est maintenant " + statusLabel,
                saved.getId()
        );

        return mapToResponse(saved, null);
    }

    @Transactional
    public ComplaintResponse toggleUpvote(String id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));

        if (!complaint.isPublic()) {
            throw new RuntimeException("Impossible de voter sur une réclamation privée");
        }

        String userId = user.getId();
        complaint.getDownvotes().remove(userId);
        if (complaint.getUpvotes().contains(userId)) {
            complaint.getUpvotes().remove(userId);
        } else {
            complaint.getUpvotes().add(userId);
        }

        Complaint saved = complaintRepository.save(complaint);
        return mapToResponse(saved, userId);
    }

    @Transactional
    public ComplaintResponse toggleDownvote(String id, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));

        if (!complaint.isPublic()) {
            throw new RuntimeException("Impossible de voter sur une réclamation privée");
        }

        String userId = user.getId();
        complaint.getUpvotes().remove(userId);
        if (complaint.getDownvotes().contains(userId)) {
            complaint.getDownvotes().remove(userId);
        } else {
            complaint.getDownvotes().add(userId);
        }

        Complaint saved = complaintRepository.save(complaint);
        return mapToResponse(saved, userId);
    }

    @Transactional
    public void deleteComplaint(String id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réclamation non trouvée"));
        // Suppression Cloudinary optionnelle ici
        complaintRepository.delete(complaint);
    }

    private ComplaintResponse mapToResponse(Complaint complaint, String currentUserId) {
        ComplaintResponse response = new ComplaintResponse();
        response.setId(complaint.getId());
        response.setTitle(complaint.getTitle());
        response.setDescription(complaint.getDescription());
        response.setPublic(complaint.isPublic());
        response.setStatus(complaint.getStatus());
        response.setStudentId(complaint.getStudentId());
        response.setStudentName(complaint.getStudentName());
        response.setDelegateResponse(complaint.getDelegateResponse());
        response.setAttachmentPath(complaint.getAttachmentPath());
        response.setUpvoteCount(complaint.getUpvotes() != null ? complaint.getUpvotes().size() : 0);
        response.setDownvoteCount(complaint.getDownvotes() != null ? complaint.getDownvotes().size() : 0);
        response.setVoteScore(complaint.getVoteScore());
        response.setCreatedAt(complaint.getCreatedAt());
        response.setUpdatedAt(complaint.getUpdatedAt());

        if (currentUserId != null) {
            if (complaint.getUpvotes() != null && complaint.getUpvotes().contains(currentUserId)) {
                response.setUserVote("UP");
            } else if (complaint.getDownvotes() != null && complaint.getDownvotes().contains(currentUserId)) {
                response.setUserVote("DOWN");
            }
        }

        return response;
    }
}
