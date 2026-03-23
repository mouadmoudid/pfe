package com.oncf.pfe.checklist;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CheckListItemRepository extends JpaRepository<CheckListItem, Long> {
    List<CheckListItem> findByCheckListId(Long checkListId);
    void deleteByCheckListId(Long checkListId);
}