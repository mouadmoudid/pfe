package com.oncf.pfe.pdvs;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/pdvs/rapport-kn2")
@RequiredArgsConstructor
public class RapportKN2Controller {

    private final RapportKN2Repository       rapportRepo;
    private final RapportKN2CollabRepository collabRepo;
    private final RapportKN2SiteRepository   siteRepo;
    private final RapportKN2DocRepository    docRepo;

    // Repos auto-remplissage
    private final PdvsCollabRepository       pdvsCollabRepo;
    private final PdvsSiteRepository         pdvsSiteRepo;

    private static final Map<String, List<String>> CSPR_CDT = Map.of(
        "CT Voie", List.of("CDT 101V", "CDT 102V", "CDT OA OH OT"),
        "CT CSS",  List.of("CDT 101LC", "CDT 101SST")
    );

    // ── GET liste rapports ──
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RapportKN2Entry>> getAll(Authentication auth) {
        String role = getRole(auth), entite = getEntite(auth);
        return switch (role) {
            case "ADMIN", "CET" -> ResponseEntity.ok(rapportRepo.findAllByOrderByDateRapportDesc());
            case "CSPR" -> ResponseEntity.ok(
                rapportRepo.findByEntiteCSPROrderByDateRapportDesc(entite));
            case "CGPX" -> {
                String cspr = findCSPR(entite);
                yield cspr != null
                    ? ResponseEntity.ok(rapportRepo.findByEntiteCSPROrderByDateRapportDesc(cspr))
                    : ResponseEntity.ok(List.of());
            }
            default -> ResponseEntity.status(403).build();
        };
    }

