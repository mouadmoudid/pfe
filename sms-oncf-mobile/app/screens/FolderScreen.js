import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const FOLDERS = {
  'CONTROLE_INSPECTION': {
    title: '1 - Contrôle et Inspection',
    color: '#4A90D9',
    icon: '🔍',
    subFolders: [
      {
        id: 'PLANNING_ANNUEL',
        title: 'Planning Annuel',
        subtitle: 'Diagramme de Gantt S01-S53',
        icon: '📅',
        screen: 'Planning',
      },
      {
        id: 'K_CHECK_LIST',
        title: 'K Check List',
        subtitle: 'Check lists collaborateur et chantier',
        icon: '✅',
        screen: 'CheckList',
      },
      {
        id: 'COMPTE_RENDU_KN1',
        title: 'Compte Rendu de contrôles des procédures KN1',
        subtitle: 'Comptes rendus KN1 par collaborateur',
        icon: '📝',
        screen: 'CompteRendu',
      },
      {
        id: 'RAPPORT_PERIODIQUE',
        title: 'Rapport périodique de synthèse global',
        subtitle: 'Bilan mensuel des contrôles',
        icon: '📊',
        screen: 'RapportPeriodique',
      },
      {
        id: 'RACI',
        title: 'RACI',
        subtitle: 'Registre des actions de contrôle et inspection',
        icon: '📋',
        screen: 'RACI',
      },
    ]
  },

  'VEILLE': {
    title: '2 - Veille',
    color: '#8E44AD',
    icon: '👁',
    subFolders: [
      {
        id: 'PLANNING_K_COLLABORATEUR',
        title: 'Planning K Collaborateur',
        subtitle: 'Planning annuel des contrôles collaborateurs',
        icon: '📅',
        screen: 'Planning',
        params: { readOnly: true },
      },
      {
        id: 'FICHE_SUIVI',
        title: 'Fiche de Suivi Individuel',
        subtitle: 'Suivi examens et formations par collaborateur',
        icon: '📑',
        screen: 'FicheSuivi',
      },
      {
        id: 'TABLEAU_INDICATEURS',
        title: 'Tableau des indicateurs d\'alerte',
        subtitle: 'Surveillance permanente — Fiabilité humaine',
        icon: '📊',
        screen: 'TableauIndicateurs',
      },
      {
        id: 'LISTE_COLLABORATEURS',
        title: 'Liste des Collaborateurs de Sécurité',
        subtitle: 'Tous les collaborateurs avec leurs informations',
        icon: '👥',
        screen: 'ListeCollaborateurs',
      },
    ]
  },

  'GESTION_RISQUES': {
    title: '3 - Gestion des Risques',
    color: '#E74C3C',
    icon: '⚠️',
    subFolders: [
      {
        id: 'CARTOGRAPHIE_RISQUES',
        title: 'Cartographie des Risques',
        subtitle: 'Identification et maîtrise des risques LGV',
        icon: '⚠️',
        screen: 'CartographieRisques',
      },
      {
        id: 'REGISTRE_DANGERS',
        title: 'Registre des Dangers',
        subtitle: 'Par année — 5 dernières années',
        icon: '📋',
        screen: 'RegistreDangers',
      },
    ]
  },

  'REX': {
    title: '4 - REX',
    color: '#E67E22',
    icon: '🔄',
    subFolders: [
      {
        id: 'REX_REGALEUSE',
        title: 'REX — Retour d\'Expérience',
        subtitle: 'Retour d\'expérience incidents',
        icon: '📋',
        screen: 'Rex',
      },
      {
        id: 'RACE',
        title: 'RACE — Rapport d\'Analyse',
        subtitle: 'Rapport d\'Analyse Complémentaire d\'Événement',
        icon: '📊',
        screen: 'Race',
      },
    ]
  },

  'CULTURE_POSITIF': {
    title: '5 - Culture Positif',
    color: '#27AE60',
    icon: '🌟',
    subFolders: [
      {
        id: 'QUESTIONNAIRE_CULTURE',
        title: 'Questionnaire d\'évaluation de la Culture',
        subtitle: '42 questions · Anonyme · Exercice annuel',
        icon: '📝',
        screen: 'CulturePositive',
      },
      {
        id: 'REMONTEE_INFO',
        title: 'Remontée d\'information',
        subtitle: 'Collecte des retours terrain',
        icon: '📢',
        screen: 'RemonteeInfo',
      },
    ]
  },

  'REFERENCIELS': {
    title: '6 - Référenciels',
    color: '#C9A84C',
    icon: '📚',
    subFolders: [
      {
        id: 'REFERENTIELS_PDF',
        title: 'Documents Référentiels',
        subtitle: 'Procédures, normes et référentiels PDF',
        icon: '📄',
        screen: 'Referentiels',
      },
    ]
  },

  'CAPITAL_HUMAIN': {
    title: 'C.H - Capital Humain',
    color: '#16A085',
    icon: '👨‍👩‍👧‍👦',
    subFolders: [
      {
        id: 'SUIVI_CONGES',
        title: 'Suivi de Congés',
        subtitle: 'Gestion et suivi des congés du personnel',
        icon: '🏖️',
        screen: 'SuiviConges',
      },
      {
        id: 'SUIVI_ASTREINTE',
        title: 'Suivi Astreinte',
        subtitle: 'Planning des astreintes',
        icon: '📡',
        screen: 'SuiviAstreinte',
      },
      {
        id: 'ELEMENT_SOLDE',
        title: 'Élément de Solde',
        subtitle: 'Feuille d\'attachement mensuelle',
        icon: '💰',
        screen: 'ElementSolde',
      },
      {
        id: 'ACCIDENT_TRAVAIL',
        title: 'Accident Travail',
        subtitle: 'Déclaration et suivi des accidents de travail',
        icon: '🚨',
        screen: null,
      },
      {
        id: 'STAGES',
        title: 'Stages',
        subtitle: 'Gestion des stages et stagiaires',
        icon: '🎓',
        screen: null,
      },
      {
        id: 'TABLEAU_SERVICE',
        title: 'Tableau de Service',
        subtitle: 'Planning et tableau de service du personnel',
        icon: '📆',
        screen: null,
      },
      {
        id: 'REGLEMENT_CH',
        title: 'Règlement C.H',
        subtitle: 'Règlement intérieur Capital Humain',
        icon: '📜',
        screen: null,
      },
    ]
  },

  // ================================================================
  // DOSSIER CSPR / CT N2 — accessible CSPR, CET, ADMIN
  // ================================================================
  'DOSSIER_CSPR': {
    title: 'Dossier CSPr / CT N2',
    color: '#9B59B6',
    icon: '🗂️',
    roles: ['CSPR', 'CET', 'ADMIN', 'CGPX'], // rôles autorisés (CGPX = lecture seule)
    subFolders: [
      {
        id: 'PDVS_COLLAB_PROC',
        title: 'PDVS N2 — Collab / Proc',
        subtitle: 'Plan de Veille Sécurité · Collaborateurs fragilisés · Cotations S/A/M/I',
        icon: '👤',
        screen: 'PdvsCollab',
      },
      {
        id: 'PDVS_SITE',
        title: 'PDVS N2 — Site',
        subtitle: 'Sites à risques · Lien risque majeur · Cotation annuelle',
        icon: '📍',
        screen: 'PdvsSite', // ✅ développé
      },
      {
        id: 'PDVS_MANAGEMENT',
        title: 'PDVS N2 — Management',
        subtitle: '10 thèmes de management · Évaluation CDTs · Pr03/Pr08 RMS',
        icon: '🏛️',
        screen: 'PdvsManagement', // ✅ développé
      },
      {
        id: 'PLANNING_KN2',
        title: 'Planning KN2',
        subtitle: 'Planning annuel M1→M12 · CDT / KN1 / MGMT / TECH',
        icon: '📅',
        screen: 'PlanningKN2', // ✅ développé
      },
      {
        id: 'RAPPORT_KN2',
        title: 'Rapport KN2',
        subtitle: 'Compte rendu KN2 · Évaluation FOH 4 dimensions',
        icon: '📝',
        screen: null, // à développer
      },
      {
        id: 'CONTROLE_MANAGEMENT',
        title: 'Contrôle Management',
        subtitle: 'Annexe 2 IMS · 10 thèmes · C1 et C2 par CDT',
        icon: '📋',
        screen: 'ControleMgmt', // ✅ développé
      },
      {
        id: 'SYNTHESE_KN2',
        title: 'Synthèse KN2',
        subtitle: 'Rapport semestriel · Bilan quantitatif · Cotations SAMI',
        icon: '📊',
        screen: null, // à développer
      },
      {
        id: 'JOURNAL_CSSPR',
        title: 'Journal CSSPr',
        subtitle: 'Décisions CSSPr mensuelle · 4 statuts · Responsable',
        icon: '📒',
        screen: 'JournalCSSPr', // ✅ développé
      },
      {
        id: 'IFH_SURVEILLANCE',
        title: 'IFH Surveillance',
        subtitle: '22 indicateurs FOH · Prof./Socio./Psycho./Physio.',
        icon: '🔬',
        screen: 'IfohSurveillance', // ✅ développé
      },
      
      
      {
        id: 'PASF_N2',
        title: 'Contribution PASF N2',
        subtitle: 'Plan d\'actions sécurité · 8 processus · Actions FOH',
        icon: '🎯',
        screen: null, // à développer
      },
      {
        id: 'PDVS_ETE_RAMADAN',
        title: 'PDVS Été / Ramadan N2',
        subtitle: 'Actions spécifiques · Périodes estivales et Ramadan',
        icon: '☀️',
        screen: null, // à développer
      },
      {
        id: 'LEGENDE_REFERENCES',
        title: 'Légende & Références',
        subtitle: 'Cotation SAMI · Fréquences KN2 · Critères fragilisés',
        icon: '📖',
        screen: null, // à développer
      },
    ]
  },
};

