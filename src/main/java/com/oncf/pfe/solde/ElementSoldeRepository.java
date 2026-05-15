package com.oncf.pfe.solde;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ElementSoldeRepository extends JpaRepository<ElementSolde, Long> {

    // Tous les éléments d'un mois/année pour une entité donnée (CGPX)
    List<ElementSolde> findByEntiteAndMoisAndAnneeOrderByNomAsc(
        String entite, Integer mois, Integer annee);

    // Plusieurs entités (CSPR voit ses sous-entités)
    List<ElementSolde> findByEntiteInAndMoisAndAnneeOrderByEntiteAscNomAsc(
        List<String> entites, Integer mois, Integer annee);

    // Tous pour un mois/année (CET et ADMIN)
    List<ElementSolde> findByMoisAndAnneeOrderByEntiteAscNomAsc(
        Integer mois, Integer annee);

    // Un collaborateur spécifique (AGENT voit sa propre ligne)
    Optional<ElementSolde> findByMatriculeAndMoisAndAnnee(
        String matricule, Integer mois, Integer annee);

    // Années disponibles
    @Query("SELECT DISTINCT e.annee FROM ElementSolde e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();

    // Mois disponibles pour une année
    @Query("SELECT DISTINCT e.mois FROM ElementSolde e WHERE e.annee = :annee ORDER BY e.mois")
    List<Integer> findDistinctMoisByAnnee(@Param("annee") Integer annee);

    // Vérifier doublon (par nom+prénom, sans matricule obligatoire)
    boolean existsByNomAndPrenomAndMoisAndAnneeAndEntite(
        String nom, String prenom, Integer mois, Integer annee, String entite);
}
