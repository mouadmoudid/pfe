package com.oncf.pfe.planning;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_tasks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanningTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String parentTitle;

    @Enumerated(EnumType.STRING)
    private PlanningCategory category;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PlanningStatus status = PlanningStatus.PLANIFIE;

    private String matricule;
    private Integer duree;
    private LocalDate datePrevue;
    private LocalDate dateRealisation;

    @Builder.Default
    private Integer pourcentageAcheve = 0;

    private String cotation;

    @Column(columnDefinition = "TEXT")
    private String details;

    private Integer semaine;
    private Integer annee;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}