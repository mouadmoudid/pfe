package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JournalCSSPrRepository extends JpaRepository<JournalCSSPrEntry, Long> {

    // CSPR — son entité
    List<JournalCSSPrEntry> findByEntiteCSPRAndAnneeOrderByOrdreAsc(
        String entiteCSPR, Integer annee);

    // CET / ADMIN — toutes entités
    List<JournalCSSPrEntry> findByAnneeOrderByEntiteCSPRAscOrdreAsc(Integer annee);

    // CGPX — via entité CSPR superviseur
    List<JournalCSSPrEntry> findByEntiteCSPRAndAnneeAndStatutOrderByOrdreAsc(
        String entiteCSPR, Integer annee, String statut);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM JournalCSSPrEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    // Max ordre
    @Query("SELECT COALESCE(MAX(e.ordre), 0) FROM JournalCSSPrEntry e " +
           "WHERE e.entiteCSPR = :entiteCSPR AND e.annee = :annee")
    Integer findMaxOrdre(String entiteCSPR, Integer annee);

    // Compter par statut
    @Query("SELECT e.statut, COUNT(e) FROM JournalCSSPrEntry e " +
           "WHERE e.entiteCSPR = :entiteCSPR AND e.annee = :annee " +
           "GROUP BY e.statut")
    List<Object[]> countByStatut(String entiteCSPR, Integer annee);
}
