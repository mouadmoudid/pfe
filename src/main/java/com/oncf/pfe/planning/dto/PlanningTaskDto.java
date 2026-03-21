package com.oncf.pfe.planning.dto;

import com.oncf.pfe.planning.PlanningCategory;
import com.oncf.pfe.planning.PlanningStatus;
import lombok.Data;
import java.time.LocalDate;

@Data
public class PlanningTaskDto {
    private String title;
    private String parentTitle;
    private PlanningCategory category;
    private String matricule;
    private Integer duree;
    private LocalDate datePrevue;
    private LocalDate dateRealisation;
    private Integer pourcentageAcheve;
    private String cotation;
    private String details;
    private Integer semaine;
    private Integer annee;
    private Long assignedToId;
    private PlanningStatus status;
}