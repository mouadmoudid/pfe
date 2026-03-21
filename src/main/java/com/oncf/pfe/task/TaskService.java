package com.oncf.pfe.task;

import com.oncf.pfe.task.dto.TaskRequest;
import com.oncf.pfe.task.dto.TaskResponse;
import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskResponse createTask(TaskRequest request, User manager) {
        User assignedTo = userRepository.findById(request.getAssignedToId())
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .processus(request.getProcessus())
                .documentRef(request.getDocumentRef())
                .assignedTo(assignedTo)
                .assignedBy(manager)
                .dueDate(request.getDueDate())
                .build();

        return toResponse(taskRepository.save(task));
    }

    public List<TaskResponse> getMyTasks(User user) {
        return taskRepository.findByAssignedToId(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public List<TaskResponse> getAssignedTasks(User manager) {
        return taskRepository.findByAssignedById(manager.getId())
                .stream().map(this::toResponse).toList();
    }

    public List<User> getAgents() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole().name().equals("AGENT"))
                .toList();
    }

    public TaskResponse updateStatus(Long taskId, TaskStatus status, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Tâche non trouvée"));
        task.setStatus(status);
        return toResponse(taskRepository.save(task));
    }

    private TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .processus(task.getProcessus())
                .documentRef(task.getDocumentRef())
                .status(task.getStatus())
                .assignedToName(task.getAssignedTo() != null ? task.getAssignedTo().getFullName() : null)
                .assignedToEmail(task.getAssignedTo() != null ? task.getAssignedTo().getEmail() : null)
                .assignedByName(task.getAssignedBy() != null ? task.getAssignedBy().getFullName() : null)
                .createdAt(task.getCreatedAt())
                .dueDate(task.getDueDate())
                .build();
    }
}