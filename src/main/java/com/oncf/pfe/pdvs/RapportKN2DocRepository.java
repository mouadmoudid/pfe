package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RapportKN2DocRepository extends JpaRepository<RapportKN2DocEntry, Long> {
    List<RapportKN2DocEntry> findByRapportIdOrderByOrdreAsc(Long rapportId);
    void deleteByRapportId(Long rapportId);
}
