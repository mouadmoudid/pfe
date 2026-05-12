package com.oncf.pfe.conges;

import lombok.Data;

@Data
public class CongeEntreeRequest {
    private Long collaborateurId;
    private Integer annee;
    private Integer semaine;
    private String type; // "prevu" ou "realise"
    private Integer jours;
}