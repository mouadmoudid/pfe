package com.oncf.pfe.checklist.dto;

import com.oncf.pfe.checklist.CheckListType;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class CheckListRequest {
    private CheckListType type;
    private String siteUp;
    private LocalDate dateControle;
    private String reference;
    private String collaborateurNom;
    private String collaborateurMatricule;
    private String chantierNom;
    private String chantierType;
    private String observations;
    private List<CheckListItemDto> items;
}