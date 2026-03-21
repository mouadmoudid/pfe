package com.oncf.pfe.checklist;

import com.oncf.pfe.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "checklists")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private CheckListType type;

    // Champs communs
    private String siteUp;
    private LocalDate dateControle;
    private String reference;

    // Champs Check List Collaborateur
    private String collaborateurNom;
    private String collaborateurMatricule;

    // Champs Check List Chantier
    private String chantierNom;
    private String chantierType;

    @Column(columnDefinition = "TEXT")
    private String observations;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private CheckListStatus status = CheckListStatus.BROUILLON;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @OneToMany(mappedBy = "checkList", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CheckListItem> items;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}