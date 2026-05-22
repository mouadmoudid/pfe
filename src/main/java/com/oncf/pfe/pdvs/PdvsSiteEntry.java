package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "pdvs_site_entry",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"site", "semestre", "annee", "entite"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PdvsSiteEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== IDENTIFICATION =====
    @Column(nullable = false, length = 200)
    private String site;                // Ex: "Voie V1+V2 DT 101V"

    @Column(length = 50)
    private String dt;                  // Ex: "DT 102V", "DT OA"

    @Column(length = 50)
    private String type;                // Voie / AdV / AD-OA / Composant / Zone crit. / Envir. / OA

    @Column(length = 200)
    private String lienRisqueMajeur;    // Ex: "RI-01 Géométrie + RI-02 AdV"

    // ===== ENTITÉ ORGANISATIONNELLE =====
    @Column(nullable = false, length = 50)
    private String entite;              // CDT 101V, CDT 102V...

    // ===== PÉRIODE =====
    @Column(nullable = false, length = 2)
    private String semestre;            // "S1" ou "S2"

    @Column(nullable = false)
    private Integer annee;

    // ===== COTATIONS =====
    @Column(length = 1)
    private String cotationS1;          // S/A/M/I — Semestre 1

    @Column(length = 1)
    private String cotationS2;          // S/A/M/I — Semestre 2

    @Column(length = 1)
    private String cotationAnnuelle;    // S/A/M/I — Cotation annuelle

    // ===== SUIVI =====
    @Column(length = 500)
    private String actionsN2;

    @Column(length = 200)
    private String bouclage;

    @Column(length = 100)
    private String responsable;

    @Column(length = 300)
    private String observations;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
