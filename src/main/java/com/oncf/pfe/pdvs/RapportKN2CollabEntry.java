package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rapport_kn2_collab")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RapportKN2CollabEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rapport_id", nullable = false)
    private RapportKN2Entry rapport;

    private Integer ordre;

    // Auto depuis PDVS Collab
    @Column(length = 100) private String collabNom;
    @Column(length = 50)  private String procedure;
    @Column(length = 5)   private String cotationSAMI;  // S|A|M|I

    // Manuel terrain
    @Column(columnDefinition = "TEXT") private String constatations;
    @Column(length = 20)               private String nature; // M|I|Obs
}
