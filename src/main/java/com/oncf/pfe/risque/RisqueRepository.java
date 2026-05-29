package com.oncf.pfe.risque;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RisqueRepository extends JpaRepository<RisqueEntry, Long> {

    List<RisqueEntry> findAllByOrderByFacteurAscDangerAsc();

    List<RisqueEntry> findByEntiteInOrderByFacteurAscDangerAsc(List<String> entites);

    List<RisqueEntry> findByCriticiteOrderByFacteurAsc(String criticite);

    List<RisqueEntry> findByCriticiteAndEntiteInOrderByFacteurAsc(String criticite, List<String> entites);

    List<RisqueEntry> findByFacteurContainingIgnoreCaseOrDangerContainingIgnoreCaseOrRisqueContainingIgnoreCase(
        String facteur, String danger, String risque);

    @Query("SELECT r FROM RisqueEntry r WHERE r.entite IN :entites AND " +
           "(LOWER(r.facteur) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(r.danger)   LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(r.risque)   LIKE LOWER(CONCAT('%',:q,'%')))")
    List<RisqueEntry> searchInEntites(
        @Param("entites") List<String> entites, @Param("q") String q);
}
