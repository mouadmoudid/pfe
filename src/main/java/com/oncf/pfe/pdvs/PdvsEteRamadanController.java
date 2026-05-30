package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/ete-ramadan")
@RequiredArgsConstructor
public class PdvsEteRamadanController {

    private final PdvsEteRamadanRepository repo;

    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // 8 lignes par défaut (même pour Été et Ramadan)
    private static final List<Map<String,String>> LIGNES_DEFAULT = List.of(
        Map.of("actionN2","Renforcement KN2 vif",          "cdt","Tous",      "frequence","Hebdo",          "lienRisque","RH-01/RH-02"),
        Map.of("actionN2","Vérif. PDVS N1",                "cdt","Tous",      "frequence","Bimensuel",       "lienRisque","RH-02"),
        Map.of("actionN2","Bouclage actions M/I",          "cdt","Concerné",  "frequence","Après constat",   "lienRisque","RH-01"),
        Map.of("actionN2","Suivi fragilisés",              "cdt","Tous",      "frequence","Hebdo",           "lienRisque","RH-02"),
        Map.of("actionN2","Tournées chaleur validation",   "cdt","Tous",      "frequence","Selon météo",     "lienRisque","RE-02"),
        Map.of("actionN2","Assistance chantiers",          "cdt","Demandeur", "frequence","Programme",       "lienRisque","RI-01"),
        Map.of("actionN2","CSSPr spéciale période",        "cdt","Tous",      "frequence","1 réunion",       "lienRisque","—"),
        Map.of("actionN2","Rapport synthèse période",      "cdt","—",         "frequence","Fin période",     "lienRisque","—")
    );

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PdvsEteRamadanEntry>> getAll(
            @RequestParam Integer annee,
            @RequestParam String periode,
            Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        List<PdvsEteRamadanEntry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeAndPeriodeOrderByEntiteCSPRAscOrdreAsc(annee, periode);
                break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeAndPeriodeOrderByOrdreAsc(entite, annee, periode);
                if (data.isEmpty()) data = initLignes(entite, annee, periode, auth.getName());
                break;
            case "CGPX":
                String cspr = findCSPRForCGPX(entite);
                data = cspr != null
                    ? repo.findByEntiteCSPRAndAnneeAndPeriodeOrderByOrdreAsc(cspr, annee, periode)
                    : List.of();
                break;
            default: return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(@RequestBody PdvsEteRamadanEntry entry, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);
        entry.setOrdre(repo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee(), entry.getPeriode()) + 1);
        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestBody PdvsEteRamadanEntry body, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<PdvsEteRamadanEntry>build();
            e.setActionN2(body.getActionN2());
            e.setCdt(body.getCdt());
            e.setFrequence(body.getFrequence());
            e.setLienRisque(body.getLienRisque());
            e.setResponsableNom(body.getResponsableNom());
            e.setResponsableMatricule(body.getResponsableMatricule());
            e.setPlanifie(body.getPlanifie());
            e.setRealise(body.getRealise());
            e.setObservations(body.getObservations());
            e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<Void>build();
            repo.deleteById(id);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private List<PdvsEteRamadanEntry> initLignes(
            String entiteCSPR, Integer annee, String periode, String saisiPar) {
        List<PdvsEteRamadanEntry> result = new ArrayList<>();
        for (int i = 0; i < LIGNES_DEFAULT.size(); i++) {
            Map<String,String> d = LIGNES_DEFAULT.get(i);
            result.add(repo.save(PdvsEteRamadanEntry.builder()
                .entiteCSPR(entiteCSPR).annee(annee).periode(periode).ordre(i + 1)
                .actionN2(d.get("actionN2")).cdt(d.get("cdt"))
                .frequence(d.get("frequence")).lienRisque(d.get("lienRisque"))
                .saisiPar(saisiPar).build()));
        }
        return result;
    }

    private String findCSPRForCGPX(String entite) {
        for (Map.Entry<String, List<String>> e : CSPR_SOUS_ENTITES.entrySet())
            if (e.getValue().contains(entite)) return e.getKey();
        return null;
    }
    private String getRole(Authentication a) {
        return a.getAuthorities().stream()
            .map(x->x.getAuthority().replace("ROLE_","")).findFirst().orElse("");
    }
    private String getEntite(Authentication a) {
        try { return (String) a.getPrincipal().getClass()
            .getMethod("getEntite").invoke(a.getPrincipal());
        } catch (Exception e) { return ""; }
    }
}
