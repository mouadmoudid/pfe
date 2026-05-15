package com.oncf.pfe.solde;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/solde")
@RequiredArgsConstructor
public class ElementSoldeController {

    private final ElementSoldeRepository repo;

    // ===== HIÉRARCHIE DES ENTITÉS =====
    // CET "CAMI" → voit tout
    // CSPR "CT Voie" → voit CDT 101V, CDT 102V, CDT OA OH OT
    // CSPR "CT CSS"  → voit CDT 101LC, CDT 101SST
    // CGPX → voit son entité exacte uniquement

    private static final Map<String, List<String>> CSPR_ENTITES = Map.of(
        "CT Voie", Arrays.asList("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  Arrays.asList("CDT 101LC", "CDT 101SST")
    );

    // ===== GET — Liste selon rôle et entité =====
    @GetMapping
    public ResponseEntity<List<ElementSolde>> getAll(
            @RequestParam Integer mois,
            @RequestParam Integer annee,
            Authentication auth) {

        String role   = getRoleFromAuth(auth);
        String entite = getEntiteFromAuth(auth);

        List<ElementSolde> data;

        switch (role) {
            case "ADMIN":
            case "CET":
                // Voit tout
                data = repo.findByMoisAndAnneeOrderByEntiteAscNomAsc(mois, annee);
                break;

            case "CSPR":
                // Voit ses sous-entités
                List<String> sousEntites = CSPR_ENTITES.getOrDefault(
                    entite, List.of());
                data = repo.findByEntiteInAndMoisAndAnneeOrderByEntiteAscNomAsc(
                    sousEntites, mois, annee);
                break;

            case "CGPX":
                // Voit uniquement son entité
                data = repo.findByEntiteAndMoisAndAnneeOrderByNomAsc(
                    entite, mois, annee);
                break;

            case "AGENT":
                // Voit uniquement sa propre ligne
                String matricule = getMatriculeFromAuth(auth);
                data = repo.findByMatriculeAndMoisAndAnnee(matricule, mois, annee)
                    .map(List::of).orElse(List.of());
                break;

            default:
                return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(data);
    }

    // ===== GET — Années disponibles =====
    @GetMapping("/annees")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // ===== GET — Mois disponibles pour une année =====
    @GetMapping("/mois")
    public ResponseEntity<List<Integer>> getMois(@RequestParam Integer annee) {
        return ResponseEntity.ok(repo.findDistinctMoisByAnnee(annee));
    }

    // ===== POST — Créer une ligne (CGPX uniquement) =====
    @PostMapping
    public ResponseEntity<ElementSolde> create(
            @RequestBody ElementSolde entry,
            Authentication auth) {

        String role   = getRoleFromAuth(auth);
        String entite = getEntiteFromAuth(auth);

        // Seul CGPX et ADMIN peuvent créer
        if (!role.equals("CGPX") && !role.equals("ADMIN")) {
            return ResponseEntity.status(403).build();
        }

        // CGPX ne peut créer que pour son entité
        if (role.equals("CGPX")) {
            entry.setEntite(entite);
        }

        // Vérifier doublon
        if (repo.existsByNomAndPrenomAndMoisAndAnneeAndEntite(
                entry.getNom(), entry.getPrenom(),
                entry.getMois(), entry.getAnnee(), entry.getEntite())) {
            return ResponseEntity.badRequest().build();
        }

        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(repo.save(entry));
    }

    // ===== PUT — Modifier une ligne (CGPX et ADMIN) =====
    @PutMapping("/{id}")
    public ResponseEntity<ElementSolde> update(
            @PathVariable Long id,
            @RequestBody ElementSolde body,
            Authentication auth) {

        String role   = getRoleFromAuth(auth);
        String entite = getEntiteFromAuth(auth);

        return repo.findById(id).map(existing -> {
            // CGPX ne peut modifier que son entité
            if (role.equals("CGPX") && !existing.getEntite().equals(entite)) {
                return ResponseEntity.status(403).<ElementSolde>build();
            }
            if (!role.equals("CGPX") && !role.equals("ADMIN")) {
                return ResponseEntity.status(403).<ElementSolde>build();
            }

            existing.setNbJoursAstreinte(body.getNbJoursAstreinte());
            existing.setTypeAstreinte(body.getTypeAstreinte());
            existing.setPeriodeAstreinte(body.getPeriodeAstreinte());
            existing.setAllocationNuit(body.getAllocationNuit());
            existing.setRepasNormal(body.getRepasNormal());
            existing.setDecNormal(body.getDecNormal());
            existing.setRepasReduit(body.getRepasReduit());
            existing.setDecReduit(body.getDecReduit());
            existing.setAllocationParcours(body.getAllocationParcours());
            existing.setIndemniteCup(body.getIndemniteCup());
            existing.setNbJoursConge(body.getNbJoursConge());
            existing.setPeriodeConge(body.getPeriodeConge());
            existing.setNbJoursRC(body.getNbJoursRC());
            existing.setPeriodeRC(body.getPeriodeRC());
            existing.setMotifRC(body.getMotifRC());
            existing.setNbHeuresSupp(body.getNbHeuresSupp());
            existing.setJustificationHS(body.getJustificationHS());
            existing.setSaisiPar(auth.getName());

            return ResponseEntity.ok(repo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ===== DELETE — Supprimer (ADMIN uniquement) =====
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication auth) {

        if (!getRoleFromAuth(auth).equals("ADMIN")) {
            return ResponseEntity.status(403).build();
        }
        repo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ===== HELPERS =====
    private String getRoleFromAuth(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(a -> a.getAuthority().replace("ROLE_", ""))
            .findFirst().orElse("AGENT");
    }

    private String getEntiteFromAuth(Authentication auth) {
        if (auth.getPrincipal() instanceof User u) {
            return u.getEntite() != null ? u.getEntite() : "";
        }
        return "";
    }

    private String getMatriculeFromAuth(Authentication auth) {
        if (auth.getPrincipal() instanceof User u) {
            return u.getMatricule() != null ? u.getMatricule() : "";
        }
        return "";
    }
}
