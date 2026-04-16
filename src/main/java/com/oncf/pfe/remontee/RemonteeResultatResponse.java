package com.oncf.pfe.remontee;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RemonteeResultatResponse {
    private Long id;
    private Integer exercice;
    private String dateReponse;
    private String problemesRencontres;
    private String commentairesCDT;
    private String solutionsProposees;
    // Pas de nom collaborateur — anonyme
}