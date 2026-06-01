package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SyntheseFragiliteRepository extends JpaRepository<SyntheseFragiliteEntry, Long> {
    List<SyntheseFragiliteEntry> findByEntiteCSPRAndAnneeAndSemestreOrderByOrdreAsc(String e, Integer a, String s);
    @Query("SELECT COALESCE(MAX(f.ordre),0) FROM SyntheseFragiliteEntry f WHERE f.entiteCSPR=:e AND f.annee=:a AND f.semestre=:s")
    Integer findMaxOrdre(String e, Integer a, String s);
}
