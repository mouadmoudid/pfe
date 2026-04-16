package com.oncf.pfe.remontee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RemonteeInfoRepository extends JpaRepository<RemonteeInfo, Long> {
    // Toutes les réponses d'un exercice (pour les chefs/admin)
    List<RemonteeInfo> findByExerciceOrderByCreatedAtDesc(Integer exercice);
    // Réponse d'un collaborateur pour un exercice (pour l'agent)
    Optional<RemonteeInfo> findByCollaborateurIdAndExercice(Long collaborateurId, Integer exercice);
    long countByExercice(Integer exercice);
}