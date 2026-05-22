package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/site")
@RequiredArgsConstructor
public class PdvsSiteController {

    private final PdvsSiteRepository repo;

    private static final Map<String, List<String>> CSPR_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // ── GET — liste selon rôle ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PdvsSiteEntry>> getAll(
            @RequestParam String semestre,
            @RequestParam Integer annee,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<PdvsSiteEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findBySemestreAndAnneeOrderByEntiteAscSiteAsc(semestre, annee);
                break;
            case "CSPR":
                List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
                data = repo.findByEntiteInAndSemestreAndAnneeOrderByEntiteAscSiteAsc(sous, semestre, annee);
                break;
            case "CGPX":
                data = repo.findByEntiteAndSemestreAndAnneeOrderBySiteAsc(entite, semestre, annee);
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

    // ── POST — créer (CSPR + ADMIN) ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody PdvsSiteEntry entry,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        if (role.equals("CSPR")) {
            List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
            if (!sous.contains(entry.getEntite()))
                return ResponseEntity.status(403).body("Entité non autorisée");
        }

        if (repo.existsBySiteAndSemestreAndAnneeAndEntite(
                entry.getSite(), entry.getSemestre(),
                entry.getAnnee(), entry.getEntite()))
            return ResponseEntity.badRequest()
                .body("Ce site existe déjà pour cette période.");

        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier (CSPR + ADMIN) ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody PdvsSiteEntry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(e -> {
            if (role.equals("CSPR")) {
                List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
                if (!sous.contains(e.getEntite()))
                    return ResponseEntity.status(403).<PdvsSiteEntry>build();
            }
            e.setSite(body.getSite());
            e.setDt(body.getDt());
            e.setType(body.getType());
            e.setLienRisqueMajeur(body.getLienRisqueMajeur());
            e.setCotationS1(body.getCotationS1());
            e.setCotationS2(body.getCotationS2());
            e.setCotationAnnuelle(body.getCotationAnnuelle());
            e.setActionsN2(body.getActionsN2());
            e.setBouclage(body.getBouclage());
            e.setResponsable(body.getResponsable());
            e.setObservations(body.getObservations());
            e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE — ADMIN + CSPR ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CSPR')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        if (role.equals("CSPR")) {
            List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
            return repo.findById(id).map(e -> {
                if (!sous.contains(e.getEntite()))
                    return ResponseEntity.status(403).<Void>build();
                repo.deleteById(id);
                return ResponseEntity.ok().<Void>build();
            }).orElse(ResponseEntity.notFound().build());
        }
        repo.deleteById(id);
        return ResponseEntity.ok().build();
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
