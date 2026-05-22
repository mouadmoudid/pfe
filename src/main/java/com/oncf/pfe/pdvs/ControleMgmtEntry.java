package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "controle_mgmt_entry")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ControleMgmtEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ===== PÉRIODE =====
    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false, length = 50, name = "entite_cspr")
    private String entiteCSPR;          // Ex: "CT Voie", "CT CSS"

    // ===== THÈME =====
    @Column(nullable = false)
    private Integer ordre;

    @Column(nullable = false, length = 100)
    private String theme;

    @Column(length = 200)
    private String processus;

    // ===== COTATIONS PAR CDT — C1 et C2 =====
    // CDT 101V
    @Column(length = 1) private String cdt101vC1;
    @Column(length = 1) private String cdt101vC2;

    // CDT 102V
    @Column(length = 1) private String cdt102vC1;
    @Column(length = 1) private String cdt102vC2;

    // CDT OA OH OT
    @Column(length = 1) private String cdtOaC1;
    @Column(length = 1) private String cdtOaC2;

    // CDT 101LC
    @Column(length = 1) private String cdt101lcC1;
    @Column(length = 1) private String cdt101lcC2;

    // CDT 101SST
    @Column(length = 1) private String cdt101sstC1;
    @Column(length = 1) private String cdt101sstC2;

    // ===== ACTIONS =====
    @Column(length = 500)
    private String actions;

    // ===== MÉTADONNÉES =====
    @Column(length = 100)
    private String saisiPar;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
