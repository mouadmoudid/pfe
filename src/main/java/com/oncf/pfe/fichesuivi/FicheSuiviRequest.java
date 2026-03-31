package com.oncf.pfe.fichesuivi;

import lombok.Data;

@Data
public class FicheSuiviRequest {
    private Long collaborateurId;
    private Long planningTaskId;
    private String type;
    private String resultat;
    private String observation;
    private String origineConstatation;
    private String actionsRealisees;
}
