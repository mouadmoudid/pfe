package com.oncf.pfe.checklist;

import com.oncf.pfe.checklist.dto.CheckListRequest;
import com.oncf.pfe.checklist.dto.CheckListResponse;
import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/checklists")
@RequiredArgsConstructor
public class CheckListController {

    private final CheckListService checkListService;

    @PostMapping
    public ResponseEntity<CheckListResponse> create(
            @RequestBody CheckListRequest request,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(checkListService.createCheckList(request, user));
    }

    @GetMapping
    public ResponseEntity<List<CheckListResponse>> getAll() {
        return ResponseEntity.ok(checkListService.getAllCheckLists());
    }

    @GetMapping("/my")
    public ResponseEntity<List<CheckListResponse>> getMy(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(checkListService.getMyCheckLists(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CheckListResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(checkListService.getById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CheckListResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam CheckListStatus status) {
        return ResponseEntity.ok(checkListService.updateStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteChecklist(@PathVariable Long id, Authentication auth) {
        User user = (User) auth.getPrincipal();
        checkListService.deleteCheckList(id, user);
        return ResponseEntity.ok("Check list supprimée");
    }

    @GetMapping("/raci")
    public ResponseEntity<List<CheckListResponse>> getRaciData(
            @RequestParam int annee,
            @RequestParam int mois) {
        
        List<CheckListResponse> all = checkListService.getAllCheckLists();
        
        return ResponseEntity.ok(
            all.stream()
                .filter(cl -> {
                    if (cl.getDateControle() == null) return false;
                    return cl.getDateControle().getYear() == annee &&
                        cl.getDateControle().getMonthValue() == mois;
                })
                .toList()
        );
    }

    @GetMapping("/{id}/collaborateur-info")
    public ResponseEntity<Map<String, String>> getCollaborateurInfo(@PathVariable Long id) {
        CheckListResponse cl = checkListService.getById(id);
        Map<String, String> info = new java.util.HashMap<>();
        info.put("nom", cl.getCollaborateurNom() != null ? cl.getCollaborateurNom() : cl.getChantierNom());
        info.put("matricule", cl.getCollaborateurMatricule() != null ? cl.getCollaborateurMatricule() : "");
        info.put("siteUp", cl.getSiteUp() != null ? cl.getSiteUp() : "");
        info.put("dateControle", cl.getDateControle() != null ? cl.getDateControle().toString() : "");
        info.put("type", cl.getType() != null ? cl.getType().toString() : "");
        info.put("createdBy", cl.getCreatedByName() != null ? cl.getCreatedByName() : "");
        return ResponseEntity.ok(info);
    }
}