package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/planning-kn2")
@RequiredArgsConstructor
public class PlanningKN2Controller {

    private final PlanningKN2Repository repo;

    // ===== LIGNES PAR DÉFAUT selon entité CSPR =====
    private static final Map<String, List<String>> CSPR_SOUS_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // Génération des lignes par défaut selon les sous-entités du CSPR
    private List<Map<String, String>> getDefaultLignes(String entiteCSPR) {
        List<String> sousEntites = CSPR_SOUS_ENTITES.getOrDefault(entiteCSPR, List.of());
        List<Map<String, String>> lignes = new ArrayList<>();
        int ordre = 1;

        // CDT — KN2 trimestriel par sous-entité
        for (String se : sousEntites) {
            lignes.add(Map.of(
                "objet", "KN2 trimestriel CDT",
                "ctEntite", se, "type", "CDT", "ordre", String.valueOf(ordre++)));
        }

        // KN1 — Collab/Proc par sous-entité (sauf OA)
        for (String se : sousEntites) {
            if (!se.contains("OA")) {
                lignes.add(Map.of(
                    "objet", "KN2 champ KN1 Collab/Proc",
                    "ctEntite", se, "type", "KN1", "ordre", String.valueOf(ordre++)));
            }
        }

        // KN1 — Chantier et Site pour tous
        lignes.add(Map.of("objet", "KN2 champ KN1 Chantier",
            "ctEntite", "Tous DT", "type", "KN1", "ordre", String.valueOf(ordre++)));
        lignes.add(Map.of("objet", "KN2 champ KN1 Site",
            "ctEntite", "Tous DT", "type", "KN1", "ordre", String.valueOf(ordre++)));

        // MGMT — Contrôle management par sous-entité
        for (String se : sousEntites) {
            lignes.add(Map.of(
                "objet", "Contrôle mgmt annuel",
                "ctEntite", se, "type", "MGMT", "ordre", String.valueOf(ordre++)));
        }

        // TECH — Veille technique
        lignes.add(Map.of("objet", "Veille EM120",
            "ctEntite", "Tous DT", "type", "TECH", "ordre", String.valueOf(ordre++)));
        lignes.add(Map.of("objet", "Veille US rails",
            "ctEntite", "Tous DT", "type", "TECH", "ordre", String.valueOf(ordre++)));
        lignes.add(Map.of("objet", "Veille AdV Famille A",
            "ctEntite", "Tous DT", "type", "TECH", "ordre", String.valueOf(ordre++)));
        lignes.add(Map.of("objet", "Tournée conformité",
            "ctEntite", "Tous DT", "type", "TECH", "ordre", String.valueOf(ordre)));

        return lignes;
    }

    // ── GET — liste selon rôle ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PlanningKN2Entry>> getAll(
            @RequestParam Integer annee,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<PlanningKN2Entry> data;
        switch (role) {
            case "ADMIN": case "CET":
                data = repo.findByAnneeOrderByEntiteCSPRAscOrdreAsc(annee);
                break;
            case "CSPR":
                data = repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entite, annee);
                // Init automatique si vide
                if (data.isEmpty()) {
                    data = initLignes(entite, annee, auth.getName());
                }
                break;
            case "CGPX":
                // CGPX voit le planning du CSPR qui le supervise
                String entiteCSPR = findCSPRForCGPX(entite);
                data = entiteCSPR != null
                    ? repo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entiteCSPR, annee)
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

    // ── PUT — mettre à jour les mois d'une ligne ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody PlanningKN2Entry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(e -> {
            if (role.equals("CSPR") && !e.getEntiteCSPR().equals(entite))
                return ResponseEntity.status(403).<PlanningKN2Entry>build();

            // Mise à jour mois et champs modifiables
            e.setObjet(body.getObjet());
            e.setCtEntite(body.getCtEntite());
            e.setType(body.getType());
            e.setM1(body.getM1());   e.setM2(body.getM2());
            e.setM3(body.getM3());   e.setM4(body.getM4());
            e.setM5(body.getM5());   e.setM6(body.getM6());
            e.setM7(body.getM7());   e.setM8(body.getM8());
            e.setM9(body.getM9());   e.setM10(body.getM10());
            e.setM11(body.getM11()); e.setM12(body.getM12());
            e.setSaisiPar(auth.getName());

            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST — ajouter une ligne personnalisée ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody PlanningKN2Entry entry,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);

        Integer maxOrdre = repo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee());
        entry.setOrdre(maxOrdre + 1);
        entry.setSaisiPar(auth.getName());

        return ResponseEntity.ok(repo.save(entry));
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
    private List<PlanningKN2Entry> initLignes(
            String entiteCSPR, Integer annee, String saisiPar) {
        List<Map<String, String>> defaults = getDefaultLignes(entiteCSPR);
        List<PlanningKN2Entry> entries = new ArrayList<>();
        for (Map<String, String> d : defaults) {
            PlanningKN2Entry e = PlanningKN2Entry.builder()
                .entiteCSPR(entiteCSPR)
                .annee(annee)
                .ordre(Integer.parseInt(d.get("ordre")))
                .objet(d.get("objet"))
                .ctEntite(d.get("ctEntite"))
                .type(d.get("type"))
                .saisiPar(saisiPar)
                .build();
            entries.add(repo.save(e));
        }
        return entries;
    }

    private String findCSPRForCGPX(String entiteCGPX) {
        for (Map.Entry<String, List<String>> e : CSPR_SOUS_ENTITES.entrySet()) {
            if (e.getValue().contains(entiteCGPX)) return e.getKey();
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
