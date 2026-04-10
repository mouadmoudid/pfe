package com.oncf.pfe.questionnaire;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "questionnaire_campagne", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"exercice"})
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class QuestionnaireCampagne {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer exercice;

    @Column(nullable = false)
    private String statut; // OUVERT ou FERME

    private String description;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}