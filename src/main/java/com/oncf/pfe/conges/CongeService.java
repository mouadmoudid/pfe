package com.oncf.pfe.conges;

import com.oncf.pfe.user.User;
import com.oncf.pfe.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CongeService {

    private final CongeConfigRepository configRepo;
    private final CongeEntreeRepository entreeRepo;
    private final UserRepository userRepo;

    public List<Integer> getAnnees() {
        return configRepo.findDistinctAnnees();
    }

    public List<CongeTableauResponse> getTableau(Integer annee) {
        List<CongeConfig> configs = configRepo.findByAnneeOrderByCollaborateurFullNameAsc(annee);
        List<CongeTableauResponse> result = new ArrayList<>();

        for (CongeConfig config : configs) {
            User collab = config.getCollaborateur();
            List<CongeEntree> entrees = entreeRepo.findByCollaborateurIdAndAnneeOrderBySemaineAsc(collab.getId(), annee);

            Map<Integer, Integer> entreesMap = new LinkedHashMap<>();
            int totalPris = 0;
            for (CongeEntree e : entrees) {
                entreesMap.put(e.getSemaine(), e.getJoursConges());
                totalPris += e.getJoursConges();
            }

            int reliquat = config.getTotalJoursDroits() - totalPris;

            result.add(CongeTableauResponse.builder()
                .collaborateurId(collab.getId())
                .fullName(collab.getFullName())
                .matricule(collab.getMatricule() != null ? collab.getMatricule() : "")
                .fonctionAssuree(collab.getFonctionAssuree() != null ? collab.getFonctionAssuree() : collab.getPoste() != null ? collab.getPoste() : "")
                .telephone(collab.getTelephone() != null ? collab.getTelephone() : "")
                .totalJoursDroits(config.getTotalJoursDroits())
                .entrees(entreesMap)
                .totalPris(totalPris)
                .reliquat(reliquat)
                .build());
        }

        // Trier par fonctionAssuree puis fullName
        result.sort(Comparator
            .comparing(CongeTableauResponse::getFonctionAssuree)
            .thenComparing(CongeTableauResponse::getFullName));

        return result;
    }

    @Transactional
    public CongeConfig saveConfig(CongeConfigRequest req, User currentUser) {
        Optional<CongeConfig> existing = configRepo.findByCollaborateurIdAndAnnee(req.getCollaborateurId(), req.getAnnee());
        User collab = userRepo.findById(req.getCollaborateurId())
            .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));

        CongeConfig config = existing.orElse(CongeConfig.builder()
            .collaborateur(collab)
            .annee(req.getAnnee())
            .createdBy(currentUser)
            .build());

        config.setTotalJoursDroits(req.getTotalJoursDroits());
        return configRepo.save(config);
    }

    @Transactional
    public void saveEntree(CongeEntreeRequest req, User currentUser) {
        Optional<CongeEntree> existing = entreeRepo.findByCollaborateurIdAndAnneeAndSemaine(
            req.getCollaborateurId(), req.getAnnee(), req.getSemaine());

        if (req.getJoursConges() == 0) {
            existing.ifPresent(entreeRepo::delete);
            return;
        }

        User collab = userRepo.findById(req.getCollaborateurId())
            .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));

        CongeEntree entree = existing.orElse(CongeEntree.builder()
            .collaborateur(collab)
            .annee(req.getAnnee())
            .semaine(req.getSemaine())
            .createdBy(currentUser)
            .build());

        entree.setJoursConges(req.getJoursConges());
        entree.setUpdatedBy(currentUser);
        entreeRepo.save(entree);
    }

    @Transactional
    public void deleteConfig(Long collaborateurId, Integer annee) {
        entreeRepo.deleteByCollaborateurIdAndAnnee(collaborateurId, annee);
        configRepo.findByCollaborateurIdAndAnnee(collaborateurId, annee)
            .ifPresent(configRepo::delete);
    }
}