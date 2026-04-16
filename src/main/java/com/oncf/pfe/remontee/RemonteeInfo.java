package com.oncf.pfe.remontee;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "remontee_info")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RemonteeInfo {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collaborateur_id", nullable = false)
    private User collaborateur;

    @Column(nullable = false)
    private Integer exercice;

    private String dateReponse;

    @Column(columnDefinition = "TEXT")
    private String problemesRencontres;

    @Column(columnDefinition = "TEXT")
    private String commentairesCDT;

    @Column(columnDefinition = "TEXT")
    private String solutionsProposees;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}