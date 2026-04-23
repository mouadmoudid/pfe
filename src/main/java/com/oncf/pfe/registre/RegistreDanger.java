package com.oncf.pfe.registre;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "registre_danger")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegistreDanger {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Année du registre (ex: 2024 = données 2019-2023)
    @Column(nullable = false)
    private Integer anneeRegistre;

    @Column(columnDefinition = "TEXT")
    private String danger;

    @Column(columnDefinition = "TEXT")
    private String causes;

    // Fréquences des 5 années (an1 = anneeRegistre-5, an5 = anneeRegistre-1)
    private Double an1; // ex: 2019
    private Double an2; // ex: 2020
    private Double an3; // ex: 2021
    private Double an4; // ex: 2022
    private Double an5; // ex: 2023

    // Calculés
    private Double somme;
    private Double freqMoy;
    private Integer cotationFrequence; // SI(Fréq.moy<1;1;SI(Fréq.moy<4;2;SI(Fréq.moy<12;3;4)))
    private Integer cotationGravite;   // 1-6, saisi manuellement
    private String criticite;          // C, E, M, F

    private String responsable;

    @Column(columnDefinition = "TEXT")
    private String mesuresEnVigueur;

    @Column(columnDefinition = "TEXT")
    private String actions;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void calculer() {
        // Somme
        double s = (an1 != null ? an1 : 0)
                 + (an2 != null ? an2 : 0)
                 + (an3 != null ? an3 : 0)
                 + (an4 != null ? an4 : 0)
                 + (an5 != null ? an5 : 0);
        this.somme = Math.round(s * 100.0) / 100.0;

        // Fréquence moyenne
        this.freqMoy = Math.round((s / 5.0) * 100.0) / 100.0;

        // Cotation fréquence : SI(Fréq.moy<1;1;SI(Fréq.moy<4;2;SI(Fréq.moy<12;3;4)))
        if (this.freqMoy < 1)       this.cotationFrequence = 1;
        else if (this.freqMoy < 4)  this.cotationFrequence = 2;
        else if (this.freqMoy < 12) this.cotationFrequence = 3;
        else                         this.cotationFrequence = 4;

        // Criticité = cotationFrequence * cotationGravite
        if (this.cotationFrequence != null && this.cotationGravite != null) {
            int score = this.cotationFrequence * this.cotationGravite;
            if (score >= 8)      this.criticite = "C"; // Critique
            else if (score >= 4) this.criticite = "E"; // Élevé
            else if (score >= 2) this.criticite = "M"; // Modéré
            else                 this.criticite = "F"; // Faible
        }
    }
}