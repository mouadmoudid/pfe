package com.oncf.pfe.solde;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "element_solde",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"nom", "prenom", "mois", "annee", "entite"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ElementSolde {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== IDENTIFICATION =====
    @Column(length = 20)
    private String matricule;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column
    private String fonction;

    // CDT 101V, CDT 102V, CDT OA OH OT, CDT 101LC, CDT 101SST
    @Column(nullable = false, length = 50)
    private String entite;

    // ===== PÉRIODE =====
    @Column(nullable = false)
    private Integer mois;   // 1-12

    @Column(nullable = false)
    private Integer annee;

    // ===== ASTREINTE =====
    private Integer nbJoursAstreinte;
    private String  typeAstreinte;    // "A domicile" / "A la chambre"
    private String  periodeAstreinte; // "Du 01 au 14/12/25"

    // ===== INDEMNITÉS =====
    private Integer allocationNuit;
    private Integer repasNormal;
    private Integer decNormal;
    private Integer repasReduit;
    private Integer decReduit;
    private Integer allocationParcours;
    private Integer indemniteCup;     // Indemnité Journalière CUP

    // ===== CONGÉS =====
    private Integer nbJoursConge;
    private String  periodeConge;     // "du 08 au 15/12/25"

    // ===== REPOS COMPENSATEURS =====
    private Integer nbJoursRC;
    private String  periodeRC;        // "Le 22 et 23/12/25"
    private String  motifRC;          // "RCA du 06 et 09/11/25"

    // ===== HEURES SUPPLÉMENTAIRES =====
    private Integer nbHeuresSupp;
    private String  justificationHS;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;          // fullName du CGPX

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
