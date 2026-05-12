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
    private Map<Integer, Integer> entreesPrevu;   // semaine → joursPrevu
    private Map<Integer, Integer> entreesRealise; // semaine → joursConges
    private Integer totalPrevu;
    private Integer totalRealise;
    private Integer reliquat; // totalJoursDroits - totalRealise
}