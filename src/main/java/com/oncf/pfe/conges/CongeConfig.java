package com.oncf.pfe.conges;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "conge_config", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"collaborateur_id", "annee"})
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CongeConfig {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collaborateur_id", nullable = false)
    private User collaborateur;

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false)
    private Integer totalJoursDroits;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}