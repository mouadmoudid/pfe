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
        params: {},
      },
      {
        id: 'TABLEAU_INDICATEURS',
        title: 'Tableau des indicateurs d\'alerte',
        subtitle: 'Surveillance permanente — Fiabilité humaine',
        icon: '📊',
        screen: 'TableauIndicateurs',
        params: {},
      },
      {
        id: 'LISTE_COLLABORATEURS',
        title: 'Liste des Collaborateurs de Sécurité',
        subtitle: 'Tous les collaborateurs avec leurs informations',
        icon: '👥',
        screen: 'ListeCollaborateurs',
        params: {},
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
        params: {},
      },
      {
        id: 'REGISTRE_DANGERS',
        title: 'Registre des Dangers',
        subtitle: 'Par année — 5 dernières années',
        icon: '📋',
        screen: 'RegistreDangers',
        params: {},
      }
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
        params: {},
      },
      {
        id: 'RACE',
        title: 'RACE — Rapport d\'Analyse',
        subtitle: 'Rapport d\'Analyse Complémentaire d\'Événement',
        icon: '📊',
        screen: 'Race',
        params: {},
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
        params: {},
      },
      {
        id: 'REMONTEE_INFO',
        title: 'Remontée d\'information',
        subtitle: 'Collecte des retours terrain',
        icon: '📢',
        screen: 'RemonteeInfo',
        params: {},
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
        params: {},
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
      { id: 'SUIVI_ASTREINTE',
        title: 'Suivi Astreinte', 
        subtitle: 'Planning des astreintes', 
        icon: '📡', 
        screen: 'SuiviAstreinte', 
        params: {} 
      },
      {
        id: 'ELEMENT_SOLDE',
        title: 'Élément de Solde',
        subtitle: 'Éléments de paie et de solde',
        icon: '💰',
        screen: null,
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
};

// Sous-dossiers cachés pour le rôle AGENT par catégorie
const AGENT_HIDDEN = {
  CONTROLE_INSPECTION: new Set(['PLANNING_ANNUEL', 'K_CHECK_LIST', 'COMPTE_RENDU_KN1', 'RAPPORT_PERIODIQUE']),
  VEILLE: new Set(['FICHE_SUIVI', 'TABLEAU_INDICATEURS', 'LISTE_COLLABORATEURS']),
};

export default function FolderScreen({ route, navigation }) {
  const { folderId } = route.params;
  const folder = FOLDERS[folderId];
  const { user } = useAuth();
  const isAgent = user?.role === 'AGENT';

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
      </View>

      <ScrollView style={styles.content}>
        {visibleSubFolders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🚧</Text>
            <Text style={styles.emptyText}>En cours de développement</Text>
          </View>
        ) : (
          visibleSubFolders.map(sub => (
            <TouchableOpacity
              key={sub.id}
              style={[styles.subFolder, { borderLeftColor: folder.color }]}
              onPress={() => {
                if (sub.screen) {
                  navigation.navigate(sub.screen, sub.params || {});
                }
              }}
              activeOpacity={sub.screen ? 0.7 : 1}
            >
              <View style={styles.subFolderLeft}>
                <Text style={styles.subIcon}>{sub.icon}</Text>
                <View>
                  <Text style={styles.subTitle}>{sub.title}</Text>
                  <Text style={styles.subSubtitle}>{sub.subtitle}</Text>
                </View>
              </View>
              {sub.screen && (
                <Text style={[styles.arrow, { color: folder.color }]}>›</Text>
              )}
              {!sub.screen && (
                <Text style={styles.soon}>Bientôt</Text>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
    marginBottom: 16,
  },
  backText: { color: '#C9A84C', fontSize: 14, alignSelf: 'flex-start', marginBottom: 12 },
  icon: { fontSize: 44, marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },

  content: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 16 },

  subFolder: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 16, marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subFolderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  subIcon: { fontSize: 28, marginRight: 14 },
  subTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4, flex: 1, flexWrap: 'wrap' },
  subSubtitle: { color: '#607D8B', fontSize: 12 },
  arrow: { fontSize: 24, fontWeight: 'bold', marginLeft: 8 },
  soon: {
    color: '#607D8B', fontSize: 10,
    backgroundColor: '#1A2F4A',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, marginLeft: 8,
  },
});