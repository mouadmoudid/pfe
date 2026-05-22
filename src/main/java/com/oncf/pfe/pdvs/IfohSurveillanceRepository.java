package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IfohSurveillanceRepository extends JpaRepository<IfohSurveillanceEntry, Long> {

    List<IfohSurveillanceEntry> findByEntiteCSPRAndAnneeOrderByIndicateurNumAscCollaborateurNomAsc(
        String entiteCSPR, Integer annee);

    List<IfohSurveillanceEntry> findByAnneeOrderByEntiteCSPRAscIndicateurNumAscCollaborateurNomAsc(
        Integer annee);

    List<IfohSurveillanceEntry> findByCollaborateurEntiteAndAnneeOrderByIndicateurNumAsc(
        String collaborateurEntite, Integer annee);

    boolean existsByIndicateurNumAndCollaborateurMatriculeAndAnneeAndEntiteCSPR(
        Integer indicateurNum, String matricule, Integer annee, String entiteCSPR);

    @Query("SELECT DISTINCT e.annee FROM IfohSurveillanceEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();
}
