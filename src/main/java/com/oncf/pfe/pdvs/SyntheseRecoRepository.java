package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SyntheseRecoRepository extends JpaRepository<SyntheseRecoEntry, Long> {
    List<SyntheseRecoEntry> findByEntiteCSPRAndAnneeAndSemestreOrderByOrdreAsc(String e, Integer a, String s);
    @Query("SELECT COALESCE(MAX(r.ordre),0) FROM SyntheseRecoEntry r WHERE r.entiteCSPR=:e AND r.annee=:a AND r.semestre=:s")
    Integer findMaxOrdre(String e, Integer a, String s);
}
