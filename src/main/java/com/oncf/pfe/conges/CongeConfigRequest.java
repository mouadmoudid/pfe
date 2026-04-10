package com.oncf.pfe.conges;

import lombok.Data;

@Data
public class CongeConfigRequest {
    private Long collaborateurId;
    private Integer annee;
    private Integer totalJoursDroits;
}