package com.oncf.pfe.referentiel;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/referentiels")
@RequiredArgsConstructor
public class ReferentielController {

    private final ReferentielService referentielService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReferentielResponse> upload(
            @RequestParam MultipartFile file,
            @RequestParam(required = false) String nom,
            @RequestParam(required = false) String description,
            Authentication auth) throws IOException {
        User user = (User) auth.getPrincipal();
        return ResponseEntity.ok(referentielService.upload(file, nom, description, user));
    }

    @GetMapping
    public ResponseEntity<List<ReferentielResponse>> getAll() {
        return ResponseEntity.ok(referentielService.getAll());
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        byte[] contenu = referentielService.getContenu(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"referentiel.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(contenu);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        referentielService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
