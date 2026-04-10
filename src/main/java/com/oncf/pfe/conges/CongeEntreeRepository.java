package com.oncf.pfe.conges;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CongeEntreeRepository extends JpaRepository<CongeEntree, Long> {
    List<CongeEntree> findByCollaborateurIdAndAnneeOrderBySemaineAsc(Long collaborateurId, Integer annee);
    Optional<CongeEntree> findByCollaborateurIdAndAnneeAndSemaine(Long collaborateurId, Integer annee, Integer semaine);
    void deleteByCollaborateurIdAndAnnee(Long collaborateurId, Integer annee);
}