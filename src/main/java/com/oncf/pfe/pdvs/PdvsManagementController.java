package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/management")
@RequiredArgsConstructor
public class PdvsManagementController {

    private final PdvsManagementRepository repo;

    // ===== HIÉRARCHIE =====
    private static final Map<String, List<String>> CSPR_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // 10 thèmes par défaut — initialisés automatiquement
    private static final List<Map<String, String>> THEMES_DEFAULT = List.of(
        Map.of("theme", "Pilotage sécurité",
               "processus", "Planification, Réalisation, Évaluation, Bouclage"),
        Map.of("theme", "Contrôle",
               "processus", "Collab/Proc, Site, Management KN1"),
        Map.of("theme", "Veille",
               "processus", "Collab/Proc, Site, Management N1"),
        Map.of("theme", "Gestion du Personnel",
               "processus", "RH, Formation, Habilitation, Comp. non techniques"),
        Map.of("theme", "Maîtrise documentaire",
               "processus", "Réglementation, Documents marche, SMS, Enregistrements"),
        Map.of("theme", "REX (Pr05)",
               "processus", "Animation, diffusion, bouclage, culture juste"),
        Map.of("theme", "Gestion risques (Pr03)",
               "processus", "Taxonomie risques, nœud-papillon, registre dangers"),
        Map.of("theme", "Enquêtes incidents (Pr06)",
               "processus", "PVCCI, RACE, analyse causes TOHE"),
        Map.of("theme", "PASF (Pr07)",
               "processus", "Réalisation, Suivi, Évaluation, incl. action FOH"),
        Map.of("theme", "SST + FOH (Pr08)",
               "processus", "EPI, conditions travail, FOH 4 dimensions")
    );

    // ── GET — liste selon rôle ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PdvsManagementEntry>> getAll(
            @RequestParam String semestre,
            @RequestParam Integer annee,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<PdvsManagementEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findBySemestreAndAnneeOrderByEntiteAscOrdreAsc(semestre, annee);
                break;
            case "CSPR":
                data = repo.findByEntiteAndSemestreAndAnneeOrderByOrdreAsc(entite, semestre, annee);
                // Initialiser les 10 thèmes si vide
                if (data.isEmpty()) {
                    data = initThemes(entite, semestre, annee, auth.getName());
                }
                break;
            case "CGPX":
                // CGPX voit les lignes où son entité est une sous-entité du CSPR
                // On cherche par entite du CSPR qui supervise ce CGPX
                String entiteCSPR = findCSPRForCGPX(entite);
                data = entiteCSPR != null
                    ? repo.findByEntiteAndSemestreAndAnneeOrderByOrdreAsc(entiteCSPR, semestre, annee)
                    : List.of();
                break;
            default:
                return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(data);
    }

    // ── GET — années disponibles ──
    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // ── POST — ajouter un thème (CSPR + ADMIN) ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody PdvsManagementEntry entry,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        if (role.equals("CSPR")) entry.setEntite(entite);

        // Calculer le prochain ordre
        Integer maxOrdre = repo.findMaxOrdre(
            entry.getEntite(), entry.getSemestre(), entry.getAnnee());
        entry.setOrdre(maxOrdre + 1);
        entry.setSaisiPar(auth.getName());

        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier une ligne (CSPR + ADMIN) ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody PdvsManagementEntry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(e -> {
            // CSPR ne peut modifier que ses propres lignes
            if (role.equals("CSPR") && !e.getEntite().equals(entite))
                return ResponseEntity.status(403).<PdvsManagementEntry>build();

            e.setTheme(body.getTheme());
            e.setProcessusEvalue(body.getProcessusEvalue());
            e.setCdt101vS1(body.getCdt101vS1());
            e.setCdt101vS2(body.getCdt101vS2());
            e.setCdt102vS1(body.getCdt102vS1());
            e.setCdt102vS2(body.getCdt102vS2());
            e.setCdtOaS1(body.getCdtOaS1());
            e.setCdtOaS2(body.getCdtOaS2());
            e.setCdt101lcS1(body.getCdt101lcS1());
            e.setCdt101lcS2(body.getCdt101lcS2());
            e.setCdt101sstS1(body.getCdt101sstS1());
            e.setCdt101sstS2(body.getCdt101sstS2());
            e.setObservations(body.getObservations());
            e.setActionsN2(body.getActionsN2());
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
            if (role.equals("CSPR") && !e.getEntite().equals(entite))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== HELPERS =====

    // Initialiser les 10 thèmes par défaut
    private List<PdvsManagementEntry> initThemes(
            String entite, String semestre, Integer annee, String saisiPar) {
        List<PdvsManagementEntry> entries = new ArrayList<>();
        for (int i = 0; i < THEMES_DEFAULT.size(); i++) {
            Map<String, String> t = THEMES_DEFAULT.get(i);
            PdvsManagementEntry e = PdvsManagementEntry.builder()
                .entite(entite).semestre(semestre).annee(annee)
                .ordre(i + 1)
                .theme(t.get("theme"))
                .processusEvalue(t.get("processus"))
                .saisiPar(saisiPar)
                .build();
            entries.add(repo.save(e));
        }
        return entries;
    }

    // Trouver le CSPR qui supervise un CGPX
    private String findCSPRForCGPX(String entiteCGPX) {
        for (Map.Entry<String, List<String>> entry : CSPR_ENTITES.entrySet()) {
            if (entry.getValue().contains(entiteCGPX)) return entry.getKey();
        }
        return null;
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(a -> a.getAuthority().replace("ROLE_", ""))
            .findFirst().orElse("");
    }

    private String getEntite(Authentication auth) {
        try {
            return (String) auth.getPrincipal()
                .getClass().getMethod("getEntite")
                .invoke(auth.getPrincipal());
        } catch (Exception e) { return ""; }
    }
}
