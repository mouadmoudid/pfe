package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rapport_kn2_site")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RapportKN2SiteEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rapport_id", nullable = false)
    private RapportKN2Entry rapport;

    private Integer ordre;

    // Auto depuis PDVS Site
    @Column(length = 100)              private String lieu;
    @Column(columnDefinition = "TEXT") private String observations; // = obs PDVS Site
    @Column(columnDefinition = "TEXT") private String actionsN2;    // = action N2 PDVS Site

    // Manuel terrain
    @Column(length = 30) private String isKm;

    // Section 4 — Documentation (une ligne par doc)
}