// ================================================================
// SOUS-DOSSIERS CACHÉS POUR LE RÔLE AGENT
// ================================================================
const AGENT_HIDDEN = {
  CONTROLE_INSPECTION: new Set([
    'PLANNING_ANNUEL', 'K_CHECK_LIST',
    'COMPTE_RENDU_KN1', 'RAPPORT_PERIODIQUE',
  ]),
  VEILLE: new Set([
    'FICHE_SUIVI', 'TABLEAU_INDICATEURS', 'LISTE_COLLABORATEURS',
  ]),
};

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function FolderScreen({ route, navigation }) {
  const { folderId } = route.params;
  const folder = FOLDERS[folderId];
  const { user } = useAuth();
  const role = user?.role || '';
  const isAgent = role === 'AGENT';

  // Vérifier accès au dossier complet
  if (folder.roles && !folder.roles.includes(role)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>Accès non autorisé</Text>
          <Text style={[styles.emptyText, { fontSize: 12, marginTop: 6 }]}>
            Ce dossier est réservé aux rôles CSPR, CET, ADMIN et CGPX
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filtrer selon le rôle AGENT
  const visibleSubFolders = isAgent && AGENT_HIDDEN[folderId]
    ? folder.subFolders.filter(sub => !AGENT_HIDDEN[folderId].has(sub.id))
    : folder.subFolders;

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: folder.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.icon}>{folder.icon}</Text>
        <Text style={styles.title}>{folder.title}</Text>
        {/* Badge nombre de sous-dossiers */}
        <View style={[styles.countBadge, { backgroundColor: folder.color + '30',
          borderColor: folder.color }]}>
          <Text style={[styles.countText, { color: folder.color }]}>
            {visibleSubFolders.length} section{visibleSubFolders.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {visibleSubFolders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🚧</Text>
            <Text style={styles.emptyText}>En cours de développement</Text>
          </View>
        ) : (
          visibleSubFolders.map((sub, index) => (
            <TouchableOpacity
              key={sub.id}
              style={[
                styles.subFolder,
                { borderLeftColor: folder.color },
                !sub.screen && styles.subFolderDisabled,
              ]}
              onPress={() => {
                if (sub.screen) {
                  navigation.navigate(sub.screen, sub.params || {});
                }
              }}
              activeOpacity={sub.screen ? 0.7 : 1}
            >
              <View style={styles.subFolderLeft}>
                {/* Numéro */}
                <View style={[styles.numBadge, { borderColor: folder.color }]}>
                  <Text style={[styles.numText, { color: folder.color }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={styles.subIcon}>{sub.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subTitle}>{sub.title}</Text>
                  <Text style={styles.subSubtitle}>{sub.subtitle}</Text>
                </View>
              </View>
              {sub.screen ? (
                <Text style={[styles.arrow, { color: folder.color }]}>›</Text>
              ) : (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonText}>Bientôt</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
    marginBottom: 16,
  },
  backText: {
    color: '#C9A84C', fontSize: 14,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  icon: { fontSize: 44, marginBottom: 8 },
  title: {
    color: '#FFFFFF', fontSize: 18,
    fontWeight: 'bold', textAlign: 'center',
  },
  countBadge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  countText: { fontSize: 11, fontWeight: '600' },

  content: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 16, textAlign: 'center' },

  subFolder: {
    backgroundColor: '#0F2137',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subFolderDisabled: {
    opacity: 0.6,
  },
  subFolderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  numBadge: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, alignItems: 'center',
    justifyContent: 'center', marginRight: 4,
  },
  numText: { fontSize: 10, fontWeight: 'bold' },
  subIcon: { fontSize: 24, marginRight: 10 },
  subTitle: {
    color: '#FFFFFF', fontSize: 13,
    fontWeight: 'bold', marginBottom: 4,
    flex: 1, flexWrap: 'wrap',
  },
  subSubtitle: { color: '#607D8B', fontSize: 11, flexWrap: 'wrap' },
  arrow: { fontSize: 24, fontWeight: 'bold', marginLeft: 8 },
  soonBadge: {
    backgroundColor: '#1A2F4A', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    marginLeft: 8, borderWidth: 1, borderColor: '#2A4060',
  },
  soonText: { color: '#607D8B', fontSize: 10 },
});
