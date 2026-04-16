package com.oncf.pfe.remontee;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/remontee")
@RequiredArgsConstructor
public class RemonteeController {

    private final RemonteeInfoRepository infoRepo;
    private final RemonteeCampagneRepository campagneRepo;

    private boolean isManager(String role) {
        return role.equals("ADMIN") || role.equals("CPGX") ||
               role.equals("CSPR") || role.equals("CET");
    }

    // ===== CAMPAGNES =====

    @GetMapping("/campagnes")
    public ResponseEntity<List<RemonteeCampagne>> getCampagnes(Authentication auth) {
        User user = (User) auth.getPrincipal();
        String role = user.getRole() != null ? user.getRole().name() : "";
        if (isManager(role)) {
            return ResponseEntity.ok(campagneRepo.findAllByOrderByExerciceDesc());
        }
        return ResponseEntity.ok(campagneRepo.findByStatutOrderByExerciceDesc("OUVERT"));
    }

    @PostMapping("/campagnes")
    public ResponseEntity<RemonteeCampagne> createCampagne(
            @RequestBody RemonteeCampagne campagne,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        campagne.setCreatedBy(user);
        if (campagne.getStatut() == null) campagne.setStatut("FERME");
        return ResponseEntity.ok(campagneRepo.save(campagne));
    }

    @PatchMapping("/campagnes/{id}/statut")
    public ResponseEntity<RemonteeCampagne> updateStatut(
            @PathVariable Long id,
            @RequestParam String statut) {
        return campagneRepo.findById(id).map(c -> {
            c.setStatut(statut);
            return ResponseEntity.ok(campagneRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/campagnes/{id}")
    public ResponseEntity<Void> deleteCampagne(@PathVariable Long id) {
        campagneRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ===== RÉPONSES =====

    // Soumettre ou modifier sa propre réponse
    @PostMapping
    public ResponseEntity<?> submit(
            @RequestBody RemonteeInfo info,
            Authentication auth) {
        User user = (User) auth.getPrincipal();

        Optional<RemonteeCampagne> campagne = campagneRepo.findByExercice(info.getExercice());
        if (campagne.isEmpty()) return ResponseEntity.badRequest().body("Campagne introuvable");
        if (!"OUVERT".equals(campagne.get().getStatut())) {
            return ResponseEntity.badRequest().body("Cette campagne est fermée");
        }

        // Créer ou mettre à jour la réponse de cet agent
        Optional<RemonteeInfo> existing = infoRepo.findByCollaborateurIdAndExercice(user.getId(), info.getExercice());
        RemonteeInfo toSave = existing.orElse(new RemonteeInfo());
        toSave.setCollaborateur(user);
        toSave.setExercice(info.getExercice());
        toSave.setDateReponse(info.getDateReponse());
        toSave.setProblemesRencontres(info.getProblemesRencontres());
        toSave.setCommentairesCDT(info.getCommentairesCDT());
        toSave.setSolutionsProposees(info.getSolutionsProposees());

        return ResponseEntity.ok(infoRepo.save(toSave));
    }

    // Ma propre réponse (pour l'agent)
    @GetMapping("/ma-reponse")
    public ResponseEntity<?> getMaReponse(
            @RequestParam Integer exercice,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(
            infoRepo.findByCollaborateurIdAndExercice(user.getId(), exercice)
                .orElse(null)
        );
    }

    // Résultats anonymisés — ADMIN/CPGX/CSPR/CET uniquement
    @GetMapping("/resultats")
    public ResponseEntity<List<RemonteeResultatResponse>> getResultats(
            @RequestParam Integer exercice,
            Authentication auth) {
        User user = (User) auth.getPrincipal();
        String role = user.getRole() != null ? user.getRole().name() : "";
        if (!isManager(role)) {
            return ResponseEntity.status(403).build();
        }
        List<RemonteeInfo> all = infoRepo.findByExerciceOrderByCreatedAtDesc(exercice);
        // Anonymiser : pas de nom, pas de matricule
        List<RemonteeResultatResponse> result = all.stream().map(r ->
            RemonteeResultatResponse.builder()
                .id(r.getId())
                .exercice(r.getExercice())
                .dateReponse(r.getDateReponse())
                .problemesRencontres(r.getProblemesRencontres())
                .commentairesCDT(r.getCommentairesCDT())
                .solutionsProposees(r.getSolutionsProposees())
                .build()
        ).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // Nombre de réponses
    @GetMapping("/count")
    public ResponseEntity<Long> getCount(@RequestParam Integer exercice) {
        return ResponseEntity.ok(infoRepo.countByExercice(exercice));
    }
}