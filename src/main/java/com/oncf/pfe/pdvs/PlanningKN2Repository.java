package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PlanningKN2Repository extends JpaRepository<PlanningKN2Entry, Long> {

    // CSPR — son entité
    List<PlanningKN2Entry> findByEntiteCSPRAndAnneeOrderByOrdreAsc(
        String entiteCSPR, Integer annee);

    // CET / ADMIN — toutes entités
    List<PlanningKN2Entry> findByAnneeOrderByEntiteCSPRAscOrdreAsc(Integer annee);

    // Vérifier si déjà initialisé
    boolean existsByEntiteCSPRAndAnnee(String entiteCSPR, Integer annee);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM PlanningKN2Entry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    // Max ordre pour une entité/année
    @Query("SELECT COALESCE(MAX(e.ordre), 0) FROM PlanningKN2Entry e " +
           "WHERE e.entiteCSPR = :entiteCSPR AND e.annee = :annee")
    Integer findMaxOrdre(String entiteCSPR, Integer annee);
}
