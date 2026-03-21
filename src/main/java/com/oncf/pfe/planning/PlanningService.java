package com.oncf.pfe.planning;

import com.oncf.pfe.planning.dto.PlanningTaskDto;
import com.oncf.pfe.planning.dto.PlanningTaskResponse;
import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanningService {

    private final PlanningTaskRepository planningTaskRepository;
    private final UserRepository userRepository;

    public PlanningTaskResponse createTask(PlanningTaskDto request, User creator) {
        User assignedTo = null;
        if (request.getAssignedToId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToId()).orElse(null);
        }

        PlanningTask task = PlanningTask.builder()
                .title(request.getTitle())
                .parentTitle(request.getParentTitle())
                .category(request.getCategory())
                .matricule(request.getMatricule())
                .duree(request.getDuree())
                .datePrevue(request.getDatePrevue())
                .dateRealisation(request.getDateRealisation())
                .pourcentageAcheve(request.getPourcentageAcheve() != null ? request.getPourcentageAcheve() : 0)
                .cotation(request.getCotation())
                .details(request.getDetails())
                .semaine(request.getSemaine())
                .annee(request.getAnnee() != null ? request.getAnnee() : java.time.Year.now().getValue())
                .assignedTo(assignedTo)
                .createdBy(creator)
                .build();

        return toResponse(planningTaskRepository.save(task));
    }

    public List<PlanningTaskResponse> getAllByAnnee(Integer annee) {
        return planningTaskRepository.findByAnnee(annee)
                .stream().map(this::toResponse).toList();
    }

    public List<PlanningTaskResponse> getMyTasks(User user) {
        return planningTaskRepository.findByAssignedToId(user.getId())
                .stream().map(this::toResponse).toList();
    }

    public List<PlanningTaskResponse> getByCategory(PlanningCategory category) {
        return planningTaskRepository.findByCategory(category)
                .stream().map(this::toResponse).toList();
    }

    public PlanningTaskResponse updateTask(Long id, PlanningTaskDto request, User user) {
        PlanningTask task = planningTaskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tâche non trouvée"));

        if (request.getPourcentageAcheve() != null)
            task.setPourcentageAcheve(request.getPourcentageAcheve());
        if (request.getDateRealisation() != null)
            task.setDateRealisation(request.getDateRealisation());
        if (request.getStatus() != null)
            task.setStatus(request.getStatus());
        if (request.getCotation() != null)
            task.setCotation(request.getCotation());
        if (request.getDetails() != null)
            task.setDetails(request.getDetails());

        return toResponse(planningTaskRepository.save(task));
    }

    public void deleteTask(Long id) {
        planningTaskRepository.deleteById(id);
    }

    private PlanningTaskResponse toResponse(PlanningTask task) {
        return PlanningTaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .parentTitle(task.getParentTitle())
                .category(task.getCategory())
                .status(task.getStatus())
                .matricule(task.getMatricule())
                .duree(task.getDuree())
                .datePrevue(task.getDatePrevue())
                .dateRealisation(task.getDateRealisation())
                .pourcentageAcheve(task.getPourcentageAcheve())
                .cotation(task.getCotation())
                .details(task.getDetails())
                .semaine(task.getSemaine())
                .annee(task.getAnnee())
                .assignedToName(task.getAssignedTo() != null ? task.getAssignedTo().getFullName() : null)
                .assignedToEmail(task.getAssignedTo() != null ? task.getAssignedTo().getEmail() : null)
                .createdByName(task.getCreatedBy() != null ? task.getCreatedBy().getFullName() : null)
                .createdAt(task.getCreatedAt())
                .build();
    }
}