package com.oncf.pfe.task;

import com.oncf.pfe.task.dto.TaskRequest;
import com.oncf.pfe.task.dto.TaskResponse;
import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserRepository userRepository;

    // Manager — créer une tâche
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(
            @RequestBody TaskRequest request,
            Authentication auth) {
        User manager = (User) auth.getPrincipal();
        return ResponseEntity.ok(taskService.createTask(request, manager));
    }

    // Agent — voir ses tâches
    @GetMapping("/my")
    public ResponseEntity<List<TaskResponse>> getMyTasks(Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(taskService.getMyTasks(user));
    }

    // Manager — voir les tâches qu'il a assignées
    @GetMapping("/assigned")
    public ResponseEntity<List<TaskResponse>> getAssignedTasks(Authentication auth) {
        User manager = (User) auth.getPrincipal();
        return ResponseEntity.ok(taskService.getAssignedTasks(manager));
    }

    // Voir tous les agents
    @GetMapping("/agents")
    public ResponseEntity<List<User>> getAgents() {
        return ResponseEntity.ok(taskService.getAgents());
    }

    // Agent — mettre à jour le statut d'une tâche
    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam TaskStatus status,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(taskService.updateStatus(id, status, user));
    }
}