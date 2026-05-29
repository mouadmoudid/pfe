package com.oncf.pfe.registre;

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
@RequestMapping("/api/registre")
@RequiredArgsConstructor
public class RegistreController {

    private final RegistreRepository repo;

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

    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees(Authentication auth) {
        List<String> vis = visibleEntites(auth);
        if (vis == null)
            return ResponseEntity.ok(repo.findDistinctAnnees());
        if (vis.isEmpty())
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(repo.findDistinctAnneesByEntiteIn(vis));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RegistreDanger>> getByAnnee(
            @RequestParam Integer annee, Authentication auth) {
        List<String> vis = visibleEntites(auth);
        if (vis == null)
            return ResponseEntity.ok(repo.findByAnneeRegistreOrderByDangerAsc(annee));
        if (vis.isEmpty())
            return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(repo.findByAnneeRegistreAndEntiteInOrderByDangerAsc(annee, vis));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<RegistreDanger> create(
            @RequestBody RegistreDanger danger, Authentication auth) {
        String entite = getEntite(auth);
        if (!entite.isBlank()) danger.setEntite(entite);
        return ResponseEntity.ok(repo.save(danger));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<RegistreDanger> update(
            @PathVariable Long id,
            @RequestBody RegistreDanger body,
            Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(existing -> {
            if (!"ADMIN".equals(role) && !entite.equals(existing.getEntite()))
                return ResponseEntity.status(403).<RegistreDanger>build();
            existing.setDanger(body.getDanger());
            existing.setCauses(body.getCauses());
            existing.setAn1(body.getAn1());
            existing.setAn2(body.getAn2());
            existing.setAn3(body.getAn3());
            existing.setAn4(body.getAn4());
            existing.setAn5(body.getAn5());
            existing.setCotationGravite(body.getCotationGravite());
            existing.setResponsable(body.getResponsable());
            existing.setMesuresEnVigueur(body.getMesuresEnVigueur());
            existing.setActions(body.getActions());
            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        String role   = getRole(auth);
        String entite = getEntite(auth);
        return repo.findById(id).map(existing -> {
            if (!"ADMIN".equals(role) && !entite.equals(existing.getEntite()))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
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
