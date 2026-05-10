import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAndSharePDF } from '../utils/pdfUtils';
import { API_URL } from '../services/authService';

const COLLAB_API = API_URL.replace('/auth', '/admin/collaborateurs');
const CL_API = API_URL.replace('/auth', '/checklists');

// Structure des indicateurs d'alerte (depuis la check list collaborateur)
const INDICATEURS = [
  {
    categorie: 'Indicateurs d\'alerte physiologiques et médicaux',
    color: '#E74C3C',
    items: [
      'Fatigabilité inhabituelle',
      'Variation de poids récente',
      'Intempérance',
      'Pathologie psychiatrique aiguë, bénigne ou plus grave',
      'Pathologie neurologique',
    ]
  },
  {
    categorie: 'Indicateurs d\'alerte psychologiques',
    color: '#8E44AD',
    items: [
      'Isolement volontaire',
      'Recherche inhabituelle de contact',
      'Incohérence dans le discours',
      'Consommation d\'alcool',
      'Drogue',
      'Activité extra-professionnelle incompatible avec le poste',
    ]
  },
  {
    categorie: 'Indicateurs d\'alerte professionnels',
    color: '#E67E22',
    items: [
      'Erreurs répétées',
      'Démotivation dans le travail',
      'Distraction et manque de concentration',
      'Emotivité dans le travail',
    ]
  },
  {
    categorie: 'Indicateurs d\'alerte sociologiques',
    color: '#27AE60',
    items: [
      'Maladie grave d\'un proche',
      'Maladie grave du collaborateur',
      'Deuil',
      'Séparation ou divorce',
      'Mariage',
      'Problème matériel',
      'Navette',
    ]
  },
];

