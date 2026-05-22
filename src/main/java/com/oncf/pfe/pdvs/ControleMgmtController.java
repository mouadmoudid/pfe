package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/controle-mgmt")
@RequiredArgsConstructor
public class ControleMgmtController {

    private final ControleMgmtRepository repo;

    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // Mêmes 10 thèmes que PDVS Management
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

    // ── GET ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ControleMgmtEntry>> getAll(
            @RequestParam Integer annee, Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<ControleMgmtEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeOrderByEntiteCSPRAscOrdreAsc(annee);
                break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entite, annee);
                if (data.isEmpty()) data = initThemes(entite, annee, auth.getName());
                break;
            case "CGPX":
                String cspr = findCSPRForCGPX(entite);
                data = cspr != null
                    ? repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(cspr, annee)
                    : List.of();
                break;
            default:
                return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // ── POST — ajouter thème ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody ControleMgmtEntry entry, Authentication auth) {
        String role = getRole(auth);
        String entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);
        Integer max = repo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee());
        entry.setOrdre(max + 1);
        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody ControleMgmtEntry body,
            Authentication auth) {
        String role = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<ControleMgmtEntry>build();
            e.setTheme(body.getTheme());
            e.setProcessus(body.getProcessus());
            e.setCdt101vC1(body.getCdt101vC1());
            e.setCdt101vC2(body.getCdt101vC2());
            e.setCdt102vC1(body.getCdt102vC1());
            e.setCdt102vC2(body.getCdt102vC2());
            e.setCdtOaC1(body.getCdtOaC1());
            e.setCdtOaC2(body.getCdtOaC2());
            e.setCdt101lcC1(body.getCdt101lcC1());
            e.setCdt101lcC2(body.getCdt101lcC2());
            e.setCdt101sstC1(body.getCdt101sstC1());
            e.setCdt101sstC2(body.getCdt101sstC2());
            e.setActions(body.getActions());
            e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> delete(
            @PathVariable Long id, Authentication auth) {
        String role = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== HELPERS =====
    private List<ControleMgmtEntry> initThemes(
            String entiteCSPR, Integer annee, String saisiPar) {
        List<ControleMgmtEntry> entries = new ArrayList<>();
        for (int i = 0; i < THEMES_DEFAULT.size(); i++) {
            Map<String, String> t = THEMES_DEFAULT.get(i);
            ControleMgmtEntry e = ControleMgmtEntry.builder()
                .entiteCSPR(entiteCSPR).annee(annee)
                .ordre(i + 1).theme(t.get("theme"))
                .processus(t.get("processus"))
                .saisiPar(saisiPar).build();
            entries.add(repo.save(e));
        }
        return entries;
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
