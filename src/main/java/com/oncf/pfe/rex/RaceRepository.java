package com.oncf.pfe.rex;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RaceRepository extends JpaRepository<Race, Long> {
    List<Race> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
    List<Race> findAllByOrderByCreatedAtDesc();
}