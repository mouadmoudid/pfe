package com.oncf.pfe.risque;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "risque_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RisqueEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String entite;        // entité organisationnelle (ex: CDT 102V)
    private String facteur;      // facteur humain, Env, Procédure, Installation
    private String lieu;         // LGV, etc.
    private String danger;
    private String risque;
    private Integer frequence;   // 1-5
    private Integer gravite;     // 1-6
    private String criticite;    // C, E, M, F (calculée auto)

    @Column(columnDefinition = "TEXT")
    private String propositions;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // Calcul automatique de la criticité basé sur fréquence * gravité
    @PrePersist
    @PreUpdate
    public void calculerCriticite() {
        if (frequence != null && gravite != null) {
            int score = frequence * gravite;
            if (score >= 8)      this.criticite = "C"; // Critique
            else if (score >= 4) this.criticite = "E"; // Élevé
            else if (score >= 2) this.criticite = "M"; // Modéré
            else                 this.criticite = "F"; // Faible
        }
    }
}