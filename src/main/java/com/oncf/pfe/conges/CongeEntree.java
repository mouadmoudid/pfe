package com.oncf.pfe.conges;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "conge_entree", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"collaborateur_id", "annee", "semaine"})
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CongeEntree {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collaborateur_id", nullable = false)
    private User collaborateur;

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false)
    private Integer semaine;

    @Column(nullable = false)
    private Integer joursConges;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
