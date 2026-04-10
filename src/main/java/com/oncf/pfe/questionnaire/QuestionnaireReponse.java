package com.oncf.pfe.questionnaire;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "questionnaire_reponse")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class QuestionnaireReponse {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String dateReponse;    // Q1
    private Integer exercice;      // année

    // Axe 1 : Confiance et Engagement (Q2-Q7)
    private Integer q2; private Integer q3; private Integer q4;
    private Integer q5; private Integer q6; private Integer q7;

    // Axe 2 : Hiérarchie (Q8-Q13)
    private Integer q8; private Integer q9; private Integer q10;
    private Integer q11; private Integer q12; private Integer q13;

    // Axe 3 : Communication (Q14-Q17)
    private Integer q14; private Integer q15; private Integer q16; private Integer q17;

    // Axe 4 : Liberté d'expression (Q18-Q20)
    private Integer q18; private Integer q19; private Integer q20;

    // Axe 5 : Signalement des incidents (Q21-Q23)
    private Integer q21; private Integer q22; private Integer q23;

    // Axe 6 : Punition face aux erreurs (Q24-Q26)
    private Integer q24; private Integer q25; private Integer q26;

    // Axe 7 : Esprit d'équipe (Q27-Q30)
    private Integer q27; private Integer q28; private Integer q29; private Integer q30;

    // Axe 8 : Charge de travail (Q31-Q32)
    private Integer q31; private Integer q32;

    // Axe 9 : Amélioration continue (Q33-Q36)
    private Integer q33; private Integer q34; private Integer q35; private Integer q36;

    // Axe 10 : Fiche signalétique (Q37-Q41)
    private String q37; // Homme/Femme
    private String q38; // Tranche d'âge
    private String q39; // Fonction
    private String q40; // Ancienneté fonction
    private String q41; // Ancienneté entité

    // Q42 : Commentaire libre
    @Column(columnDefinition = "TEXT")
    private String q42;

    @CreationTimestamp
    private LocalDateTime createdAt;
}