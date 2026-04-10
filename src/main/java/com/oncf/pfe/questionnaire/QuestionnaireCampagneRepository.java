package com.oncf.pfe.questionnaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionnaireCampagneRepository extends JpaRepository<QuestionnaireCampagne, Long> {
    List<QuestionnaireCampagne> findAllByOrderByExerciceDesc();
    Optional<QuestionnaireCampagne> findByExercice(Integer exercice);
    List<QuestionnaireCampagne> findByStatutOrderByExerciceDesc(String statut);
}