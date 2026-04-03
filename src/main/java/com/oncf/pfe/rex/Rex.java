package com.oncf.pfe.rex;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name = "rex")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Rex {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titre;
    private String dateHeure;
    private String lieu;
    private String materielConcerne;
    private String operationEnCours;
    private String detectionPanne;
    private String naturePanne;
    private String alerteProcedure;
    private String securisationSite;
    private String demandeSecours;
    @Column(columnDefinition = "TEXT")
    private String tentativesDepannage;
    private String resolutionIncident;
    @Column(columnDefinition = "TEXT")
    private String causeDirecte;
    @Column(columnDefinition = "TEXT")
    private String causesIndirectes;
    private String impactCirculations;
    private String impactTrain;
    @Column(columnDefinition = "TEXT")
    private String couts;
    @Column(columnDefinition = "TEXT")
    private String recommandations;
    @Column(columnDefinition = "TEXT")
    private String conclusion;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}