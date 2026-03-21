package com.oncf.pfe.planning.dto;

import com.oncf.pfe.planning.PlanningCategory;
import com.oncf.pfe.planning.PlanningStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class PlanningTaskResponse {
    private Long id;
    private String title;
    private String parentTitle;
    private PlanningCategory category;
    private PlanningStatus status;
    private String matricule;
    private Integer duree;
    private LocalDate datePrevue;
    private LocalDate dateRealisation;
    private Integer pourcentageAcheve;
    private String cotation;
    private String details;
    private Integer semaine;
    private Integer annee;
    private String assignedToName;
    private String assignedToEmail;
    private String createdByName;
    private LocalDateTime createdAt;
}