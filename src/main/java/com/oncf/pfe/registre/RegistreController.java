package com.oncf.pfe.registre;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/registre")
@RequiredArgsConstructor
public class RegistreController {

    private final RegistreRepository repo;

    // Liste des années disponibles
    @GetMapping("/annees")
    public ResponseEntity<List<Integer>> getAnnees() {
        return ResponseEntity.ok(repo.findDistinctAnnees());
    }

    // Tous les dangers d'une année
    @GetMapping
    public ResponseEntity<List<RegistreDanger>> getByAnnee(@RequestParam Integer annee) {
        return ResponseEntity.ok(repo.findByAnneeRegistreOrderByDangerAsc(annee));
    }

    // Créer un danger
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<RegistreDanger> create(@RequestBody RegistreDanger danger) {
        return ResponseEntity.ok(repo.save(danger));
    }

    // Modifier un danger
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<RegistreDanger> update(
            @PathVariable Long id,
            @RequestBody RegistreDanger body) {
        return repo.findById(id).map(existing -> {
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

    // Supprimer un danger
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.ok().build();
    }
}