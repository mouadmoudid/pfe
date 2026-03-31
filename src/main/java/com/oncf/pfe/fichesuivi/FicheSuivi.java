package com.oncf.pfe.fichesuivi;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
@Entity
@Table(name = "fiche_suivi")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FicheSuivi {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collaborateur_id")
    private User collaborateur;

    // Lié à une tâche planning
    private Long planningTaskId;

    // Type : EXAMEN ou FORMATION
    private String type;

    // Résultat examen : FAVORABLE/DEFAVORABLE, APTE/INAPTE, BON/MAUVAIS
    private String resultat;

    // Observations
    private String observation;

    // Pour formations : origine de constatation
    private String origineConstatation;

    // Pour formations : actions réalisées/proposées
    private String actionsRealisees;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}