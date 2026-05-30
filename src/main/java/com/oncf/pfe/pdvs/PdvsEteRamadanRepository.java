package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PdvsEteRamadanRepository extends JpaRepository<PdvsEteRamadanEntry, Long> {

    List<PdvsEteRamadanEntry> findByEntiteCSPRAndAnneeAndPeriodeOrderByOrdreAsc(
        String entiteCSPR, Integer annee, String periode);

    List<PdvsEteRamadanEntry> findByAnneeAndPeriodeOrderByEntiteCSPRAscOrdreAsc(
        Integer annee, String periode);

    // CGPX — via entité CSPR superviseur
    List<PdvsEteRamadanEntry> findByEntiteCSPRAndAnneeAndPeriodeAndEntiteCSPRContainingOrderByOrdreAsc(
        String entiteCSPR, Integer annee, String periode, String entite);

    boolean existsByEntiteCSPRAndAnneeAndPeriode(String entiteCSPR, Integer annee, String periode);

    @Query("SELECT DISTINCT e.annee FROM PdvsEteRamadanEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    @Query("SELECT COALESCE(MAX(e.ordre),0) FROM PdvsEteRamadanEntry e " +
           "WHERE e.entiteCSPR=:entiteCSPR AND e.annee=:annee AND e.periode=:periode")
    Integer findMaxOrdre(String entiteCSPR, Integer annee, String periode);
}
