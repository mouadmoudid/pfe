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

            Map<Integer, Integer> prevuMap = new LinkedHashMap<>();
            Map<Integer, Integer> realiseMap = new LinkedHashMap<>();
            int totalPrevu = 0;
            int totalRealise = 0;

            for (CongeEntree e : entrees) {
                if (e.getJoursPrevu() != null && e.getJoursPrevu() > 0) {
                    prevuMap.put(e.getSemaine(), e.getJoursPrevu());
                    totalPrevu += e.getJoursPrevu();
                }
                if (e.getJoursConges() != null && e.getJoursConges() > 0) {
                    realiseMap.put(e.getSemaine(), e.getJoursConges());
                    totalRealise += e.getJoursConges();
                }
            }

            int reliquat = config.getTotalJoursDroits() - totalRealise;

            result.add(CongeTableauResponse.builder()
                .collaborateurId(collab.getId())
                .fullName(collab.getFullName())
                .matricule(collab.getMatricule() != null ? collab.getMatricule() : "")
                .fonctionAssuree(collab.getFonctionAssuree() != null ? collab.getFonctionAssuree() : collab.getPoste() != null ? collab.getPoste() : "")
                .telephone(collab.getTelephone() != null ? collab.getTelephone() : "")
                .totalJoursDroits(config.getTotalJoursDroits())
                .entreesPrevu(prevuMap)
                .entreesRealise(realiseMap)
                .totalPrevu(totalPrevu)
                .totalRealise(totalRealise)
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
        boolean isPrevu = "prevu".equals(req.getType());
        int jours = req.getJours() != null ? req.getJours() : 0;

        Optional<CongeEntree> existing = entreeRepo.findByCollaborateurIdAndAnneeAndSemaine(
            req.getCollaborateurId(), req.getAnnee(), req.getSemaine());

        CongeEntree entree;
        if (existing.isPresent()) {
            entree = existing.get();
        } else {
            if (jours == 0) return;
            User collab = userRepo.findById(req.getCollaborateurId())
                .orElseThrow(() -> new RuntimeException("Collaborateur non trouvé"));
            // Initialize both to 0 to satisfy DB NOT NULL constraint on jours_conges
            entree = CongeEntree.builder()
                .collaborateur(collab)
                .annee(req.getAnnee())
                .semaine(req.getSemaine())
                .joursConges(0)
                .joursPrevu(0)
                .createdBy(currentUser)
                .build();
        }

        if (isPrevu) {
            entree.setJoursPrevu(jours);
        } else {
            entree.setJoursConges(jours);
        }
        entree.setUpdatedBy(currentUser);

        // 0 means "not set" — delete the record only when both fields are 0
        boolean prevuVide = entree.getJoursPrevu() == null || entree.getJoursPrevu() == 0;
        boolean realiseVide = entree.getJoursConges() == null || entree.getJoursConges() == 0;
        if (prevuVide && realiseVide) {
            existing.ifPresent(entreeRepo::delete);
        } else {
            entreeRepo.save(entree);
        }
    }

    @Transactional
    public void deleteConfig(Long collaborateurId, Integer annee) {
        entreeRepo.deleteByCollaborateurIdAndAnnee(collaborateurId, annee);
        configRepo.findByCollaborateurIdAndAnnee(collaborateurId, annee)
            .ifPresent(configRepo::delete);
    }
}