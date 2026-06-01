package com.oncf.pfe.pdvs;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "synthese_fragilite")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SyntheseFragiliteEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50) private String entiteCSPR;
    @Column(nullable = false)              private Integer annee;
    @Column(nullable = false, length = 2)  private String semestre;
    @Column(nullable = false)              private Integer ordre;

    // Domaine : Prof. / Socio. / Psycho. / Physio.
    @Column(length = 30)           private String domaine;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(length = 50)           private String cdt;
    // Gravité : Faible / Modérée / Élevée
    @Column(length = 20)           private String gravite;
    @Column(columnDefinition = "TEXT") private String action;
    @Column(length = 30)           private String echeance;

    @Column(length = 100) private String saisiPar;
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
