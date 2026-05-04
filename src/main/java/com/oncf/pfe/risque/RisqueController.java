package com.oncf.pfe.risque;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/risques")
@RequiredArgsConstructor
public class RisqueController {

    private final RisqueRepository repo;

    @GetMapping
    public ResponseEntity<List<RisqueEntry>> getAll() {
        return ResponseEntity.ok(repo.findAllByOrderByFacteurAscDangerAsc());
    }

    @GetMapping("/criticite/{criticite}")
    public ResponseEntity<List<RisqueEntry>> getByCriticite(@PathVariable String criticite) {
        return ResponseEntity.ok(repo.findByCriticiteOrderByFacteurAsc(criticite));
    }

    @GetMapping("/search")
    public ResponseEntity<List<RisqueEntry>> search(@RequestParam String q) {
        return ResponseEntity.ok(
            repo.findByFacteurContainingIgnoreCaseOrDangerContainingIgnoreCaseOrRisqueContainingIgnoreCase(q, q, q)
        );
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<RisqueEntry> create(@RequestBody RisqueEntry entry) {
        return ResponseEntity.ok(repo.save(entry));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<RisqueEntry> update(@PathVariable Long id, @RequestBody RisqueEntry entry) {
        return repo.findById(id).map(existing -> {
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

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CGPX','CSPR','CET')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.ok().build();
    }
}