package com.oncf.pfe.fichesuivi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FicheSuiviRepository extends JpaRepository<FicheSuivi, Long> {
    List<FicheSuivi> findByCollaborateurId(Long collaborateurId);
    Optional<FicheSuivi> findByCollaborateurIdAndPlanningTaskId(Long collaborateurId, Long planningTaskId);
}