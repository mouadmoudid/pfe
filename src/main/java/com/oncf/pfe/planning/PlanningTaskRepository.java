package com.oncf.pfe.planning;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlanningTaskRepository extends JpaRepository<PlanningTask, Long> {
    List<PlanningTask> findByAnnee(Integer annee);
    List<PlanningTask> findByCategory(PlanningCategory category);
    List<PlanningTask> findByAssignedToId(Long userId);
    List<PlanningTask> findByAnneeAndSemaineBetween(Integer annee, Integer semaineDebut, Integer semaineFin);
    List<PlanningTask> findByCreatedById(Long userId);
}