package com.oncf.pfe.questionnaire;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/questionnaire")
@RequiredArgsConstructor
public class QuestionnaireController {

    private final QuestionnaireRepository repo;
    private final QuestionnaireService service;
    private final QuestionnaireCampagneRepository campagneRepo;

    // ===== CAMPAGNES =====

    // Liste toutes les campagnes
    // ADMIN/CGPX voient tout, autres voient OUVERT uniquement
    @GetMapping("/campagnes")
    public ResponseEntity<List<QuestionnaireCampagne>> getCampagnes(Authentication auth) {
        User user = (User) auth.getPrincipal();
        String role = user.getRole() != null ? user.getRole().name() : "";
        if (role.equals("ADMIN") || role.equals("CGPX") || 
                role.equals("CSPR") || role.equals("CET")) {
                return ResponseEntity.ok(campagneRepo.findAllByOrderByExerciceDesc());
            }
        return ResponseEntity.ok(campagneRepo.findByStatutOrderByExerciceDesc("OUVERT"));
    }

    // Créer une nouvelle campagne — ADMIN/CGPX uniquement
    @PostMapping("/campagnes")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<QuestionnaireCampagne> createCampagne(
            @RequestBody QuestionnaireCampagne campagne,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        campagne.setCreatedBy(user);
        if (campagne.getStatut() == null) campagne.setStatut("FERME");
        return ResponseEntity.ok(campagneRepo.save(campagne));
    }

    // Ouvrir ou fermer une campagne — ADMIN/CGPX uniquement
    @PatchMapping("/campagnes/{id}/statut")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<QuestionnaireCampagne> updateStatut(
            @PathVariable Long id,
            @RequestParam String statut) {
        return campagneRepo.findById(id).map(c -> {
            c.setStatut(statut);
            return ResponseEntity.ok(campagneRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Supprimer une campagne — ADMIN/CGPX uniquement
    @DeleteMapping("/campagnes/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> deleteCampagne(@PathVariable Long id) {
        campagneRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ===== RÉPONSES =====

    // Soumettre une réponse — seulement si campagne OUVERTE
    @PostMapping
    public ResponseEntity<?> submit(@RequestBody QuestionnaireReponse reponse) {
        return campagneRepo.findByExercice(reponse.getExercice())
            .map(c -> {
                if (!"OUVERT".equals(c.getStatut())) {
                    return ResponseEntity.badRequest().body("Cette campagne est fermée");
                }
                return ResponseEntity.ok((Object) repo.save(reponse));
            })
            .orElse(ResponseEntity.badRequest().body("Campagne introuvable pour cet exercice"));
    }

    // Résultats agrégés — ADMIN/CGPX/CSPR/CET
    @GetMapping("/resultats")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<Map<String, Object>> getResultats(@RequestParam Integer exercice) {
        return ResponseEntity.ok(service.getResultats(exercice));
    }

    // Nombre de réponses pour un exercice
    @GetMapping("/count")
    public ResponseEntity<Long> getCount(@RequestParam Integer exercice) {
        return ResponseEntity.ok(repo.countByExercice(exercice));
    }
}