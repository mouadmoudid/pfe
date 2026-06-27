package com.oncf.pfe.pdvs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RapportKN2CollabRepository extends JpaRepository<RapportKN2CollabEntry, Long> {
    List<RapportKN2CollabEntry> findByRapportIdOrderByOrdreAsc(Long rapportId);
    void deleteByRapportId(Long rapportId);
}
