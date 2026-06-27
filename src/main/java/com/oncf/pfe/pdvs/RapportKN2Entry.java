package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rapport_kn2")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RapportKN2Entry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String entiteCSPR;

    @Column(nullable = false)
    private LocalDate dateRapport;

    // Type : TRIMESTRIEL | SEMESTRIEL | ANNUEL
    @Column(length = 20)
    private String typeRapport;

    @Column(length = 50)
    private String cdtControle;

    // Pré-rempli depuis User connecté
    @Column(length = 100)
    private String parNom;

    @Column(length = 100)
    private String parFonction;

    // ── SECTION 1 — Évaluation KN1 (tout manuel) ──
    @Column(columnDefinition = "TEXT")
    private String s1Organisation;

    @Column(columnDefinition = "TEXT")
    private String s1Execution;

    @Column(columnDefinition = "TEXT")
    private String s1Qualite;

    @Column(columnDefinition = "TEXT")
    private String s1ActionsKN1;

    @Column(columnDefinition = "TEXT")
    private String s1Bouclage;

    // ── SECTION 4 — Documentation (manuel) ──
    @Column(columnDefinition = "TEXT")
    private String s4Observations;

    // ── SECTION 5 — FOH 4 dimensions (manuel) ──
    @Column(columnDefinition = "TEXT") private String s5OrgMgmtConstatations;
    @Column(columnDefinition = "TEXT") private String s5OrgMgmtActions;
    @Column(columnDefinition = "TEXT") private String s5OrgMgmtBouclage;

    @Column(columnDefinition = "TEXT") private String s5CollectifsConstatations;
    @Column(columnDefinition = "TEXT") private String s5CollectifsActions;
    @Column(columnDefinition = "TEXT") private String s5CollectifsBouclage;

    @Column(columnDefinition = "TEXT") private String s5SituationsConstatations;
    @Column(columnDefinition = "TEXT") private String s5SituationsActions;
    @Column(columnDefinition = "TEXT") private String s5SituationsBouclage;

    @Column(columnDefinition = "TEXT") private String s5IndividusConstatations;
    @Column(columnDefinition = "TEXT") private String s5IndividusActions;
    @Column(columnDefinition = "TEXT") private String s5IndiviusBouclage;

    // ── SECTION 6 — Analyse & Recommandations (manuel) ──
    @Column(columnDefinition = "TEXT") private String s6Synthese;
    @Column(columnDefinition = "TEXT") private String s6PointsForts;
    @Column(columnDefinition = "TEXT") private String s6AAmeliorer;
    @Column(columnDefinition = "TEXT") private String s6Recommandations;
    @Column(length = 50)               private String s6Echeance;

    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
