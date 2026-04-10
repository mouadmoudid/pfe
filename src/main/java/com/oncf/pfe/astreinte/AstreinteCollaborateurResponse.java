package com.oncf.pfe.astreinte;

import lombok.*;
import java.util.Set;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AstreinteCollaborateurResponse {
    private Long collaborateurId;
    private String fullName;
    private String matricule;
    private String fonctionAssuree;
    private String telephone;
    private String residence;
    private Set<Integer> semaines; // semaines où il est en astreinte
    private Integer totalAstreintes;
}