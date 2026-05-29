package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/pasf-n2")
@RequiredArgsConstructor
public class PasfN2Controller {

    private final PasfN2Repository repo;

    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // 8 lignes par défaut (depuis la feuille Excel)
    private static final List<Map<String,String>> LIGNES_DEFAULT = List.of(
        Map.of("processus","Pr01","axeNoss","Objectifs","source","NOSS 1",
               "action","Réduire incidents ≥15%"),
        Map.of("processus","Pr03","axeNoss","Risques","source","NOSS 3",
               "action","Taxonomie risques périmètre CT"),
        Map.of("processus","Pr04","axeNoss","Veille","source","NOSS 3",
               "action","Veille priorisée qualité > quantité"),
        Map.of("processus","Pr05","axeNoss","REX","source","NOSS 2",
               "action","2 séances REX terrain/an"),
        Map.of("processus","Pr07","axeNoss","PAS","source","NOSS 4",
               "action","Sécurisation chantiers"),
        Map.of("processus","Pr08 FOH ⚠","axeNoss","FOH","source","NOSS 5",
               "action","Compétences non techniques CDTs"),
        Map.of("processus","Pr08 FOH","axeNoss","Culture juste","source","NOSS 5",
               "action","Remontées info sans crainte"),
        Map.of("processus","Pr04","axeNoss","Tamp. animaux","source","NOSS 7",
               "action","Réduction ≥40%")
    );

    // ── GET ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PasfN2Entry>> getAll(
            @RequestParam Integer annee, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        List<PasfN2Entry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeOrderByEntiteCSPRAscOrdreAsc(annee); break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entite, annee);
                if (data.isEmpty()) data = initLignes(entite, annee, auth.getName());
                break;
            case "CGPX":
                String cspr = findCSPRForCGPX(entite);
                data = cspr != null
                    ? repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(cspr, annee)
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

    // ── POST — ajouter une ligne ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(@RequestBody PasfN2Entry entry, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);
        if (entry.getStatut() == null) entry.setStatut("EN_COURS");
        entry.setOrdre(repo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee()) + 1);
        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id,
            @RequestBody PasfN2Entry body, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<PasfN2Entry>build();
            e.setProcessus(body.getProcessus()); e.setAxeNoss(body.getAxeNoss());
            e.setSource(body.getSource());       e.setAction(body.getAction());
            e.setResponsableNom(body.getResponsableNom());
            e.setResponsableMatricule(body.getResponsableMatricule());
            e.setContributeurs(body.getContributeurs());
            e.setEcheance(body.getEcheance());   e.setIndicateur(body.getIndicateur());
            e.setObjectif(body.getObjectif());   e.setAvancementPct(body.getAvancementPct());
            e.setStatut(body.getStatut());       e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE — CSPR et ADMIN ──
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

    private List<PasfN2Entry> initLignes(String entiteCSPR, Integer annee, String saisiPar) {
        List<PasfN2Entry> result = new ArrayList<>();
        for (int i = 0; i < LIGNES_DEFAULT.size(); i++) {
            Map<String,String> d = LIGNES_DEFAULT.get(i);
            result.add(repo.save(PasfN2Entry.builder()
                .entiteCSPR(entiteCSPR).annee(annee).ordre(i + 1)
                .processus(d.get("processus")).axeNoss(d.get("axeNoss"))
                .source(d.get("source")).action(d.get("action"))
                .statut("EN_COURS").saisiPar(saisiPar).build()));
        }
        return result;
    }

    private String findCSPRForCGPX(String entite) {
        for (Map.Entry<String, List<String>> e : CSPR_SOUS_ENTITES.entrySet())
            if (e.getValue().contains(entite)) return e.getKey();
        return null;
    }
    private String getRole(Authentication a) {
        return a.getAuthorities().stream().map(x -> x.getAuthority().replace("ROLE_","")).findFirst().orElse("");
    }
    private String getEntite(Authentication a) {
        try { return (String) a.getPrincipal().getClass().getMethod("getEntite").invoke(a.getPrincipal());
        } catch (Exception e) { return ""; }
    }
}
