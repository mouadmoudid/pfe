package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "pdvs_ete_ramadan_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PdvsEteRamadanEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer annee;

    // "ETE" ou "RAMADAN"
    @Column(nullable = false, length = 10)
    private String periode;

    @Column(nullable = false, length = 50)
    private String entiteCSPR;

    @Column(nullable = false)
    private Integer ordre;

    // Champs fixes (modifiables)
    @Column(columnDefinition = "TEXT")
    private String actionN2;

    @Column(length = 50)
    private String cdt;           // Tous / Concerné / Demandeur / —

    @Column(length = 50)
    private String frequence;     // Hebdo / Bimensuel / Programme...

    @Column(length = 50)
    private String lienRisque;    // RH-01 / RE-02 / RI-01...

    // Champs manuels
    @Column(length = 100)
    private String responsableNom;

    @Column(length = 20)
    private String responsableMatricule;

    // P = date/remarque planification
    @Column(length = 100)
    private String planifie;

    // R = date/remarque réalisation
    @Column(length = 100)
    private String realise;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
