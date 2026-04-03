package com.oncf.pfe.rex;

import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rex")
@RequiredArgsConstructor
public class RexRaceController {

    private final RexRepository rexRepository;
    private final RaceRepository raceRepository;
    private final UserRepository userRepository;

    private User getCurrentUser(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    // ===== REX =====
    @GetMapping
    public List<Rex> getAllRex() {
        return rexRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Rex> getRex(@PathVariable Long id) {
        return rexRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Rex createRex(@RequestBody Rex rex, Authentication auth) {
        rex.setCreatedBy(getCurrentUser(auth));
        return rexRepository.save(rex);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Rex> updateRex(@PathVariable Long id, @RequestBody Rex rex, Authentication auth) {
        return rexRepository.findById(id).map(existing -> {
            rex.setId(id);
            rex.setCreatedBy(existing.getCreatedBy());
            rex.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(rexRepository.save(rex));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRex(@PathVariable Long id) {
        rexRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ===== RACE =====
    @GetMapping("/race")
    public List<Race> getAllRace() {
        return raceRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/race/{id}")
    public ResponseEntity<Race> getRace(@PathVariable Long id) {
        return raceRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/race")
    public Race createRace(@RequestBody Race race, Authentication auth) {
        race.setCreatedBy(getCurrentUser(auth));
        return raceRepository.save(race);
    }

    @PutMapping("/race/{id}")
    public ResponseEntity<Race> updateRace(@PathVariable Long id, @RequestBody Race race, Authentication auth) {
        return raceRepository.findById(id).map(existing -> {
            race.setId(id);
            race.setCreatedBy(existing.getCreatedBy());
            race.setCreatedAt(existing.getCreatedAt());
            return ResponseEntity.ok(raceRepository.save(race));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/race/{id}")
    public ResponseEntity<Void> deleteRace(@PathVariable Long id) {
        raceRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}