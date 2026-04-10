package com.oncf.pfe.astreinte;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AstreinteRepository extends JpaRepository<Astreinte, Long> {

    List<Astreinte> findByAnneeOrderBySemaineAscCollaborateurFullNameAsc(Integer annee);

    List<Astreinte> findByAnneeAndSemaineAndEnAstreinteTrue(Integer annee, Integer semaine);

    Optional<Astreinte> findByCollaborateurIdAndAnneeAndSemaine(Long collaborateurId, Integer annee, Integer semaine);

    @Query("SELECT DISTINCT a.annee FROM Astreinte a ORDER BY a.annee DESC")
    List<Integer> findDistinctAnnees();

    List<Astreinte> findByCollaborateurIdAndAnneeOrderBySemaineAsc(Long collaborateurId, Integer annee);
}