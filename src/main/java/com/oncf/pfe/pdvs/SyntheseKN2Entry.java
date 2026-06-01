package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Stocke les valeurs manuelles / overrides de la Synthèse KN2.
 * Les valeurs automatiques sont calculées à la volée depuis les autres tables.
 */
@Entity
@Table(name = "synthese_kn2",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"entite_cspr", "annee", "semestre"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyntheseKN2Entry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, name = "entite_cspr")
    private String entiteCSPR;

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false, length = 2)
    private String semestre;           // S1 | S2

    // ── A. BILAN — Objectifs (manuels) ──
    // Les valeurs réalisées sont calculées auto depuis Planning KN2 et PDVS
    @Column private Integer objectifKN2;
    @Column private Integer objectifKN1;
    @Column private Integer objectifMI;
    @Column private Double  objectifTauxPDVS;

    // ── B. COTATIONS — Tendances (manuelles) ──
    // "↗" "→" "↘"
    @Column(length = 5) private String tendanceS;
    @Column(length = 5) private String tendanceA;
    @Column(length = 5) private String tendanceM;
    @Column(length = 5) private String tendanceI;

    // ── Métadonnées ──
    @Column(length = 100) private String saisiPar;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
