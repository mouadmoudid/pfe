package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rapport_kn2_doc")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RapportKN2DocEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rapport_id", nullable = false)
    private RapportKN2Entry rapport;

    private Integer ordre;

    @Column(length = 150) private String designation;
    @Column(length = 5)   private String existe;    // O|N
    @Column(length = 5)   private String aJour;     // O|N
    @Column(length = 5)   private String maitrisee; // O|N
    @Column(columnDefinition = "TEXT") private String actions;
}
