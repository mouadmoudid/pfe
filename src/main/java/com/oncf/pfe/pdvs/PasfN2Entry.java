package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pasf_n2_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PasfN2Entry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false, length = 50)
    private String entiteCSPR;

    @Column(nullable = false)
    private Integer ordre;

    // Champs fixes (pré-initialisés, modifiables)
    @Column(length = 30)
    private String processus;

    @Column(length = 80)
    private String axeNoss;

    @Column(length = 30)
    private String source;

    // Champs manuels
    @Column(columnDefinition = "TEXT")
    private String action;

    @Column(length = 100)
    private String responsableNom;

    @Column(length = 20)
    private String responsableMatricule;

    @Column(length = 200)
    private String contributeurs;

    @Column
    private LocalDate echeance;

    @Column(length = 200)
    private String indicateur;

    @Column(length = 200)
    private String objectif;

    @Column
    private Integer avancementPct;

    // EN_COURS | REALISE | EN_RETARD | ANNULE
    @Column(length = 20)
    private String statut;

    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
