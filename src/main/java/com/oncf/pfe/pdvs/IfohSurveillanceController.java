package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/ifoh-surveillance")
@RequiredArgsConstructor
public class IfohSurveillanceController {

    private final IfohSurveillanceRepository repo;

    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // 22 indicateurs fixes
    private static final List<Map<String, String>> INDICATEURS = List.of(
        Map.of("num","1","cat","Prof.","ind","Erreurs répétées"),
        Map.of("num","2","cat","Prof.","ind","Démotivation"),
        Map.of("num","3","cat","Prof.","ind","Distraction"),
        Map.of("num","4","cat","Prof.","ind","Émotivité"),
        Map.of("num","5","cat","Socio.","ind","Maladie proche"),
        Map.of("num","6","cat","Socio.","ind","Maladie collab."),
        Map.of("num","7","cat","Socio.","ind","Deuil"),
        Map.of("num","8","cat","Socio.","ind","Séparation"),
        Map.of("num","9","cat","Socio.","ind","Mariage"),
        Map.of("num","10","cat","Socio.","ind","Problème matériel"),
        Map.of("num","11","cat","Socio.","ind","Navette"),
        Map.of("num","12","cat","Psycho.","ind","Isolement"),
        Map.of("num","13","cat","Psycho.","ind","Contact inhabit."),
        Map.of("num","14","cat","Psycho.","ind","Incohérence"),
        Map.of("num","15","cat","Psycho.","ind","Alcool"),
        Map.of("num","16","cat","Psycho.","ind","Drogue"),
        Map.of("num","17","cat","Psycho.","ind","Activité extra-pro"),
        Map.of("num","18","cat","Physio.","ind","Fatigabilité"),
        Map.of("num","19","cat","Physio.","ind","Variation poids"),
        Map.of("num","20","cat","Physio.","ind","Intempérance"),
        Map.of("num","21","cat","Physio.","ind","Patho. psy."),
        Map.of("num","22","cat","Physio.","ind","Patho. neuro.")
    );

    // ── GET ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<IfohSurveillanceEntry>> getAll(
            @RequestParam Integer annee, Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<IfohSurveillanceEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeOrderByEntiteCSPRAscIndicateurNumAscCollaborateurNomAsc(annee);
                break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeOrderByIndicateurNumAscCollaborateurNomAsc(entite, annee);
                break;
            case "CGPX":
                data = repo.findByCollaborateurEntiteAndAnneeOrderByIndicateurNumAsc(entite, annee);
                break;
            default:
                return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(data);
    }

    // ── GET indicateurs fixes ──
    @GetMapping("/indicateurs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, String>>> getIndicateurs() {
        return ResponseEntity.ok(INDICATEURS);
    }

    // ── GET années ──
    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // ── POST — ajouter une évaluation ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody IfohSurveillanceEntry entry, Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);

        // Vérifier doublon
        if (repo.existsByIndicateurNumAndCollaborateurMatriculeAndAnneeAndEntiteCSPR(
                entry.getIndicateurNum(), entry.getCollaborateurMatricule(),
                entry.getAnnee(), entry.getEntiteCSPR())) {
            return ResponseEntity.badRequest()
                .body("Cet indicateur est déjà enregistré pour ce collaborateur cette année.");
        }

        // Remplir catégorie et indicateur depuis la liste fixe
        INDICATEURS.stream()
            .filter(i -> i.get("num").equals(String.valueOf(entry.getIndicateurNum())))
            .findFirst()
            .ifPresent(i -> {
                entry.setCategorie(i.get("cat"));
                entry.setIndicateur(i.get("ind"));
            });

        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody IfohSurveillanceEntry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<IfohSurveillanceEntry>build();

            e.setPresence(body.getPresence());
            e.setDateDetection(body.getDateDetection());
            e.setActions(body.getActions());
            e.setSuivi(body.getSuivi());
            e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE — CSPR et ADMIN ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id, Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private String findCSPRForCGPX(String entiteCGPX) {
        for (Map.Entry<String, List<String>> e : CSPR_SOUS_ENTITES.entrySet())
            if (e.getValue().contains(entiteCGPX)) return e.getKey();
        return null;
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(a -> a.getAuthority().replace("ROLE_", ""))
            .findFirst().orElse("");
    }

    private String getEntite(Authentication auth) {
        try { return (String) auth.getPrincipal()
            .getClass().getMethod("getEntite").invoke(auth.getPrincipal());
        } catch (Exception e) { return ""; }
    }
}
