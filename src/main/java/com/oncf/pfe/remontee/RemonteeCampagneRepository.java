package com.oncf.pfe.remontee;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RemonteeCampagneRepository extends JpaRepository<RemonteeCampagne, Long> {
    List<RemonteeCampagne> findAllByOrderByExerciceDesc();
    Optional<RemonteeCampagne> findByExercice(Integer exercice);
    List<RemonteeCampagne> findByStatutOrderByExerciceDesc(String statut);
}