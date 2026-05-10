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

const USERS_API = API_URL.replace('/auth', '/admin/users');
const FICHE_API = API_URL.replace('/auth', '/fiche-suivi');

export default function ListeCollaborateursScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [users, setUsers] = useState([]);
  const [fichesMap, setFichesMap] = useState({}); // { userId: [fiches] }
  const [search, setSearch] = useState('');
  const [responsable, setResponsable] = useState('');
  const [dateMAJ, setDateMAJ] = useState(new Date().toLocaleDateString('fr-FR'));

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setResponsable(user.fullName || '');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();

      // Charger tous les utilisateurs
      const usersRes = await axios.get(USERS_API, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allUsers = usersRes.data.filter(u => u.role !== 'ADMIN');
      setUsers(allUsers);

      // Charger les fiches de suivi pour chaque utilisateur
      const fichesData = {};
      await Promise.all(allUsers.map(async (u) => {
        try {
          const ficheRes = await axios.get(
            `${FICHE_API}/collaborateur/${u.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fichesData[u.id] = ficheRes.data || [];
        } catch {
          fichesData[u.id] = [];
        }
      }));
      setFichesMap(fichesData);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les observations d'un utilisateur (examens + formations)
  const getObservations = (userId) => {
    const fiches = fichesMap[userId] || [];
    return fiches
      .filter(f => f.observation && f.observation.trim() !== '')
      .map(f => f.observation.trim())
      .join(' | ');
  };

  const filtered = users.filter(u =>
    `${u.fullName} ${u.matricule} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const generatePDF = async () => {
    setGenerating(true);
    try {
      let rows = '';
      filtered.forEach((u, idx) => {
        const obs = getObservations(u.id);
        const nomParts = (u.fullName || '').split(' ');
        const nom = nomParts[0] || '';
        const prenom = nomParts.slice(1).join(' ') || u.prenom || '';

        rows += `
          <tr style="${idx % 2 === 0 ? '' : 'background:#f5f5f5;'}">
            <td style="font-size:10px;padding:4px 6px;font-weight:bold;">${nom}</td>
            <td style="font-size:10px;padding:4px 6px;">${prenom}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.matricule || ''}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.dateNaissance || ''}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.fonctionAssuree || u.poste || ''}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.dateFonction || ''}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.entite || ''}</td>
            <td style="font-size:10px;padding:4px 6px;">${u.residence || ''}</td>
            <td style="font-size:10px;padding:4px 6px;color:${obs ? '#E74C3C' : '#1a1a2e'};">${obs || ''}</td>
          </tr>
        `;
      });

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a2e; padding: 12px; }
.header-top { display: grid; grid-template-columns: 1fr 2fr 1fr; border: 1px solid #ccc; margin-bottom: 10px; }
.header-cell { padding: 6px 10px; border-right: 1px solid #ccc; font-size: 9px; }
.oncf-logo { color: #C9A84C; font-size: 18px; font-weight: bold; letter-spacing: 2px; }
.title-center { text-align: center; font-weight: bold; font-size: 13px; margin-bottom: 2px; }
.info-row { display: flex; gap: 20px; margin-bottom: 8px; font-size: 10px; }
.info-label { font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th { background: #1E3A5F; color: white; padding: 5px 6px; font-size: 10px; text-align: left; border: 1px solid #ccc; }
td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: middle; }
.footer { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10px; }
.footer-box { }
.footer-label { font-weight: bold; }
</style>
</head><body>

<div class="header-top">
  <div class="header-cell">
    <div>Référence : DR.PSC.M1C.VSF.019</div>
    <div style="margin-top:2px;">Version 1 du 20/06/2013</div>
    <div style="margin-top:2px;">Veille sécurité ferroviaire</div>
  </div>
  <div class="header-cell" style="text-align:center;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;">
    <div class="oncf-logo">ONCF</div>
    <div class="title-center">Liste des Collaborateurs de Sécurité</div>
    <div style="font-weight:bold;font-size:11px;">Année ${new Date().getFullYear()}</div>
  </div>
  <div class="header-cell" style="text-align:right;">
    <div>PIC / DRI Centre</div>
    <div style="font-weight:bold;">AMI LGV</div>
    <div style="font-weight:bold;">DT 102V LGV</div>
  </div>
</div>

<div class="info-row">
  <div><span class="info-label">Date de mise à jour</span> &nbsp; ${dateMAJ}</div>
  <div><span class="info-label">Par</span> &nbsp; Mr ${responsable}</div>
  <div><span class="info-label">Établissement</span> &nbsp; DT 102V LGV</div>
</div>

<table>
  <thead>
    <tr>
      <th>Nom</th>
      <th>Prénom</th>
      <th>Mle</th>
      <th>Date de naissance</th>
      <th colspan="2">Fonction assurée</th>
      <th>Entité</th>
      <th>Résidence</th>
      <th>Observations</th>
    </tr>
    <tr>
      <th></th><th></th><th></th><th></th>
      <th style="font-size:9px;">Désignation</th>
      <th style="font-size:9px;">Date</th>
      <th></th><th></th><th></th>
    </tr>
  </thead>
  <tbody>${rows || '<tr><td colspan="9" style="text-align:center;color:#607D8B;padding:12px;">Aucun collaborateur</td></tr>'}</tbody>
</table>

<div class="footer">
  <div class="footer-box">
    <div class="footer-label">Établi par :</div>
    <div>Le CDT Adjoint 102V LGV</div>
    <div style="margin-top:4px;font-weight:bold;">Date : ${dateMAJ}</div>
    <div>Lieu : KENITRA</div>
  </div>
  <div class="footer-box" style="text-align:right;">
    <div class="footer-label">Approuvé par :</div>
    <div>Le chargé Technique et Sécurité LGV</div>
    <div style="margin-top:4px;font-weight:bold;">Mr ${responsable}</div>
    <div>Date : ${dateMAJ}</div>
  </div>
</div>

</body></html>`;

      await generateAndSharePDF(html, { dialogTitle: `Liste Collaborateurs Sécurité ${new Date().getFullYear()}` });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Liste des Collaborateurs</Text>
            <Text style={styles.headerSub}>de Sécurité — Année {new Date().getFullYear()}</Text>
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

      {/* Barre de recherche */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, matricule..."
          placeholderTextColor="#607D8B"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Infos responsable */}
      <View style={styles.infoBar}>
        <Text style={styles.infoBarText}>
          📅 MàJ : {dateMAJ}  ·  Par : {responsable}
        </Text>
        <Text style={styles.infoBarCount}>{filtered.length} collaborateur(s)</Text>
      </View>

      {loading
        ? <ActivityIndicator color="#8E44AD" style={{ marginTop: 40 }} />
        : (
          <ScrollView style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>Aucun collaborateur trouvé</Text>
              </View>
            ) : (
              filtered.map((u, idx) => {
                const obs = getObservations(u.id);
                const nomParts = (u.fullName || '').split(' ');
                const nom = nomParts[0] || '';
                const prenom = nomParts.slice(1).join(' ') || '';

                return (
                  <View key={u.id} style={styles.userCard}>
                    {/* En-tête carte */}
                    <View style={styles.userCardTop}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{nom.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{nom} {prenom}</Text>
                        <Text style={styles.userMatricule}>{u.matricule || '—'}</Text>
                      </View>
                      {u.role && (
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>{u.role}</Text>
                        </View>
                      )}
                    </View>

                    {/* Détails */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Date naissance</Text>
                        <Text style={styles.detailValue}>{u.dateNaissance || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Fonction</Text>
                        <Text style={styles.detailValue}>{u.fonctionAssuree || u.poste || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Date fonction</Text>
                        <Text style={styles.detailValue}>{u.dateFonction || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Entité</Text>
                        <Text style={styles.detailValue}>{u.entite || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Résidence</Text>
                        <Text style={styles.detailValue}>{u.residence || '—'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Site / UP</Text>
                        <Text style={styles.detailValue}>{u.siteUp || '—'}</Text>
                      </View>
                    </View>

                    {/* Observations */}
                    {obs ? (
                      <View style={styles.obsBox}>
                        <Text style={styles.obsLabel}>⚠ Observations</Text>
                        <Text style={styles.obsText}>{obs}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )
      }
    </SafeAreaView>
  );
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

  pdfBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  pdfBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  searchBox: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 10, padding: 12, color: '#FFFFFF', fontSize: 13,
  },

  infoBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  infoBarText: { color: '#607D8B', fontSize: 11 },
  infoBarCount: { color: '#C9A84C', fontSize: 11, fontWeight: 'bold' },

  list: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 14 },

  userCard: {
    backgroundColor: '#0F2137', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#8E44AD',
  },
  userCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#8E44AD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  userAvatarText: { color: '#8E44AD', fontSize: 18, fontWeight: 'bold' },
  userName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  userMatricule: { color: '#C9A84C', fontSize: 12 },

  roleBadge: {
    backgroundColor: '#1E3A5F', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  roleBadgeText: { color: '#4A90D9', fontSize: 10, fontWeight: 'bold' },

  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '47%' },
  detailLabel: { color: '#607D8B', fontSize: 10, marginBottom: 2 },
  detailValue: { color: '#FFFFFF', fontSize: 12 },

  obsBox: {
    backgroundColor: '#E74C3C15', borderRadius: 6,
    padding: 8, marginTop: 10,
    borderLeftWidth: 3, borderLeftColor: '#E74C3C',
  },
  obsLabel: { color: '#E74C3C', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  obsText: { color: '#FFFFFF', fontSize: 12 },
});