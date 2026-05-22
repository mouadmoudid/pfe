package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_kn2_entry",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"objet", "ct_entite", "annee", "entite_cspr"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PlanningKN2Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== PÉRIODE =====
    @Column(nullable = false)
    private Integer annee;

    // ===== ENTITÉ DU CSPR =====
    @Column(nullable = false, length = 50, name = "entite_cspr")
    private String entiteCSPR;          // Ex: "CT Voie", "CT CSS"

    // ===== IDENTIFICATION DE LA LIGNE =====
    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false, length = 200)
    private String objet;               // Ex: "KN2 trimestriel CDT"

    @Column(nullable = false, length = 50, name = "ct_entite")
    private String ctEntite;            // Ex: "DT 102V", "Tous DT"

    @Column(nullable = false, length = 10)
    private String type;                // CDT / KN1 / MGMT / TECH

    // ===== MOIS M1 → M12 : P / R / PR / "" =====
    @Column(length = 2) private String m1;
    @Column(length = 2) private String m2;
    @Column(length = 2) private String m3;
    @Column(length = 2) private String m4;
    @Column(length = 2) private String m5;
    @Column(length = 2) private String m6;
    @Column(length = 2) private String m7;
    @Column(length = 2) private String m8;
    @Column(length = 2) private String m9;
    @Column(length = 2) private String m10;
    @Column(length = 2) private String m11;
    @Column(length = 2) private String m12;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
