package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SyntheseKN2Repository extends JpaRepository<SyntheseKN2Entry, Long> {
    Optional<SyntheseKN2Entry> findByEntiteCSPRAndAnneeAndSemestre(String e, Integer a, String s);
    List<SyntheseKN2Entry> findByAnneeAndSemestre(Integer a, String s);
    @Query("SELECT DISTINCT e.annee FROM SyntheseKN2Entry e ORDER BY e.annee DESC")
    List<Integer> findDistinctAnnees();
}
