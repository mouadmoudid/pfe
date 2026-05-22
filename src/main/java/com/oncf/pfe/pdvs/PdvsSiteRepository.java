package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PdvsSiteRepository extends JpaRepository<PdvsSiteEntry, Long> {

    // CGPX — son entité exacte
    List<PdvsSiteEntry> findByEntiteAndSemestreAndAnneeOrderBySiteAsc(
        String entite, String semestre, Integer annee);

    // CSPR — plusieurs entités (ses sous-entités)
    List<PdvsSiteEntry> findByEntiteInAndSemestreAndAnneeOrderByEntiteAscSiteAsc(
        List<String> entites, String semestre, Integer annee);

    // CET / ADMIN — tout
    List<PdvsSiteEntry> findBySemestreAndAnneeOrderByEntiteAscSiteAsc(
        String semestre, Integer annee);

    // Vérifier doublon
    boolean existsBySiteAndSemestreAndAnneeAndEntite(
        String site, String semestre, Integer annee, String entite);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM PdvsSiteEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();
}
