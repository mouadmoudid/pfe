package com.oncf.pfe.referentiel;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferentielResponse {
    private Long id;
    private String nom;
    private String description;
    private Long taille;
    private String typeContenu;
    private String createdByName;
    private LocalDateTime createdAt;
}
