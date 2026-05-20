package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/pdvs/collab")
@RequiredArgsConstructor
public class PdvsCollabController {

    private final PdvsCollabRepository repo;

    // ===== HIÉRARCHIE =====
    private static final Map<String, List<String>> CSPR_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // ── GET — liste selon rôle et entité ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PdvsCollabEntry>> getAll(
            @RequestParam String semestre,
            @RequestParam Integer annee,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        List<PdvsCollabEntry> data;
        switch (role) {
            case "ADMIN":
            case "CET":
                data = repo.findBySemestreAndAnneeOrderByEntiteAscCollaborateurNomAsc(semestre, annee);
                break;
            case "CSPR":
                List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
                data = repo.findByEntiteInAndSemestreAndAnneeOrderByEntiteAscCollaborateurNomAsc(sous, semestre, annee);
                break;
            case "CGPX":
                data = repo.findByEntiteAndSemestreAndAnneeOrderByCollaborateurNomAsc(entite, semestre, annee);
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

    // ── POST — créer (CSPR + ADMIN) ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody PdvsCollabEntry entry,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        // CSPR ne peut créer que pour ses sous-entités
        if (role.equals("CSPR")) {
            List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
            if (!sous.contains(entry.getEntite())) {
                return ResponseEntity.status(403)
                    .body("Entité non autorisée pour votre périmètre");
            }
        }

        // Vérifier doublon
        if (repo.existsByMatriculeAndSemestreAndAnneeAndEntite(
                entry.getMatricule(), entry.getSemestre(),
                entry.getAnnee(), entry.getEntite())) {
            return ResponseEntity.badRequest()
                .body("Cette ligne existe déjà pour ce collaborateur ce semestre.");
        }

        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ── PUT — modifier (CSPR + ADMIN) ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody PdvsCollabEntry body,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);

        return repo.findById(id).map(existing -> {
            // CSPR ne peut modifier que ses sous-entités
            if (role.equals("CSPR")) {
                List<String> sous = CSPR_ENTITES.getOrDefault(entite, List.of());
                if (!sous.contains(existing.getEntite())) {
                    return ResponseEntity.status(403)
                        .<PdvsCollabEntry>build();
                }
            }

            // Mise à jour des champs modifiables
            existing.setCritereFragilise(body.getCritereFragilise());
            existing.setLienRisqueMajeur(body.getLienRisqueMajeur());
            existing.setSp320(body.getSp320());
            existing.setS2b(body.getS2b());
            existing.setS9a(body.getS9a());
            existing.setS9b(body.getS9b());
            existing.setCgS2c(body.getCgS2c());
            existing.setConsLoc(body.getConsLoc());
            existing.setGuides(body.getGuides());
            existing.setRefInterv(body.getRefInterv());
            existing.setRefNormes(body.getRefNormes());
            existing.setRefSecCh(body.getRefSecCh());
            existing.setRefTour(body.getRefTour());
            existing.setInR3001(body.getInR3001());
            existing.setCotationN2(body.getCotationN2());
            existing.setEcartKn1(body.getEcartKn1());
            existing.setActions(body.getActions());
            existing.setBouclage(body.getBouclage());
            existing.setSaisiPar(auth.getName());

            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE — ADMIN uniquement ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ── HELPERS ──
    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(a -> a.getAuthority().replace("ROLE_", ""))
            .findFirst().orElse("");
    }

    private String getEntite(Authentication auth) {
        Object p = auth.getPrincipal();
        try {
            return (String) p.getClass().getMethod("getEntite").invoke(p);
        } catch (Exception e) { return ""; }
    }
}
