package com.oncf.pfe.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedToId(Long userId);
    List<Task> findByAssignedById(Long managerId);
    List<Task> findByProcessus(String processus);
}