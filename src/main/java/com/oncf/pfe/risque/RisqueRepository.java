package com.oncf.pfe.risque;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RisqueRepository extends JpaRepository<RisqueEntry, Long> {
    List<RisqueEntry> findAllByOrderByFacteurAscDangerAsc();
    List<RisqueEntry> findByCriticiteOrderByFacteurAsc(String criticite);
    List<RisqueEntry> findByFacteurContainingIgnoreCaseOrDangerContainingIgnoreCaseOrRisqueContainingIgnoreCase(
        String facteur, String danger, String risque);
}