package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "pdvs_management_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PdvsManagementEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== PÉRIODE =====
    @Column(nullable = false, length = 2)
    private String semestre;        // S1 ou S2

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false, length = 50)
    private String entite;          // entité du CSPR (CT Voie, CT CSS...)

    // ===== THÈME (modifiable par CSPR/ADMIN) =====
    @Column(nullable = false)
    private Integer ordre;          // pour garder l'ordre d'affichage

    @Column(nullable = false, length = 100)
    private String theme;           // Ex: "Pilotage sécurité"

    @Column(length = 200)
    private String processusEvalue; // Ex: "Planification, Réalisation..."

    // ===== COTATIONS PAR SOUS-ENTITÉ (S1 et S2) =====
    // CDT 101V
    @Column(length = 1) private String cdt101vS1;
    @Column(length = 1) private String cdt101vS2;

    // CDT 102V
    @Column(length = 1) private String cdt102vS1;
    @Column(length = 1) private String cdt102vS2;

    // CDT OA OH OT
    @Column(length = 1) private String cdtOaS1;
    @Column(length = 1) private String cdtOaS2;

    // CDT 101LC
    @Column(length = 1) private String cdt101lcS1;
    @Column(length = 1) private String cdt101lcS2;

    // CDT 101SST
    @Column(length = 1) private String cdt101sstS1;
    @Column(length = 1) private String cdt101sstS2;

    // ===== OBSERVATIONS ET ACTIONS =====
    @Column(length = 500)
    private String observations;

    @Column(length = 500)
    private String actionsN2;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
