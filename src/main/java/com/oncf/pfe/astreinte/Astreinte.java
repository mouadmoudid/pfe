package com.oncf.pfe.astreinte;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "astreinte", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"collaborateur_id", "annee", "semaine"})
})
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Astreinte {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "collaborateur_id", nullable = false)
    private User collaborateur;

    @Column(nullable = false)
    private Integer annee;

    @Column(nullable = false)
    private Integer semaine;

    // true = en astreinte cette semaine
    @Column(nullable = false)
    private Boolean enAstreinte;

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