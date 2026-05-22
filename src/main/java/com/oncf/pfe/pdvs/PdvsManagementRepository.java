package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PdvsManagementRepository extends JpaRepository<PdvsManagementEntry, Long> {

    // Toutes les lignes d'un semestre/année/entité — triées par ordre
    List<PdvsManagementEntry> findByEntiteAndSemestreAndAnneeOrderByOrdreAsc(
        String entite, String semestre, Integer annee);

    // CET / ADMIN — toutes entités
    List<PdvsManagementEntry> findBySemestreAndAnneeOrderByEntiteAscOrdreAsc(
        String semestre, Integer annee);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM PdvsManagementEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    // Prochain ordre pour une entité/semestre/année
    @Query("SELECT COALESCE(MAX(e.ordre), 0) FROM PdvsManagementEntry e " +
           "WHERE e.entite = :entite AND e.semestre = :semestre AND e.annee = :annee")
    Integer findMaxOrdre(String entite, String semestre, Integer annee);

    // Vérifier si des lignes existent déjà (pour initialisation)
    boolean existsByEntiteAndSemestreAndAnnee(
        String entite, String semestre, Integer annee);
}
