package com.oncf.pfe.referentiel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReferentielRepository extends JpaRepository<Referentiel, Long> {

    // Charge uniquement les métadonnées — exclut le champ contenu (bytea)
    @Query("""
        SELECT new com.oncf.pfe.referentiel.ReferentielResponse(
            r.id, r.nom, r.description, r.taille, r.typeContenu,
            COALESCE(cb.fullName, ''), r.createdAt
        )
        FROM Referentiel r LEFT JOIN r.createdBy cb
        ORDER BY r.createdAt DESC
        """)
    List<ReferentielResponse> findAllMetadata();
}
