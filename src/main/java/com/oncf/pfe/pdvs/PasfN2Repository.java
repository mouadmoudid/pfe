package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PasfN2Repository extends JpaRepository<PasfN2Entry, Long> {

    List<PasfN2Entry> findByEntiteCSPRAndAnneeOrderByOrdreAsc(String entiteCSPR, Integer annee);
    List<PasfN2Entry> findByAnneeOrderByEntiteCSPRAscOrdreAsc(Integer annee);
    boolean existsByEntiteCSPRAndAnnee(String entiteCSPR, Integer annee);

    @Query("SELECT DISTINCT e.annee FROM PasfN2Entry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    @Query("SELECT COALESCE(MAX(e.ordre),0) FROM PasfN2Entry e WHERE e.entiteCSPR=:entiteCSPR AND e.annee=:annee")
    Integer findMaxOrdre(String entiteCSPR, Integer annee);
}
