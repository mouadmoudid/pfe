package com.oncf.pfe.checklist;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "checklist_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id")
    private CheckList checkList;

    private String section;
    private String sousSection;
    private String pointCle;

    @Enumerated(EnumType.STRING)
    private CotationValue cotation;

    @Enumerated(EnumType.STRING)
    private CotationValue moyenne;

    @Column(columnDefinition = "TEXT")
    private String constatation;

    @Column(columnDefinition = "TEXT")
    private String regularisation;

    private Integer ordre;
}