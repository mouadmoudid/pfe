package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/journal-csspr")
@RequiredArgsConstructor
public class JournalCSSPrController {

    private final JournalCSSPrRepository repo;

    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // ── GET — liste ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<JournalCSSPrEntry>> getAll(
            @RequestParam Integer annee, Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<JournalCSSPrEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeOrderByEntiteCSPRAscOrdreAsc(annee);
                break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entite, annee);
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

    // ── GET années ──
    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // ── POST — créer ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody JournalCSSPrEntry entry, Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);

        Integer max = repo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee());
        entry.setOrdre(max + 1);
        if (entry.getStatut() == null || entry.getStatut().isBlank())
            entry.setStatut("EN_COURS");
        entry.setSaisiPar(auth.getName());

        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody JournalCSSPrEntry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<JournalCSSPrEntry>build();

            e.setDecision(body.getDecision());
            e.setDateDecision(body.getDateDecision());
            e.setResponsableNom(body.getResponsableNom());
            e.setResponsableMatricule(body.getResponsableMatricule());
            e.setContributeurs(body.getContributeurs());
            e.setEcheance(body.getEcheance());
            e.setAvancement(body.getAvancement());
            e.setStatut(body.getStatut());
            e.setObservations(body.getObservations());
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

    // ===== HELPERS =====
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