export default function TableauIndicateursScreen({ navigation }) {
  const [step, setStep] = useState(0); // 0=collabs, 1=checklists, 2=tableau
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [collaborateurs, setCollaborateurs] = useState([]);
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [selectedCL, setSelectedCL] = useState(null);
  const [search, setSearch] = useState('');

  // Tableau des indicateurs calculé depuis la check list
  // { pointCle: { cotation, constatation } }
  const [indicateursData, setIndicateursData] = useState({});

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadCollaborateurs(); }, []);

  const loadCollaborateurs = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(COLLAB_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollaborateurs(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les collaborateurs');
    } finally {
      setLoading(false);
    }
  };

  const selectCollaborateur = async (collab) => {
    setLoading(true);
    setSelectedCollab(collab);
    try {
      const token = await getToken();
      const res = await axios.get(`${CL_API}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtrer les check lists COLLABORATEUR pour ce collaborateur
      const clFiltered = res.data.filter(cl =>
        cl.type === 'COLLABORATEUR' &&
        cl.collaborateurMatricule === collab.matricule
      );
      setChecklists(clFiltered);
      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les check lists');
    } finally {
      setLoading(false);
    }
  };

  const selectChecklist = async (cl) => {
    setLoading(true);
    setSelectedCL(cl);
    try {
      const token = await getToken();
      const res = await axios.get(`${CL_API}/${cl.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const items = res.data.items || [];

      // Extraire les items des indicateurs d'alerte
      const data = {};
      items.forEach(item => {
        if (item.section === 'Indicateurs de fiabilité humaine') {
          data[item.pointCle] = {
            cotation: item.cotation || 'S',
            constatation: item.constatation || '',
          };
        }
      });
      setIndicateursData(data);
      setStep(2);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger la check list');
    } finally {
      setLoading(false);
    }
  };

  // S = NON (pas d'alerte), A/M/I = OUI (alerte)
  const isAlerte = (pointCle) => {
    const d = indicateursData[pointCle];
    if (!d) return false;
    return d.cotation === 'A' || d.cotation === 'M' || d.cotation === 'I';
  };

  const getObservation = (pointCle) => {
    return indicateursData[pointCle]?.constatation || '';
  };

  const getCotation = (pointCle) => {
    return indicateursData[pointCle]?.cotation || 'S';
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const collab = selectedCollab;
      const cl = selectedCL;

      let tableRows = '';
      INDICATEURS.forEach(cat => {
        // Ligne catégorie
        tableRows += `
          <tr>
            <td colspan="4" style="background:#f0f0f0;font-weight:bold;color:${cat.color};font-size:11px;padding:6px 8px;">
              ${cat.categorie}
            </td>
          </tr>
        `;
        // Lignes items
        cat.items.forEach(item => {
          const alerte = isAlerte(item);
          const obs = getObservation(item);
          const cotation = getCotation(item);
          tableRows += `
            <tr>
              <td style="font-size:11px;padding:5px 8px;">${item}</td>
              <td style="text-align:center;font-size:11px;padding:5px 8px;">
                ${alerte ? '<span style="font-weight:bold;color:#E74C3C;">X</span>' : ''}
              </td>
              <td style="text-align:center;font-size:11px;padding:5px 8px;">
                ${!alerte ? '<span style="font-weight:bold;color:#27AE60;">X</span>' : ''}
              </td>
              <td style="font-size:11px;padding:5px 8px;">${obs}</td>
            </tr>
          `;
        });
      });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 16px; }
.header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 12px; }
.header-cell { padding: 8px 10px; border-right: 1px solid #ccc; font-size: 10px; }
.oncf-logo { color: #C9A84C; font-size: 16px; font-weight: bold; letter-spacing: 2px; }
.info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
.info-table td { padding: 5px 8px; border: 1px solid #ccc; font-size: 11px; }
.info-label { background: #f0f0f0; font-weight: bold; width: 160px; }
.title-box { text-align: center; font-weight: bold; font-size: 13px; background: #1E3A5F; color: white; padding: 8px; margin-bottom: 12px; }
table.indicateurs { width: 100%; border-collapse: collapse; }
table.indicateurs th { background: #1E3A5F; color: white; padding: 6px 8px; font-size: 11px; text-align: center; border: 1px solid #ccc; }
table.indicateurs td { border: 1px solid #ddd; vertical-align: middle; }
table.indicateurs th:first-child { text-align: left; }
.footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #607D8B; display: flex; justify-content: space-between; }
</style>
</head><body>

<div class="header-top">
  <div class="header-cell">
    <div>Référence : DR.PSC.M1C.VSF.019</div>
    <div style="font-weight:bold;margin-top:4px;">Veille Sécurité Ferroviaire</div>
  </div>
  <div class="header-cell" style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;">
    <div class="oncf-logo">ONCF</div>
    <div style="font-weight:bold;font-size:12px;">Tableau des indicateurs d'alerte</div>
    <div style="font-size:10px;">Surveillance Permanente — Fiabilité Humaine</div>
  </div>
  <div class="header-cell" style="text-align:right;">
    <div>Pôle Infrastructure &amp; Circulation</div>
    <div style="font-weight:bold;">DRI Centre</div>
  </div>
</div>

<table class="info-table" style="margin-bottom:12px;">
  <tr>
    <td class="info-label">Établissement</td>
    <td>DT 102V LGV</td>
    <td class="info-label">Année</td>
    <td>${cl?.dateControle?.substring(0, 4) || new Date().getFullYear()}</td>
  </tr>
  <tr>
    <td class="info-label">Nom et Prénom du collaborateur</td>
    <td style="font-weight:bold;">${collab?.fullName || ''}</td>
    <td class="info-label">Matricule</td>
    <td style="font-weight:bold;">${collab?.matricule || ''}</td>
  </tr>
  <tr>
    <td class="info-label">Fonction</td>
    <td colspan="3">${collab?.poste || ''}</td>
  </tr>
  <tr>
    <td class="info-label">Date du contrôle</td>
    <td colspan="3">${cl?.dateControle || ''}</td>
  </tr>
</table>

<div class="title-box">SURVEILLANCE PERMANENTE</div>

<table class="indicateurs">
  <thead>
    <tr>
      <th style="width:50%;text-align:left;">Nature des indicateurs d'alerte</th>
      <th style="width:80px;color:#E74C3C;">Oui</th>
      <th style="width:80px;color:#27AE60;">Non</th>
      <th>Observations</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<div class="footer">
  <span>ONCF · SMS · Document confidentiel — Usage interne</span>
  <span>Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
</div>

</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Indicateurs — ${collab?.fullName}` });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Liste collaborateurs =====
  if (step === 0) {
    const filtered = collaborateurs.filter(c =>
      `${c.fullName} ${c.matricule}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tableau des indicateurs d'alerte</Text>
          <Text style={styles.headerSub}>Sélectionnez un collaborateur</Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom ou matricule..."
            placeholderTextColor="#607D8B"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading
          ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {filtered.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.collabCard}
                  onPress={() => selectCollaborateur(c)}
                  activeOpacity={0.8}
                >
                  <View style={styles.collabAvatar}>
                    <Text style={styles.collabAvatarText}>{c.fullName?.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.collabName}>{c.fullName}</Text>
                    <Text style={styles.collabMatricule}>{c.matricule}</Text>
                    {c.poste && <Text style={styles.collabPoste}>{c.poste}</Text>}
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Liste check lists =====
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(0); setSelectedCollab(null); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedCollab?.fullName}</Text>
          <Text style={styles.headerSub}>Sélectionnez une check list</Text>
        </View>

        {loading
          ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.list}>
              {checklists.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>Aucune check list collaborateur</Text>
                  <Text style={styles.emptySubText}>Créez d'abord une check list pour ce collaborateur</Text>
                </View>
              ) : (
                checklists.map(cl => (
                  <TouchableOpacity
                    key={cl.id}
                    style={styles.clCard}
                    onPress={() => selectChecklist(cl)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clTitle}>Check list du {cl.dateControle}</Text>
                      <Text style={styles.clSite}>{cl.siteUp}</Text>
                      <Text style={styles.clCreatedBy}>Par : {cl.createdByName}</Text>
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </TouchableOpacity>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 2 — Tableau des indicateurs =====
  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStep(1); setSelectedCL(null); setIndicateursData({}); }}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{selectedCollab?.fullName}</Text>
              <Text style={styles.headerSub}>Check list du {selectedCL?.dateControle}</Text>
            </View>
            <TouchableOpacity
              style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF}
              disabled={generating}
            >
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>📄 PDF</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {loading
          ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
          : (
            <ScrollView style={styles.tableContainer}>

              {/* Infos collaborateur */}
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Collaborateur</Text>
                  <Text style={styles.infoValue}>{selectedCollab?.fullName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Matricule</Text>
                  <Text style={styles.infoValue}>{selectedCollab?.matricule}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fonction</Text>
                  <Text style={styles.infoValue}>{selectedCollab?.poste || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date contrôle</Text>
                  <Text style={styles.infoValue}>{selectedCL?.dateControle}</Text>
                </View>
              </View>

              {/* En-tête tableau */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Nature des indicateurs</Text>
                <Text style={[styles.tableHeaderCell, { width: 50, color: '#E74C3C' }]}>Oui</Text>
                <Text style={[styles.tableHeaderCell, { width: 50, color: '#27AE60' }]}>Non</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Observation</Text>
              </View>

              {/* Lignes indicateurs */}
              {INDICATEURS.map((cat, ci) => (
                <View key={ci}>
                  {/* Ligne catégorie */}
                  <View style={[styles.catRow, { borderLeftColor: cat.color }]}>
                    <Text style={[styles.catText, { color: cat.color }]}>{cat.categorie}</Text>
                  </View>

                  {/* Items */}
                  {cat.items.map((item, ii) => {
                    const alerte = isAlerte(item);
                    const obs = getObservation(item);
                    const cotation = getCotation(item);

                    return (
                      <View key={ii} style={[
                        styles.itemRow,
                        ii % 2 === 0 ? styles.itemRowEven : styles.itemRowOdd,
                        alerte && styles.itemRowAlerte,
                      ]}>
                        <Text style={[styles.itemText, { flex: 3 }]}>{item}</Text>

                        {/* OUI */}
                        <View style={{ width: 50, alignItems: 'center' }}>
                          {alerte && (
                            <View style={styles.checkOui}>
                              <Text style={styles.checkText}>✕</Text>
                            </View>
                          )}
                        </View>

                        {/* NON */}
                        <View style={{ width: 50, alignItems: 'center' }}>
                          {!alerte && (
                            <View style={styles.checkNon}>
                              <Text style={styles.checkText}>✕</Text>
                            </View>
                          )}
                        </View>

                        {/* Observation */}
                        <Text style={[styles.obsText, { flex: 2 }]}>{obs}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={{ height: 40 }} />
            </ScrollView>
          )
        }
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  searchBox: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 13,
  },

  list: { paddingHorizontal: 16 },
  tableContainer: { paddingHorizontal: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 4 },

  collabCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: '#8E44AD',
    flexDirection: 'row', alignItems: 'center',
  },
  collabAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#8E44AD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  collabAvatarText: { color: '#8E44AD', fontSize: 18, fontWeight: 'bold' },
  collabName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  collabMatricule: { color: '#C9A84C', fontSize: 12, marginBottom: 2 },
  collabPoste: { color: '#607D8B', fontSize: 11 },
  arrow: { color: '#8E44AD', fontSize: 22, fontWeight: 'bold', marginLeft: 8 },

  clCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderLeftWidth: 4, borderLeftColor: '#4A90D9',
    flexDirection: 'row', alignItems: 'center',
  },
  clTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  clSite: { color: '#C9A84C', fontSize: 12, marginBottom: 2 },
  clCreatedBy: { color: '#607D8B', fontSize: 11 },

  pdfBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  // Infos collaborateur
  infoCard: {
    backgroundColor: '#0F2137', borderRadius: 10,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A4060',
  },
  infoRow: {
    flexDirection: 'row', paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: '#1A2F4A',
  },
  infoLabel: { color: '#607D8B', fontSize: 11, width: 120 },
  infoValue: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', flex: 1 },

  // Tableau
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#1E3A5F',
    paddingVertical: 8, paddingHorizontal: 8,
    borderRadius: 6, marginBottom: 2,
  },
  tableHeaderCell: {
    color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', textAlign: 'center',
  },
  catRow: {
    backgroundColor: '#1A2F4A', padding: 8,
    borderLeftWidth: 4, marginBottom: 1,
  },
  catText: { fontSize: 12, fontWeight: 'bold' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 8,
    marginBottom: 1, borderRadius: 4,
  },
  itemRowEven: { backgroundColor: '#0F2137' },
  itemRowOdd: { backgroundColor: '#0D1B2A' },
  itemRowAlerte: { borderLeftWidth: 2, borderLeftColor: '#E74C3C' },
  itemText: { color: '#FFFFFF', fontSize: 11 },
  obsText: { color: '#607D8B', fontSize: 10, paddingLeft: 4 },

  checkOui: {
    width: 22, height: 22, borderRadius: 4,
    backgroundColor: '#E74C3C20', borderWidth: 1, borderColor: '#E74C3C',
    alignItems: 'center', justifyContent: 'center',
  },
  checkNon: {
    width: 22, height: 22, borderRadius: 4,
    backgroundColor: '#27AE6020', borderWidth: 1, borderColor: '#27AE60',
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
});