package com.oncf.pfe.conges;

import lombok.*;
import java.util.Map;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CongeTableauResponse {
    private Long collaborateurId;
    private String fullName;
    private String matricule;
    private String fonctionAssuree;
    private String telephone;
    private Integer totalJoursDroits;
    private Map<Integer, Integer> entrees; // semaine → joursConges
    private Integer totalPris;
    private Integer reliquat;
}