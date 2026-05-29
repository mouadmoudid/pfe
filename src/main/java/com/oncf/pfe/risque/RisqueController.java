package com.oncf.pfe.risque;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/risques")
@RequiredArgsConstructor
public class RisqueController {

    private final RisqueRepository repo;

    // CT Voie supervise CDT 101V, CDT 102V, CDT OA OH OT
    // CT CSS  supervise CDT 101LC, CDT 101SST
    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // Returns null = see all. Returns list = filter by those entites.
    private List<String> visibleEntites(Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        switch (role) {
            case "ADMIN": case "CET":
                return null;
            case "CSPR": {
                List<String> list = new ArrayList<>();
                list.add(entite);
                list.addAll(CSPR_SOUS_ENTITES.getOrDefault(entite, List.of()));
                return list;
            }
            case "CGPX": {
                List<String> list = new ArrayList<>();
                list.add(entite);
                String cspr = findCspr(entite);
                if (cspr != null) list.add(cspr);
                return list;
            }
            default:
                return entite.isBlank() ? List.of() : List.of(entite);
        }
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RisqueEntry>> getAll(Authentication auth) {
        List<String> vis = visibleEntites(auth);
        if (vis == null)
            return ResponseEntity.ok(repo.findAllByOrderByFacteurAscDangerAsc());
        if (vis.isEmpty())
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(repo.findByEntiteInOrderByFacteurAscDangerAsc(vis));
    }

    @GetMapping("/criticite/{criticite}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RisqueEntry>> getByCriticite(
            @PathVariable String criticite, Authentication auth) {
        List<String> vis = visibleEntites(auth);
        if (vis == null)
            return ResponseEntity.ok(repo.findByCriticiteOrderByFacteurAsc(criticite));
        if (vis.isEmpty())
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(repo.findByCriticiteAndEntiteInOrderByFacteurAsc(criticite, vis));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RisqueEntry>> search(
            @RequestParam String q, Authentication auth) {
        List<String> vis = visibleEntites(auth);
        if (vis == null)
            return ResponseEntity.ok(
                repo.findByFacteurContainingIgnoreCaseOrDangerContainingIgnoreCaseOrRisqueContainingIgnoreCase(q, q, q));
        if (vis.isEmpty())
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(repo.searchInEntites(vis, q));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<RisqueEntry> create(
            @RequestBody RisqueEntry entry, Authentication auth) {
        String entite = getEntite(auth);
        if (!entite.isBlank()) entry.setEntite(entite);
        return ResponseEntity.ok(repo.save(entry));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<RisqueEntry> update(
            @PathVariable Long id,
            @RequestBody RisqueEntry entry,
            Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(existing -> {
            if (!"ADMIN".equals(role) && !canModify(role, entite, existing.getEntite()))
                return ResponseEntity.status(403).<RisqueEntry>build();
            existing.setFacteur(entry.getFacteur());
            existing.setLieu(entry.getLieu());
            existing.setDanger(entry.getDanger());
            existing.setRisque(entry.getRisque());
            existing.setFrequence(entry.getFrequence());
            existing.setGravite(entry.getGravite());
            existing.setPropositions(entry.getPropositions());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // PATCH pour les champs N2 uniquement (depuis RegistreDangersN2Screen)
    @PatchMapping("/{id}/n2")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<RisqueEntry> updateN2Fields(
            @PathVariable Long id,
            @RequestBody RisqueEntry body,
            Authentication auth) {
        String role   = getRole(auth);
        List<String> vis = visibleEntites(auth);
        return repo.findById(id).map(existing -> {
            if (vis != null && !vis.contains(existing.getEntite()))
                return ResponseEntity.status(403).<RisqueEntry>build();
            existing.setCodeTaxo(body.getCodeTaxo());
            existing.setBarrieresPrevention(body.getBarrieresPrevention());
            existing.setBarrieresProtection(body.getBarrieresProtection());
            existing.setPlanAction(body.getPlanAction());
            existing.setResponsableNom(body.getResponsableNom());
            existing.setResponsableId(body.getResponsableId());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(existing -> {
            if (!"ADMIN".equals(role) && !canModify(role, entite, existing.getEntite()))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // A user can modify only entries they own (their entite), not their superior's.
    private boolean canModify(String role, String userEntite, String recordEntite) {
        return userEntite.equals(recordEntite);
    }

    private String findCspr(String cgpxEntite) {
        for (Map.Entry<String, List<String>> e : CSPR_SOUS_ENTITES.entrySet())
            if (e.getValue().contains(cgpxEntite)) return e.getKey();
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
