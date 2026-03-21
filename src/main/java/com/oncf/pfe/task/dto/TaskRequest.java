package com.oncf.pfe.task.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TaskRequest {
    private String title;
    private String description;
    private String processus;
    private String documentRef;
    private Long assignedToId;
    private LocalDateTime dueDate;
}