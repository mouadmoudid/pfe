package com.oncf.pfe.rex;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RexRepository extends JpaRepository<Rex, Long> {
    List<Rex> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
    List<Rex> findAllByOrderByCreatedAtDesc();
}