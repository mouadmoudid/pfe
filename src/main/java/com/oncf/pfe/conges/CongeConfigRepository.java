package com.oncf.pfe.conges;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CongeConfigRepository extends JpaRepository<CongeConfig, Long> {
    List<CongeConfig> findByAnneeOrderByCollaborateurFullNameAsc(Integer annee);
    Optional<CongeConfig> findByCollaborateurIdAndAnnee(Long collaborateurId, Integer annee);

    @Query("SELECT DISTINCT c.annee FROM CongeConfig c ORDER BY c.annee DESC")
    List<Integer> findDistinctAnnees();
}