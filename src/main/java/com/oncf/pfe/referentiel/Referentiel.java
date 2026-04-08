package com.oncf.pfe.referentiel;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "referentiels")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Referentiel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nom;

    private String description;

    @Column(columnDefinition = "bytea", nullable = false)
    private byte[] contenu;

    @Column(nullable = false)
    private String typeContenu;

    private Long taille;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
