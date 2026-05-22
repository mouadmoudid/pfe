package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ControleMgmtRepository extends JpaRepository<ControleMgmtEntry, Long> {

    // CSPR — son entité
    List<ControleMgmtEntry> findByEntiteCSPRAndAnneeOrderByOrdreAsc(
        String entiteCSPR, Integer annee);

    // CET / ADMIN — toutes entités
    List<ControleMgmtEntry> findByAnneeOrderByEntiteCSPRAscOrdreAsc(Integer annee);

    // CGPX — via entité CSPR superviseur
    boolean existsByEntiteCSPRAndAnnee(String entiteCSPR, Integer annee);

    @Query("SELECT DISTINCT e.annee FROM ControleMgmtEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    @Query("SELECT COALESCE(MAX(e.ordre), 0) FROM ControleMgmtEntry e " +
           "WHERE e.entiteCSPR = :entiteCSPR AND e.annee = :annee")
    Integer findMaxOrdre(String entiteCSPR, Integer annee);
}
