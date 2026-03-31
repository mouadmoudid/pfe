package com.oncf.pfe.fichesuivi;

import com.oncf.pfe.user.UserRepository;
import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/fiche-suivi")
@RequiredArgsConstructor
public class FicheSuiviController {

    private final FicheSuiviRepository ficheSuiviRepository;
    private final UserRepository userRepository;

    @GetMapping("/collaborateur/{collaborateurId}")
    public ResponseEntity<List<FicheSuivi>> getByCollaborateur(@PathVariable Long collaborateurId) {
        return ResponseEntity.ok(ficheSuiviRepository.findByCollaborateurId(collaborateurId));
    }

    @PostMapping
    public ResponseEntity<FicheSuivi> save(@RequestBody FicheSuiviRequest request) {
        // Vérifier si une fiche existe déjà pour cette tâche et ce collaborateur
        Optional<FicheSuivi> existing = ficheSuiviRepository
            .findByCollaborateurIdAndPlanningTaskId(
                request.getCollaborateurId(),
                request.getPlanningTaskId()
            );

        FicheSuivi fiche = existing.orElse(new FicheSuivi());
        User collaborateur = userRepository.findById(request.getCollaborateurId())
            .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));

        fiche.setCollaborateur(collaborateur);
        fiche.setPlanningTaskId(request.getPlanningTaskId());
        fiche.setType(request.getType());
        fiche.setResultat(request.getResultat());
        fiche.setObservation(request.getObservation());
        fiche.setOrigineConstatation(request.getOrigineConstatation());
        fiche.setActionsRealisees(request.getActionsRealisees());

        return ResponseEntity.ok(ficheSuiviRepository.save(fiche));
    }
}