package com.oncf.pfe.planning;

import com.oncf.pfe.planning.dto.PlanningTaskDto;
import com.oncf.pfe.planning.dto.PlanningTaskResponse;
import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Year;
import java.util.List;

@RestController
@RequestMapping("/api/planning")
@RequiredArgsConstructor
public class PlanningController {

    private final PlanningService planningService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<PlanningTaskResponse> createTask(
            @RequestBody PlanningTaskDto request,
            Authentication auth) {
        User creator = (User) auth.getPrincipal();
        return ResponseEntity.ok(planningService.createTask(request, creator));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<List<PlanningTaskResponse>> getAllByAnnee(
            @RequestParam(defaultValue = "0") Integer annee) {
        if (annee == 0) annee = Year.now().getValue();
        return ResponseEntity.ok(planningService.getAllByAnnee(annee));
    }

    @GetMapping("/my")
    public ResponseEntity<List<PlanningTaskResponse>> getMyTasks(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(planningService.getMyTasks(user));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<PlanningTaskResponse>> getByCategory(
            @PathVariable PlanningCategory category) {
        return ResponseEntity.ok(planningService.getByCategory(category));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<PlanningTaskResponse> updateTask(
            @PathVariable Long id,
            @RequestBody PlanningTaskDto request,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(planningService.updateTask(id, request, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<String> deleteTask(@PathVariable Long id) {
        planningService.deleteTask(id);
        return ResponseEntity.ok("Tâche supprimée");
    }

    @GetMapping("/rapport")
    public ResponseEntity<?> getRapportData(
            @RequestParam int annee,
            @RequestParam int mois) {
        return ResponseEntity.ok(planningService.getRapportData(annee, mois));
    }
}