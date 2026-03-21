package com.oncf.pfe.checklist.dto;

import com.oncf.pfe.checklist.CheckListStatus;
import com.oncf.pfe.checklist.CheckListType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CheckListResponse {
    private Long id;
    private CheckListType type;
    private String siteUp;
    private LocalDate dateControle;
    private String reference;
    private String collaborateurNom;
    private String collaborateurMatricule;
    private String chantierNom;
    private String chantierType;
    private String observations;
    private CheckListStatus status;
    private String createdByName;
    private LocalDateTime createdAt;
    private List<CheckListItemDto> items;
}