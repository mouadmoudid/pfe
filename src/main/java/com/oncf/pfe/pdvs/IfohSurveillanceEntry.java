package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ifoh_surveillance_entry",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"indicateur_num","collaborateur_matricule","annee","entite_cspr"}))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class IfohSurveillanceEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private Integer annee;
    @Column(nullable = false, length = 50, name = "entite_cspr") private String entiteCSPR;
    @Column(nullable = false, name = "indicateur_num") private Integer indicateurNum;
    @Column(nullable = false, length = 10) private String categorie;
    @Column(nullable = false, length = 100) private String indicateur;
    @Column(length = 100) private String collaborateurNom;
    @Column(length = 20, name = "collaborateur_matricule") private String collaborateurMatricule;
    @Column(length = 50) private String collaborateurEntite;
    @Column(length = 1) private String presence; // O / N / null
    @Column private LocalDate dateDetection;
    @Column(length = 500) private String actions;
    @Column(length = 500) private String suivi;
    @Column(length = 100) private String saisiPar;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
