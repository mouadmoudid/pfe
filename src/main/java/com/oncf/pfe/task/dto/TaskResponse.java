package com.oncf.pfe.task.dto;

import com.oncf.pfe.task.TaskStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private String processus;
    private String documentRef;
    private TaskStatus status;
    private String assignedToName;
    private String assignedToEmail;
    private String assignedByName;
    private LocalDateTime createdAt;
    private LocalDateTime dueDate;
}