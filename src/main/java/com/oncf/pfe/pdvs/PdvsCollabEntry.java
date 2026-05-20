package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "pdvs_collab_entry",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"matricule", "semestre", "annee", "entite"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PdvsCollabEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== IDENTIFICATION (depuis liste collaborateurs) =====
    @Column(nullable = false, length = 20)
    private String matricule;

    @Column(nullable = false)
    private String collaborateurNom;   // fullName

    @Column(length = 50)
    private String dt;                  // DT 102V, DT 101V, DT OA OH OT...

    @Column(length = 50)
    private String fonction;            // CUP, Tech., Stag.

    @Column(nullable = false, length = 20)
    private String entite;              // entité organisationnelle du CSPR

    // ===== PÉRIODE =====
    @Column(nullable = false, length = 2)
    private String semestre;            // "S1" ou "S2"

    @Column(nullable = false)
    private Integer annee;

    // ===== FRAGILITÉ =====
    // Valeurs : "Nouvelle recrue" | "Resp. incident" | "Coté M/I"
    //           | "Remarques CPA" | "+55 ans" | "-"
    @Column(length = 30)
    private String critereFragilise;

    @Column(length = 255)
    private String lienRisqueMajeur;

    // ===== PROCÉDURES — cotation S/A/M/I =====
    @Column(length = 1) private String sp320;
    @Column(length = 1) private String s2b;
    @Column(length = 1) private String s9a;
    @Column(length = 1) private String s9b;
    @Column(length = 1) private String cgS2c;
    @Column(length = 1) private String consLoc;
    @Column(length = 1) private String guides;
    @Column(length = 1) private String refInterv;
    @Column(length = 1) private String refNormes;
    @Column(length = 1) private String refSecCh;
    @Column(length = 1) private String refTour;
    @Column(length = 1) private String inR3001;

    // ===== ÉVALUATION =====
    // Cotation globale S/A/M/I calculée ou saisie par le CSPR
    @Column(length = 1)
    private String cotationN2;

    @Column(length = 100)
    private String ecartKn1;

    // ===== SUIVI =====
    @Column(length = 500)
    private String actions;

    @Column(length = 200)
    private String bouclage;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;           // fullName du CSPR

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
