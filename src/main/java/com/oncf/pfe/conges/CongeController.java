package com.oncf.pfe.conges;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/conges")
@RequiredArgsConstructor
public class CongeController {

    private final CongeService congeService;

    @GetMapping("/annees")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(congeService.getAnnees());
    }

    @GetMapping("/tableau")
    public ResponseEntity<List<CongeTableauResponse>> getTableau(
            @RequestParam Integer annee) {
        return ResponseEntity.ok(congeService.getTableau(annee));
    }

    @PostMapping("/config")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<CongeConfig> saveConfig(
            @RequestBody CongeConfigRequest req,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(congeService.saveConfig(req, user));
    }

    @PostMapping("/entree")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> saveEntree(
            @RequestBody CongeEntreeRequest req,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        congeService.saveEntree(req, user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/config/{collaborateurId}/{annee}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> deleteConfig(
            @PathVariable Long collaborateurId,
            @PathVariable Integer annee) {
        congeService.deleteConfig(collaborateurId, annee);
        return ResponseEntity.ok().build();
    }
}