package com.oncf.pfe.checklist;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CheckListRepository extends JpaRepository<CheckList, Long> {
    List<CheckList> findByCreatedById(Long userId);
    List<CheckList> findByType(CheckListType type);
    List<CheckList> findByCollaborateurMatricule(String matricule);
}