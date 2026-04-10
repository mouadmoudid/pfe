package com.oncf.pfe.questionnaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionnaireRepository extends JpaRepository<QuestionnaireReponse, Long> {

    List<QuestionnaireReponse> findByExerciceOrderByCreatedAtDesc(Integer exercice);

    @Query("SELECT DISTINCT q.exercice FROM QuestionnaireReponse q ORDER BY q.exercice DESC")
    List<Integer> findDistinctExercices();

    long countByExercice(Integer exercice);
}