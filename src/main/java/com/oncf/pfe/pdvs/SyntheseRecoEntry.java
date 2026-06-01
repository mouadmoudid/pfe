package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "synthese_reco")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyntheseRecoEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50) private String entiteCSPR;
    @Column(nullable = false)              private Integer annee;
    @Column(nullable = false, length = 2)  private String semestre;
    @Column(nullable = false)              private Integer ordre;

    @Column(columnDefinition = "TEXT") private String recommandation;
    @Column(length = 80)               private String destinataire;
    // Priorité : Haute / Moyenne / Basse
    @Column(length = 20)               private String priorite;
    @Column(length = 30)               private String echeance;
    @Column(columnDefinition = "TEXT") private String suivi;

    @Column(length = 100) private String saisiPar;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
