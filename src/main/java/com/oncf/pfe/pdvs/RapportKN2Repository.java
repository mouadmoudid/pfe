package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RapportKN2Repository extends JpaRepository<RapportKN2Entry, Long> {
    List<RapportKN2Entry> findByEntiteCSPROrderByDateRapportDesc(String entiteCSPR);
    List<RapportKN2Entry> findByEntiteCSPRAndCdtControleOrderByDateRapportDesc(String e, String cdt);
    List<RapportKN2Entry> findAllByOrderByDateRapportDesc();
    @Query("SELECT DISTINCT YEAR(r.dateRapport) FROM RapportKN2Entry r ORDER BY YEAR(r.dateRapport) DESC")
    List<Integer> findDistinctAnnees();
}
