package com.oncf.pfe.rex;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name = "race")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Race {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numero;
    private String annee;
    private String entite;
    private String dateEvenement;
    private String lieuEvenement;
    @Column(columnDefinition = "TEXT")
    private String descriptionEvenement;
    private String degatsValeur;
    private String degatsTotal;

    // Causes
    @Column(columnDefinition = "TEXT")
    private String facteurHumain;
    @Column(columnDefinition = "TEXT")
    private String facteurOrganisationnel;
    @Column(columnDefinition = "TEXT")
    private String installation;

    // Entretiens
    @Column(columnDefinition = "TEXT")
    private String entretiensComplementaires;

    // Analyse globale
    @Column(columnDefinition = "TEXT")
    private String enchainementFaits;
    @Column(columnDefinition = "TEXT")
    private String arbreCauses;

    // Mesures
    @Column(columnDefinition = "TEXT")
    private String mesuresFacteurHumain;
    @Column(columnDefinition = "TEXT")
    private String mesuresFacteurOrganisationnel;
    @Column(columnDefinition = "TEXT")
    private String mesuresInstallation;

    @Column(columnDefinition = "TEXT")
    private String recommandations;

    // Signatures
    private String etabliPar;
    private String etabliLe;
    private String validePar;
    private String valideLe;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}