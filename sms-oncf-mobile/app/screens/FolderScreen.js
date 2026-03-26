import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        screen: null,
      },
    ]
  },
  'VEILLE': {
    title: '2 - Veille',
    color: '#8E44AD',
    icon: '👁',
    subFolders: []
  },
  'GESTION_RISQUES': {
    title: '3 - Gestion des Risques',
    color: '#E74C3C',
    icon: '⚠️',
    subFolders: []
  },
  'REX': {
    title: '4 - REX',
    color: '#E67E22',
    icon: '🔄',
    subFolders: []
  },
  'CULTURE_POSITIF': {
    title: '7 - Culture Positif',
    color: '#27AE60',
    icon: '🌟',
    subFolders: []
  },
  'REFERENCIELS': {
    title: '8 - Référenciels',
    color: '#C9A84C',
    icon: '📚',
    subFolders: []
  },
};

export default function FolderScreen({ route, navigation }) {
  const { folderId } = route.params;
  const folder = FOLDERS[folderId];

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
        {folder.subFolders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🚧</Text>
            <Text style={styles.emptyText}>En cours de développement</Text>
          </View>
        ) : (
          folder.subFolders.map(sub => (
            <TouchableOpacity
              key={sub.id}
              style={[styles.subFolder, { borderLeftColor: folder.color }]}
              onPress={() => {
                if (sub.screen) {
                  navigation.navigate(sub.screen);
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