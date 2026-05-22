package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "journal_csspr_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class JournalCSSPrEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== PÉRIODE =====
    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false, length = 50)
    private String entiteCSPR;          // Ex: "CT Voie", "CT CSS"

    @Column(nullable = false)
    private Integer ordre;

    // ===== DÉCISION =====
    @Column(nullable = false, length = 500)
    private String decision;

    @Column(nullable = false)
    private LocalDate dateDecision;

    // ===== RESPONSABLE (depuis liste utilisateurs) =====
    @Column(length = 100)
    private String responsableNom;      // fullName

    @Column(length = 20)
    private String responsableMatricule;

    // ===== CONTRIBUTEURS =====
    @Column(length = 300)
    private String contributeurs;       // texte libre ou liste séparée par virgules

    // ===== SUIVI =====
    @Column
    private LocalDate echeance;

    @Column(length = 20)
    private String avancement;          // Ex: "50%", "En attente"

    // Statut : EN_COURS / REALISE / ANNULE / EN_RETARD
    @Column(nullable = false, length = 20)
    private String statut;

    @Column(length = 500)
    private String observations;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
