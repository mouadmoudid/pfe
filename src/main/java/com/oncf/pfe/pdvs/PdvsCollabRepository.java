package com.oncf.pfe.pdvs;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PdvsCollabRepository extends JpaRepository<PdvsCollabEntry, Long> {

    // CGPX — son entité exacte uniquement (mais CSPR crée, pas CGPX)
    List<PdvsCollabEntry> findByEntiteAndSemestreAndAnneeOrderByCollaborateurNomAsc(
        String entite, String semestre, Integer annee);

    // CSPR "CT Voie" → ses sous-entités (CDT 101V, CDT 102V, CDT OA OH OT)
    List<PdvsCollabEntry> findByEntiteInAndSemestreAndAnneeOrderByEntiteAscCollaborateurNomAsc(
        List<String> entites, String semestre, Integer annee);

    // CET "CAMI" et ADMIN → tout
    List<PdvsCollabEntry> findBySemestreAndAnneeOrderByEntiteAscCollaborateurNomAsc(
        String semestre, Integer annee);

    // Vérifier doublon
    boolean existsByMatriculeAndSemestreAndAnneeAndEntite(
        String matricule, String semestre, Integer annee, String entite);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM PdvsCollabEntry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    // Un seul enregistrement par clé unique
    Optional<PdvsCollabEntry> findByMatriculeAndSemestreAndAnneeAndEntite(
        String matricule, String semestre, Integer annee, String entite);
}
