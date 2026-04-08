package com.oncf.pfe.referentiel;

import com.oncf.pfe.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReferentielService {

    private final ReferentielRepository referentielRepository;

    public ReferentielResponse upload(MultipartFile file, String nom, String description, User user) throws IOException {
        Referentiel ref = Referentiel.builder()
                .nom(nom != null && !nom.isBlank() ? nom : file.getOriginalFilename())
                .description(description)
                .contenu(file.getBytes())
                .typeContenu("application/pdf")
                .taille(file.getSize())
                .createdBy(user)
                .build();
        return toResponse(referentielRepository.save(ref));
    }

    public List<ReferentielResponse> getAll() {
        return referentielRepository.findAllMetadata();
    }

    public byte[] getContenu(Long id) {
        return referentielRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Référentiel introuvable : " + id))
                .getContenu();
    }

    public void delete(Long id) {
        referentielRepository.deleteById(id);
    }

    private ReferentielResponse toResponse(Referentiel ref) {
        return ReferentielResponse.builder()
                .id(ref.getId())
                .nom(ref.getNom())
                .description(ref.getDescription())
                .taille(ref.getTaille())
                .typeContenu(ref.getTypeContenu())
                .createdByName(ref.getCreatedBy() != null ? ref.getCreatedBy().getFullName() : "")
                .createdAt(ref.getCreatedAt())
                .build();
    }
}
