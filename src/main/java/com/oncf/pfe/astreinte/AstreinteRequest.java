package com.oncf.pfe.astreinte;

import lombok.Data;

@Data
public class AstreinteRequest {
    private Long collaborateurId;
    private Integer annee;
    private Integer semaine;
    private Boolean enAstreinte;
}