package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RapportKN2SiteRepository extends JpaRepository<RapportKN2SiteEntry, Long> {
    List<RapportKN2SiteEntry> findByRapportIdOrderByOrdreAsc(Long rapportId);
    void deleteByRapportId(Long rapportId);
}
