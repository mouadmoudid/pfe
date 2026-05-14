package com.oncf.pfe.astreinte;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/astreinte")
@RequiredArgsConstructor
public class AstreinteController {

    private final AstreinteService astreinteService;

    @GetMapping("/annees")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(astreinteService.getAnnees());
    }

    @GetMapping("/planning")
    public ResponseEntity<List<AstreinteCollaborateurResponse>> getPlanning(
            @RequestParam Integer annee,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(astreinteService.getPlanningAnnee(annee, user));
    }

    @GetMapping("/semaine")
    public ResponseEntity<List<AstreinteCollaborateurResponse>> getSemaine(
            @RequestParam Integer annee,
            @RequestParam Integer semaine,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(astreinteService.getSemaine(annee, semaine, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> saveAstreinte(
            @RequestBody AstreinteRequest req,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        astreinteService.saveAstreinte(req, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/collaborateur/{collaborateurId}/annee/{annee}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> addCollaborateur(
            @PathVariable Long collaborateurId,
            @PathVariable Integer annee,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        astreinteService.addCollaborateurToAnnee(collaborateurId, annee, user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/collaborateur/{collaborateurId}/annee/{annee}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> removeCollaborateur(
            @PathVariable Long collaborateurId,
            @PathVariable Integer annee) {
        astreinteService.removeCollaborateur(collaborateurId, annee);
        return ResponseEntity.ok().build();
    }
}
