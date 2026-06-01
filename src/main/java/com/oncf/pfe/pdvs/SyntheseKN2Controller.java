package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/synthese-kn2")
@RequiredArgsConstructor
public class SyntheseKN2Controller {

    private final SyntheseKN2Repository    synRepo;
    private final SyntheseFragiliteRepository fragRepo;
    private final SyntheseRecoRepository   recoRepo;

    // Repos des autres feuilles pour calculs auto
    private final PlanningKN2Repository    planningRepo;
    private final ControleMgmtRepository   controleMgmtRepo;
    private final PdvsCollabRepository     collabRepo;

    private static final Map<String, List<String>> CSPR_CDT = Map.of(
        "CT Voie", List.of("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  List.of("CDT 101LC", "CDT 101SST")
    );

    private static final Map<String, List<String>> CDT_KEYS = Map.of(
        "CT Voie", List.of("cdt101v", "cdt102v", "cdtOa"),
        "CT CSS",  List.of("cdt101lc", "cdt101sst")
    );

    // ================================================================
    // GET — données complètes (auto + manuelles)
    // ================================================================
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getSynthese(
            @RequestParam Integer annee,
            @RequestParam String  semestre,
            Authentication auth) {

        String role   = getRole(auth);
        String entite = getEntite(auth);
        if (role.equals("CGPX")) {
            entite = findCSPRForCGPX(entite);
            if (entite == null) return ResponseEntity.ok(Map.of());
        }

        Map<String, Object> bilanAuto    = computeBilanAuto(entite, annee, semestre);
        Map<String, Object> cotationsAuto = computeCotationsAuto(entite, annee, semestre);

        Optional<SyntheseKN2Entry> manual =
            synRepo.findByEntiteCSPRAndAnneeAndSemestre(entite, annee, semestre);

        List<SyntheseFragiliteEntry> fragilites =
            fragRepo.findByEntiteCSPRAndAnneeAndSemestreOrderByOrdreAsc(entite, annee, semestre);

        List<SyntheseRecoEntry> recos =
            recoRepo.findByEntiteCSPRAndAnneeAndSemestreOrderByOrdreAsc(entite, annee, semestre);

        Map<String, Object> result = new HashMap<>();
        result.put("entiteCSPR",    entite);
        result.put("annee",         annee);
        result.put("semestre",      semestre);
        result.put("bilanAuto",     bilanAuto);
        result.put("cotationsAuto", cotationsAuto);
        result.put("manual",        manual.orElse(null));
        result.put("fragilites",    fragilites);
        result.put("recommandations", recos);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/annees")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Integer>> getAnnees() {
        List<Integer> annees = synRepo.findDistinctAnnees();
        if (annees.isEmpty()) annees = List.of(java.time.Year.now().getValue());
        return ResponseEntity.ok(annees);
    }

    // ================================================================
    // PUT — objectifs + tendances (partie manuelle)
    // ================================================================
    @PutMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> saveManual(
            @RequestBody SyntheseKN2Entry body, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        if (role.equals("CSPR")) body.setEntiteCSPR(entite);
        body.setSaisiPar(auth.getName());

        SyntheseKN2Entry saved = synRepo
            .findByEntiteCSPRAndAnneeAndSemestre(
                body.getEntiteCSPR(), body.getAnnee(), body.getSemestre())
            .map(e -> {
                e.setObjectifKN2(body.getObjectifKN2());
                e.setObjectifKN1(body.getObjectifKN1());
                e.setObjectifMI(body.getObjectifMI());
                e.setObjectifTauxPDVS(body.getObjectifTauxPDVS());
                e.setTendanceS(body.getTendanceS());
                e.setTendanceA(body.getTendanceA());
                e.setTendanceM(body.getTendanceM());
                e.setTendanceI(body.getTendanceI());
                e.setSaisiPar(body.getSaisiPar());
                return synRepo.save(e);
            })
            .orElseGet(() -> synRepo.save(body));
        return ResponseEntity.ok(saved);
    }

    // ================================================================
    // FRAGILITÉS CRUD
    // ================================================================
    @PostMapping("/fragilites")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> createFragilite(
            @RequestBody SyntheseFragiliteEntry entry, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);
        entry.setOrdre(
            fragRepo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee(), entry.getSemestre()) + 1);
        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(fragRepo.save(entry));
    }

    @PutMapping("/fragilites/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> updateFragilite(@PathVariable Long id,
            @RequestBody SyntheseFragiliteEntry body, Authentication auth) {
        return fragRepo.findById(id).map(e -> {
            e.setDomaine(body.getDomaine()); e.setDescription(body.getDescription());
            e.setCdt(body.getCdt()); e.setGravite(body.getGravite());
            e.setAction(body.getAction()); e.setEcheance(body.getEcheance());
            e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(fragRepo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/fragilites/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> deleteFragilite(@PathVariable Long id) {
        fragRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ================================================================
    // RECOMMANDATIONS CRUD
    // ================================================================
    @PostMapping("/recommandations")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> createReco(
            @RequestBody SyntheseRecoEntry entry, Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        if (role.equals("CSPR")) entry.setEntiteCSPR(entite);
        entry.setOrdre(
            recoRepo.findMaxOrdre(entry.getEntiteCSPR(), entry.getAnnee(), entry.getSemestre()) + 1);
        entry.setSaisiPar(auth.getName());
        return ResponseEntity.ok(recoRepo.save(entry));
    }

    @PutMapping("/recommandations/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> updateReco(@PathVariable Long id,
            @RequestBody SyntheseRecoEntry body, Authentication auth) {
        return recoRepo.findById(id).map(e -> {
            e.setRecommandation(body.getRecommandation()); e.setDestinataire(body.getDestinataire());
            e.setPriorite(body.getPriorite()); e.setEcheance(body.getEcheance());
            e.setSuivi(body.getSuivi()); e.setSaisiPar(auth.getName());
            return ResponseEntity.ok(recoRepo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/recommandations/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> deleteReco(@PathVariable Long id) {
        recoRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ================================================================
    // CALCULS AUTOMATIQUES
    // ================================================================
    private Map<String, Object> computeBilanAuto(
            String entiteCSPR, Integer annee, String semestre) {

        Map<String, Object> bilan = new LinkedHashMap<>();
        List<String> cdts = CSPR_CDT.getOrDefault(entiteCSPR, List.of());

        // ── Nb KN2 réalisés par CDT ──
        // Depuis Planning KN2 : type CDT, mois réalisés (R ou PR) dans le semestre
        List<PlanningKN2Entry> planning =
            planningRepo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entiteCSPR, annee);

        Map<String, Integer> kn2 = new LinkedHashMap<>();
        for (String cdt : cdts) {
            int count = (int) planning.stream()
                .filter(l -> "CDT".equals(l.getType())
                    && l.getCtEntite() != null
                    && l.getCtEntite().contains(cdt))
                .mapToLong(l -> countRealises(l, semestre))
                .sum();
            kn2.put(cdt, count);
        }
        kn2.put("total", kn2.values().stream().mapToInt(Integer::intValue).sum());
        bilan.put("kn2Realises", kn2);

        // ── Nb KN1 évalués ──
        Map<String, Integer> kn1 = new LinkedHashMap<>();
        for (String cdt : cdts) {
            int count = (int) planning.stream()
                .filter(l -> "KN1".equals(l.getType()))
                .mapToLong(l -> countRealises(l, semestre))
                .sum();
            kn1.put(cdt, count);
        }
        kn1.put("total", kn1.values().stream().mapToInt(Integer::intValue).sum());
        bilan.put("kn1Evalues", kn1);

        // ── Actions M/I bouclées depuis PdvsCollab ──
        // ⚡ FIX : utiliser findAll() et filtrer en Java
        // pour éviter le problème de méthode inexistante
        List<PdvsCollabEntry> allCollabs = collabRepo.findAll();
        List<PdvsCollabEntry> collabs = allCollabs.stream()
            .filter(c -> entiteCSPR.equals(c.getEntite())
                && semestre.equals(c.getSemestre())
                && annee.equals(c.getAnnee()))
            .toList();

        int miBoucle = (int) collabs.stream()
            .filter(c -> ("M".equals(c.getCotationN2()) || "I".equals(c.getCotationN2()))
                && c.getBouclage() != null && !c.getBouclage().isBlank())
            .count();
        int miTotal = (int) collabs.stream()
            .filter(c -> "M".equals(c.getCotationN2()) || "I".equals(c.getCotationN2()))
            .count();

        Map<String, Integer> mi = new LinkedHashMap<>();
        mi.put("bouclees", miBoucle);
        mi.put("total",    miTotal);
        bilan.put("actionsMI", mi);

        // ── Taux PDVS N1 ──
        long totalCot = collabs.stream()
            .filter(c -> c.getCotationN2() != null).count();
        long bonnes   = collabs.stream()
            .filter(c -> "S".equals(c.getCotationN2()) || "A".equals(c.getCotationN2())).count();
        double taux = totalCot > 0
            ? Math.round(bonnes * 100.0 / totalCot * 10) / 10.0 : 0.0;
        bilan.put("tauxPDVS", taux);

        return bilan;
    }

    private Map<String, Object> computeCotationsAuto(
            String entiteCSPR, Integer annee, String semestre) {

        List<String> cdts    = CSPR_CDT.getOrDefault(entiteCSPR, List.of());
        List<String> cdtKeys = CDT_KEYS.getOrDefault(entiteCSPR, List.of());

        List<ControleMgmtEntry> mgmt =
            controleMgmtRepo.findByEntiteCSPRAndAnneeOrderByOrdreAsc(entiteCSPR, annee);
        String suffix = semestre.equals("S1") ? "C1" : "C2";

        // Use a strongly-typed map to avoid unchecked casts
        Map<String, Map<String, Object>> rows = new LinkedHashMap<>();
        for (String sami : List.of("S", "A", "M", "I")) {
            Map<String, Object> row = new LinkedHashMap<>();
            int total = 0;
            for (int i = 0; i < cdtKeys.size(); i++) {
                String key = cdtKeys.get(i) + suffix;
                String cdt = cdts.get(i);
                int count = (int) mgmt.stream()
                    .filter(m -> sami.equals(getFieldValue(m, key)))
                    .count();
                row.put(cdt, count);
                total += count;
            }
            row.put("total", total);
            rows.put(sami, row);
        }

        int grandTotal = rows.values().stream()
            .mapToInt(r -> {
                Object v = r.get("total");
                return v instanceof Integer ? (Integer) v : 0;
            })
            .sum();

        for (Map<String, Object> row : rows.values()) {
            Object totObj = row.get("total");
            int tot = totObj instanceof Integer ? (Integer) totObj : 0;
            row.put("pct", grandTotal > 0
                ? Math.round(tot * 100.0 / grandTotal * 10) / 10.0 : 0.0);
        }

        return new LinkedHashMap<>(rows);
    }

    // Compter mois réalisés (R ou PR) selon semestre
    // Arrays.asList tolère les null contrairement à List.of
    private long countRealises(PlanningKN2Entry l, String semestre) {
        List<String> mois = semestre.equals("S1")
            ? Arrays.asList(l.getM1(), l.getM2(), l.getM3(), l.getM4(),  l.getM5(),  l.getM6())
            : Arrays.asList(l.getM7(), l.getM8(), l.getM9(), l.getM10(), l.getM11(), l.getM12());
        return mois.stream()
            .filter(m -> "R".equals(m) || "PR".equals(m))
            .count();
    }

    // Lire champ dynamiquement via reflection
    private String getFieldValue(ControleMgmtEntry e, String fieldName) {
        try {
            String getter = "get"
                + fieldName.substring(0, 1).toUpperCase()
                + fieldName.substring(1);
            return (String) ControleMgmtEntry.class
                .getMethod(getter).invoke(e);
        } catch (Exception ex) { return null; }
    }

    private String findCSPRForCGPX(String entite) {
        for (Map.Entry<String, List<String>> e : CSPR_CDT.entrySet())
            if (e.getValue().contains(entite)) return e.getKey();
        return null;
    }

    private String getRole(Authentication a) {
        return a.getAuthorities().stream()
            .map(x -> x.getAuthority().replace("ROLE_", ""))
            .findFirst().orElse("");
    }

    private String getEntite(Authentication a) {
        try { return (String) a.getPrincipal().getClass()
            .getMethod("getEntite").invoke(a.getPrincipal());
        } catch (Exception e) { return ""; }
    }
}