    // ── GET un rapport complet avec ses sections ──
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Long id) {
        return rapportRepo.findById(id).map(r -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("rapport",    r);
            result.put("collabs",    collabRepo.findByRapportIdOrderByOrdreAsc(id));
            result.put("sites",      siteRepo.findByRapportIdOrderByOrdreAsc(id));
            result.put("docs",       docRepo.findByRapportIdOrderByOrdreAsc(id));
            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── GET données auto pour un CDT ──
    @GetMapping("/init-data")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Map<String, Object>> getInitData(
            @RequestParam String cdtControle,
            @RequestParam Integer annee,
            @RequestParam String semestre,
            Authentication auth) {

        String entite = getEntite(auth);
        Map<String, Object> result = new LinkedHashMap<>();

        // Section 2 — PDVS Collab : collaborateurs + procédures + SAMI du CDT
        // Filter by entite (CSPR) OR cdtControle (CDT) to cover both storage conventions
        List<PdvsCollabEntry> collabs = pdvsCollabRepo.findAll().stream()
            .filter(c -> (entite.equals(c.getEntite()) || cdtControle.equals(c.getEntite()))
                && annee.equals(c.getAnnee())
                && semestre.equals(c.getSemestre()))
            .toList();
        result.put("collabsAuto", collabs.stream()
            .flatMap(c -> buildProcedureEntries(c).stream())
            .toList());

        // Section 3 — PDVS Site : lieu + obs + actionN2 du CDT
        List<PdvsSiteEntry> sites = pdvsSiteRepo.findAll().stream()
            .filter(s -> (entite.equals(s.getEntite()) || cdtControle.equals(s.getEntite()))
                && annee.equals(s.getAnnee())
                && semestre.equals(s.getSemestre()))
            .toList();
        result.put("sitesAuto", sites.stream().map(s -> Map.of(
            "lieu",         s.getSite() != null ? s.getSite() : "",
            "observations", s.getObservations() != null ? s.getObservations() : "",
            "actionsN2",    s.getActionsN2() != null ? s.getActionsN2() : ""
        )).toList());

        return ResponseEntity.ok(result);
    }

    // ── POST créer rapport ──
    @PostMapping
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> create(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        String entite = getEntite(auth);

        // Rapport principal
        RapportKN2Entry rapport = buildRapport(body, entite, auth.getName());
        rapport = rapportRepo.save(rapport);

        // Sections
        saveCollabs(body, rapport);
        saveSites(body, rapport);
        saveDocs(body, rapport);

        return ResponseEntity.ok(getFullRapport(rapport.getId()));
    }

    // ── PUT modifier rapport ──
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        return rapportRepo.findById(id).map(existing -> {
            String entite = getEntite(auth);
            RapportKN2Entry updated = buildRapport(body, entite, auth.getName());
            updated.setId(id);
            updated.setCreatedAt(existing.getCreatedAt());
            rapportRepo.save(updated);

            // Supprimer et recréer les sections
            collabRepo.deleteByRapportId(id);
            siteRepo.deleteByRapportId(id);
            docRepo.deleteByRapportId(id);
            saveCollabs(body, updated);
            saveSites(body, updated);
            saveDocs(body, updated);

            return ResponseEntity.ok(getFullRapport(id));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CSPR','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        collabRepo.deleteByRapportId(id);
        siteRepo.deleteByRapportId(id);
        docRepo.deleteByRapportId(id);
        rapportRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ── helpers ──
    @SuppressWarnings("unchecked")
    private void saveCollabs(Map<String, Object> body, RapportKN2Entry rapport) {
        List<Map<String,Object>> list =
            (List<Map<String,Object>>) body.getOrDefault("collabs", List.of());
        for (int i = 0; i < list.size(); i++) {
            Map<String,Object> c = list.get(i);
            collabRepo.save(RapportKN2CollabEntry.builder()
                .rapport(rapport).ordre(i + 1)
                .collabNom(str(c, "collabNom"))
                .procedure(str(c, "procedure"))
                .cotationSAMI(str(c, "cotationSAMI"))
                .constatations(str(c, "constatations"))
                .nature(str(c, "nature"))
                .build());
        }
    }

    @SuppressWarnings("unchecked")
    private void saveSites(Map<String, Object> body, RapportKN2Entry rapport) {
        List<Map<String,Object>> list =
            (List<Map<String,Object>>) body.getOrDefault("sites", List.of());
        for (int i = 0; i < list.size(); i++) {
            Map<String,Object> s = list.get(i);
            siteRepo.save(RapportKN2SiteEntry.builder()
                .rapport(rapport).ordre(i + 1)
                .lieu(str(s, "lieu"))
                .observations(str(s, "observations"))
                .actionsN2(str(s, "actionsN2"))
                .isKm(str(s, "isKm"))
                .build());
        }
    }

    @SuppressWarnings("unchecked")
    private void saveDocs(Map<String, Object> body, RapportKN2Entry rapport) {
        List<Map<String,Object>> list =
            (List<Map<String,Object>>) body.getOrDefault("docs", List.of());
        for (int i = 0; i < list.size(); i++) {
            Map<String,Object> d = list.get(i);
            docRepo.save(RapportKN2DocEntry.builder()
                .rapport(rapport).ordre(i + 1)
                .designation(str(d, "designation"))
                .existe(str(d, "existe"))
                .aJour(str(d, "aJour"))
                .maitrisee(str(d, "maitrisee"))
                .actions(str(d, "actions"))
                .build());
        }
    }

    @SuppressWarnings("unchecked")
    private RapportKN2Entry buildRapport(
            Map<String,Object> body, String entite, String saisiPar) {
        return RapportKN2Entry.builder()
            .entiteCSPR(entite)
            .dateRapport(java.time.LocalDate.parse(str(body, "dateRapport")))
            .typeRapport(str(body, "typeRapport"))
            .cdtControle(str(body, "cdtControle"))
            .parNom(str(body, "parNom"))
            .parFonction(str(body, "parFonction"))
            // Section 1
            .s1Organisation(str(body, "s1Organisation"))
            .s1Execution(str(body, "s1Execution"))
            .s1Qualite(str(body, "s1Qualite"))
            .s1ActionsKN1(str(body, "s1ActionsKN1"))
            .s1Bouclage(str(body, "s1Bouclage"))
            // Section 4
            .s4Observations(str(body, "s4Observations"))
            // Section 5
            .s5OrgMgmtConstatations(str(body, "s5OrgMgmtConstatations"))
            .s5OrgMgmtActions(str(body, "s5OrgMgmtActions"))
            .s5OrgMgmtBouclage(str(body, "s5OrgMgmtBouclage"))
            .s5CollectifsConstatations(str(body, "s5CollectifsConstatations"))
            .s5CollectifsActions(str(body, "s5CollectifsActions"))
            .s5CollectifsBouclage(str(body, "s5CollectifsBouclage"))
            .s5SituationsConstatations(str(body, "s5SituationsConstatations"))
            .s5SituationsActions(str(body, "s5SituationsActions"))
            .s5SituationsBouclage(str(body, "s5SituationsBouclage"))
            .s5IndividusConstatations(str(body, "s5IndividusConstatations"))
            .s5IndividusActions(str(body, "s5IndividusActions"))
            .s5IndiviusBouclage(str(body, "s5IndiviusBouclage"))
            // Section 6
            .s6Synthese(str(body, "s6Synthese"))
            .s6PointsForts(str(body, "s6PointsForts"))
            .s6AAmeliorer(str(body, "s6AAmeliorer"))
            .s6Recommandations(str(body, "s6Recommandations"))
            .s6Echeance(str(body, "s6Echeance"))
            .saisiPar(saisiPar)
            .build();
    }

    private Map<String, Object> getFullRapport(Long id) {
        Map<String, Object> result = new LinkedHashMap<>();
        rapportRepo.findById(id).ifPresent(r -> result.put("rapport", r));
        result.put("collabs", collabRepo.findByRapportIdOrderByOrdreAsc(id));
        result.put("sites",   siteRepo.findByRapportIdOrderByOrdreAsc(id));
        result.put("docs",    docRepo.findByRapportIdOrderByOrdreAsc(id));
        return result;
    }

    private List<Map<String, String>> buildProcedureEntries(PdvsCollabEntry c) {
        String nom = c.getCollaborateurNom() != null ? c.getCollaborateurNom() : "";
        Map<String, String> procs = new LinkedHashMap<>();
        if (notBlank(c.getSp320()))     procs.put("SP320",          c.getSp320());
        if (notBlank(c.getS2b()))       procs.put("S2B",            c.getS2b());
        if (notBlank(c.getS9a()))       procs.put("S9A",            c.getS9a());
        if (notBlank(c.getS9b()))       procs.put("S9B",            c.getS9b());
        if (notBlank(c.getCgS2c()))     procs.put("CG S2C",         c.getCgS2c());
        if (notBlank(c.getConsLoc()))   procs.put("Cons. Loc.",     c.getConsLoc());
        if (notBlank(c.getGuides()))    procs.put("Guides",         c.getGuides());
        if (notBlank(c.getRefInterv())) procs.put("Réf. Interv.",  c.getRefInterv());
        if (notBlank(c.getRefNormes())) procs.put("Réf. Normes",   c.getRefNormes());
        if (notBlank(c.getRefSecCh()))  procs.put("Réf. Séc. Ch.", c.getRefSecCh());
        if (notBlank(c.getRefTour()))   procs.put("Réf. Tour.",    c.getRefTour());
        if (notBlank(c.getInR3001()))   procs.put("IN R3001",      c.getInR3001());
        List<Map<String, String>> entries = new ArrayList<>();
        for (Map.Entry<String, String> e : procs.entrySet())
            entries.add(Map.of("collabNom", nom, "procedure", e.getKey(), "cotationSAMI", e.getValue()));
        if (entries.isEmpty())
            entries.add(Map.of("collabNom", nom, "procedure", "",
                "cotationSAMI", c.getCotationN2() != null ? c.getCotationN2() : ""));
        return entries;
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private String str(Map<String,Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : "";
    }
    private String getRole(Authentication a) {
        return a.getAuthorities().stream()
            .map(x -> x.getAuthority().replace("ROLE_","")).findFirst().orElse("");
    }
    private String getEntite(Authentication a) {
        try { return (String) a.getPrincipal().getClass()
            .getMethod("getEntite").invoke(a.getPrincipal());
        } catch (Exception e) { return ""; }
    }
    private String findCSPR(String entite) {
        for (var e : CSPR_CDT.entrySet())
            if (e.getValue().contains(entite)) return e.getKey();
        return null;
    }
}
