import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const API = API_URL.replace('/auth', '/registre');
const canEdit = (role) => role === 'ADMIN' || role === 'CPGX';

// ===== CONFIG CRITICITÉ =====
const CRIT = {
  C: { label: 'Critique', color: '#E74C3C', bg: '#E74C3C20' },
  E: { label: 'Élevé',    color: '#E67E22', bg: '#E67E2220' },
  M: { label: 'Modéré',   color: '#F1C40F', bg: '#F1C40F20' },
  F: { label: 'Faible',   color: '#27AE60', bg: '#27AE6020' },
};

// ===== FORMULES =====
const calcSomme  = (v) => [v.an1,v.an2,v.an3,v.an4,v.an5]
  .reduce((s, x) => s + (parseFloat(x)||0), 0);

const calcFreqMoy = (v) => Math.round((calcSomme(v)/5)*100)/100;

const calcCotFreq = (freqMoy) => {
  if (freqMoy < 1)  return 1;
  if (freqMoy < 4)  return 2;
  if (freqMoy < 12) return 3;
  return 4;
};

const calcCriticite = (cotFreq, cotGrav) => {
  const score = (cotFreq||1) * (parseInt(cotGrav)||1);
  if (score >= 8) return 'C';
  if (score >= 4) return 'E';
  if (score >= 2) return 'M';
  return 'F';
};

const EMPTY_FORM = (annee) => ({
  anneeRegistre: annee,
  danger: '',
  causes: '',
  an1: '', an2: '', an3: '', an4: '', an5: '',
  cotationGravite: '4',
  responsable: 'DT voie',
  mesuresEnVigueur: '',
  actions: '',
});

export default function RegistreDangersScreen({ navigation }) {
  const [step, setStep]           = useState(0); // 0=années, 1=tableau
  const [annees, setAnnees]       = useState([]);
  const [selectedAnnee, setSelectedAnnee] = useState(null);
  const [dangers, setDangers]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM(new Date().getFullYear()));
  const [showAddAnnee, setShowAddAnnee] = useState(false);
  const [newAnnee, setNewAnnee]   = useState(String(new Date().getFullYear()));

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      setUserRole(userData ? JSON.parse(userData).role : '');
      const token = await getToken();
      const res = await axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } });
      setAnnees(res.data);
    } catch { Alert.alert('Erreur', 'Impossible de charger'); }
    finally { setLoading(false); }
  };

  const loadDangers = async (annee) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API}?annee=${annee}`, { headers: { Authorization: `Bearer ${token}` } });
      setDangers(res.data);
      setSelectedAnnee(annee);
      setStep(1);
    } catch { Alert.alert('Erreur', 'Impossible de charger le registre'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM(selectedAnnee));
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      anneeRegistre: d.anneeRegistre,
      danger: d.danger || '',
      causes: d.causes || '',
      an1: d.an1 != null ? String(d.an1) : '',
      an2: d.an2 != null ? String(d.an2) : '',
      an3: d.an3 != null ? String(d.an3) : '',
      an4: d.an4 != null ? String(d.an4) : '',
      an5: d.an5 != null ? String(d.an5) : '',
      cotationGravite: d.cotationGravite != null ? String(d.cotationGravite) : '4',
      responsable: d.responsable || '',
      mesuresEnVigueur: d.mesuresEnVigueur || '',
      actions: d.actions || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.danger.trim()) { Alert.alert('Incomplet', 'Le danger est obligatoire'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        anneeRegistre: parseInt(form.anneeRegistre),
        an1: parseFloat(form.an1)||0,
        an2: parseFloat(form.an2)||0,
        an3: parseFloat(form.an3)||0,
        an4: parseFloat(form.an4)||0,
        an5: parseFloat(form.an5)||0,
        cotationGravite: parseInt(form.cotationGravite)||4,
      };
      if (editing) {
        await axios.put(`${API}/${editing.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(API, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowModal(false);
      loadDangers(selectedAnnee);
    } catch { Alert.alert('Erreur', 'Impossible de sauvegarder'); }
    finally { setSaving(false); }
  };

  const handleDelete = (d) => {
    Alert.alert('Confirmation', `Supprimer ce danger ?\n"${d.danger?.substring(0,60)}..."`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          const token = await getToken();
          await axios.delete(`${API}/${d.id}`, { headers: { Authorization: `Bearer ${token}` } });
          loadDangers(selectedAnnee);
        } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
      }}
    ]);
  };

  // Années du registre (les 5 années avant l'année sélectionnée)
  const getAnneeLabels = (annee) => {
    const a = parseInt(annee);
    return [a-5, a-4, a-3, a-2, a-1];
  };

  // Compteurs criticité
  const counts = dangers.reduce((acc, d) => {
    if (d.criticite) acc[d.criticite] = (acc[d.criticite]||0)+1;
    return acc;
  }, { C:0, E:0, M:0, F:0 });

  // PDF
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const anneeLabels = getAnneeLabels(selectedAnnee);
      const critColor = { C:'#E74C3C', E:'#E67E22', M:'#F1C40F', F:'#27AE60' };
      const critLabel = { C:'Critique', E:'Élevé', M:'Modéré', F:'Faible' };

      const rows = dangers.map((d, i) => {
        const bg = i%2===0 ? '#fff' : '#f8f9fa';
        const cc = critColor[d.criticite]||'#999';
        return `
        <tr style="background:${bg}">
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;">${d.danger||''}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;">${d.causes||''}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.an1??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.an2??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.an3??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.an4??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.an5??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;font-weight:bold;">${d.somme??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.freqMoy??0}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.cotationFrequence??1}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">${d.cotationGravite??4}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;text-align:center;">
            <span style="background:${cc};color:${d.criticite==='M'?'#333':'white'};
              padding:2px 6px;border-radius:3px;font-weight:bold;font-size:8px;">
              ${critLabel[d.criticite]||d.criticite||''}
            </span>
          </td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;">${d.responsable||''}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;">${d.mesuresEnVigueur||''}</td>
          <td style="font-size:8px;padding:4px;border:1px solid #ddd;">${d.actions||''}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;padding:8px;}
@page{size:A4 landscape;margin:6mm;}
table{width:100%;border-collapse:collapse;}
th{background:#0A1628;color:white;padding:5px 4px;font-size:8px;text-align:left;border:1px solid #ccc;}
</style></head><body>

<div style="background:#0A1628;color:white;padding:8px 12px;border-radius:4px;margin-bottom:6px;
  display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:14px;font-weight:bold;color:#C9A84C;">ONCF</div>
    <div style="font-size:8px;">PIC/DRIC · Arrondissement MI LGV · DT 102V LGV</div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:bold;font-size:12px;">Registre des dangers ${selectedAnnee}</div>
    <div style="font-size:8px;color:#C9A84C;">
      Fréquences ${anneeLabels[0]} / ${anneeLabels[4]} · ${dangers.length} danger(s)
    </div>
  </div>
</div>

<div style="display:flex;gap:6px;margin-bottom:6px;">
  <div style="background:#E74C3C;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Critique ${counts.C}</div>
  <div style="background:#E67E22;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Élevé ${counts.E}</div>
  <div style="background:#F1C40F;color:#333;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Modéré ${counts.M}</div>
  <div style="background:#27AE60;color:white;padding:3px 8px;border-radius:3px;font-size:8px;font-weight:bold;">Faible ${counts.F}</div>
  <div style="margin-left:auto;font-size:8px;color:#607D8B;align-self:center;">
    Établi par le Chef District 102V LGV
  </div>
</div>

<table>
<thead>
<tr>
  <th style="width:13%">Danger</th>
  <th style="width:9%">Causes</th>
  <th style="width:3%">${anneeLabels[0]}</th>
  <th style="width:3%">${anneeLabels[1]}</th>
  <th style="width:3%">${anneeLabels[2]}</th>
  <th style="width:3%">${anneeLabels[3]}</th>
  <th style="width:3%">${anneeLabels[4]}</th>
  <th style="width:4%">Somme</th>
  <th style="width:4%">Fréq.moy</th>
  <th style="width:3%">Cot.Fréq</th>
  <th style="width:3%">Cot.Grav</th>
  <th style="width:5%">Criticité</th>
  <th style="width:7%">Responsable</th>
  <th style="width:14%">Mesures en vigueur</th>
  <th style="width:14%">Actions ${selectedAnnee}</th>
</tr>
</thead>
<tbody>
${rows||'<tr><td colspan="15" style="text-align:center;padding:20px;color:#999;">Aucun danger enregistré</td></tr>'}
</tbody>
</table>

<div style="margin-top:6px;font-size:8px;color:#607D8B;">
  Cotation Fréquence : SI(Fréq.moy&lt;1 ; 1 | Fréq.moy&lt;4 ; 2 | Fréq.moy&lt;12 ; 3 | sinon ; 4) ·
  Criticité = Cot.Fréq × Cot.Grav · Généré le ${new Date().toLocaleDateString('fr-FR')}
</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64:false, width:842, height:595 });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Registre des Dangers ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch { Alert.alert('Erreur', 'Impossible de générer le PDF'); }
    finally { setGenerating(false); }
  };

  // ===== ÉTAPE 0 — ANNÉES =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>📋 Registre des Dangers</Text>
              <Text style={styles.headerSub}>Par année — 5 dernières années de données</Text>
            </View>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddAnnee(true)}>
                <Text style={styles.addBtnText}>+ Année</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
          <ScrollView style={styles.list}>
            {annees.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Aucun registre créé</Text>
                {canEdit(userRole) && (
                  <Text style={styles.emptySubText}>Appuyez sur "+ Année" pour créer un registre</Text>
                )}
              </View>
            ) : annees.map(a => (
              <TouchableOpacity key={a} style={styles.anneeCard} onPress={() => loadDangers(a)}>
                <View>
                  <Text style={styles.anneeTitre}>Registre {a}</Text>
                  <Text style={styles.anneeSubtitle}>
                    Fréquences {a-5} → {a-1}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Modal nouvelle année */}
        <Modal visible={showAddAnnee} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: 260 }]}>
              <Text style={styles.modalTitle}>Nouveau registre</Text>
              <Text style={styles.fieldLabel}>Année du registre *</Text>
              <TextInput style={styles.input} value={newAnnee}
                onChangeText={setNewAnnee} keyboardType="numeric"
                placeholder="Ex: 2024" placeholderTextColor="#607D8B" />
              <Text style={styles.hintText}>
                → Les données couvriront {parseInt(newAnnee||2024)-5} à {parseInt(newAnnee||2024)-1}
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddAnnee(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={() => {
                  const a = parseInt(newAnnee);
                  if (!isNaN(a) && a > 2000 && a < 2100) {
                    setShowAddAnnee(false);
                    setSelectedAnnee(a);
                    setDangers([]);
                    if (!annees.includes(a)) setAnnees(prev => [a, ...prev].sort((x,y) => y-x));
                    setStep(1);
                  } else Alert.alert('Erreur', 'Année invalide');
                }}>
                  <Text style={styles.saveBtnText}>Créer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — TABLEAU =====
  const anneeLabels = getAnneeLabels(selectedAnnee);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setStep(0); setDangers([]); }}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Registre {selectedAnnee}</Text>
            <Text style={styles.headerSub}>
              Données {anneeLabels[0]}–{anneeLabels[4]} · {dangers.length} danger(s)
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Danger</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.pdfBtn, generating && { opacity: 0.6 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>📄 PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Compteurs */}
      <View style={styles.countersRow}>
        {Object.entries(CRIT).map(([k, v]) => (
          <View key={k} style={[styles.counterChip, { backgroundColor: v.bg, borderColor: v.color }]}>
            <Text style={[styles.counterCount, { color: v.color }]}>{counts[k]}</Text>
            <Text style={[styles.counterLabel, { color: v.color }]}>{v.label}</Text>
          </View>
        ))}
      </View>

      {loading ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} /> : (
        <ScrollView style={styles.list}>
          {dangers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Aucun danger enregistré</Text>
              {canEdit(userRole) && (
                <Text style={styles.emptySubText}>Appuyez sur "+ Danger" pour ajouter</Text>
              )}
            </View>
          ) : dangers.map(d => {
            const crit = CRIT[d.criticite] || CRIT.F;
            return (
              <View key={d.id} style={[styles.dangerCard, { borderLeftColor: crit.color }]}>

                {/* En-tête */}
                <View style={styles.cardHeader}>
                  <View style={[styles.critBadge, { backgroundColor: crit.bg, borderColor: crit.color }]}>
                    <Text style={[styles.critBadgeText, { color: crit.color }]}>{crit.label}</Text>
                  </View>
                  {d.responsable ? (
                    <Text style={styles.responsableText}>👤 {d.responsable}</Text>
                  ) : null}
                </View>

                {/* Danger */}
                <Text style={styles.dangerTitre}>{d.danger}</Text>
                {d.causes ? <Text style={styles.causesText}>📌 {d.causes}</Text> : null}

                {/* Tableau fréquences */}
                <View style={styles.freqTable}>
                  {anneeLabels.map((a, i) => {
                    const val = [d.an1, d.an2, d.an3, d.an4, d.an5][i];
                    return (
                      <View key={a} style={styles.freqCell}>
                        <Text style={styles.freqAnnee}>{a}</Text>
                        <Text style={styles.freqVal}>{val ?? 0}</Text>
                      </View>
                    );
                  })}
                  <View style={[styles.freqCell, styles.freqCellTotal]}>
                    <Text style={styles.freqAnnee}>Somme</Text>
                    <Text style={[styles.freqVal, { color: '#C9A84C' }]}>{d.somme ?? 0}</Text>
                  </View>
                  <View style={[styles.freqCell, styles.freqCellTotal]}>
                    <Text style={styles.freqAnnee}>Moy</Text>
                    <Text style={[styles.freqVal, { color: '#4A90D9' }]}>{d.freqMoy ?? 0}</Text>
                  </View>
                </View>

                {/* Cotations */}
                <View style={styles.cotationsRow}>
                  <View style={styles.cotBox}>
                    <Text style={styles.cotLabel}>Cot. Fréq</Text>
                    <Text style={styles.cotVal}>{d.cotationFrequence ?? 1}</Text>
                  </View>
                  <View style={styles.cotBox}>
                    <Text style={styles.cotLabel}>Cot. Grav</Text>
                    <Text style={styles.cotVal}>{d.cotationGravite ?? 4}</Text>
                  </View>
                  <View style={[styles.cotBox, { backgroundColor: crit.bg, borderColor: crit.color }]}>
                    <Text style={[styles.cotLabel, { color: crit.color }]}>Criticité</Text>
                    <Text style={[styles.cotVal, { color: crit.color }]}>{crit.label}</Text>
                  </View>
                </View>

                {/* Mesures & Actions */}
                {d.mesuresEnVigueur ? (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>📖 Mesures en vigueur</Text>
                    <Text style={styles.infoText}>{d.mesuresEnVigueur}</Text>
                  </View>
                ) : null}
                {d.actions ? (
                  <View style={[styles.infoBox, { borderLeftColor: '#27AE60' }]}>
                    <Text style={[styles.infoLabel, { color: '#27AE60' }]}>💡 Actions {selectedAnnee}</Text>
                    <Text style={styles.infoText}>{d.actions}</Text>
                  </View>
                ) : null}

                {/* Boutons */}
                {canEdit(userRole) && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(d)}>
                      <Text style={styles.editBtnText}>✏️ Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(d)}>
                      <Text style={styles.deleteBtnText}>🗑 Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== MODAL FORMULAIRE ===== */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editing ? '✏️ Modifier le danger' : '➕ Nouveau danger'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Preview criticité */}
              {(() => {
                const freqMoy = calcFreqMoy(form);
                const cotFreq = calcCotFreq(freqMoy);
                const crit = calcCriticite(cotFreq, form.cotationGravite);
                const cfg = CRIT[crit];
                return (
                  <View style={[styles.critPreview, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                    <Text style={[styles.critPreviewText, { color: cfg.color }]}>
                      Fréq.moy = {freqMoy} → Cot.Fréq = {cotFreq} × Grav = {form.cotationGravite} → {cfg.label}
                    </Text>
                  </View>
                );
              })()}

              {/* Danger */}
              <Text style={styles.fieldLabel}>Danger * (description complète)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.danger} multiline
                onChangeText={v => setForm(p => ({ ...p, danger: v }))}
                placeholder="Ex: Défaut de voie principale non détecté..."
                placeholderTextColor="#607D8B" />

              {/* Causes */}
              <Text style={styles.fieldLabel}>Causes</Text>
              <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                value={form.causes} multiline
                onChangeText={v => setForm(p => ({ ...p, causes: v }))}
                placeholder="Ex: Défaut interne, blessure de rail..."
                placeholderTextColor="#607D8B" />

              {/* Fréquences annuelles */}
              <Text style={styles.fieldLabel}>Fréquences annuelles</Text>
              <View style={styles.freqInputRow}>
                {anneeLabels.map((a, i) => {
                  const key = `an${i+1}`;
                  return (
                    <View key={a} style={styles.freqInputCell}>
                      <Text style={styles.freqInputLabel}>{a}</Text>
                      <TextInput
                        style={styles.freqInput}
                        value={form[key]}
                        onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#607D8B"
                      />
                    </View>
                  );
                })}
              </View>

              {/* Somme et moy auto */}
              <View style={styles.calcRow}>
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Somme</Text>
                  <Text style={styles.calcVal}>
                    {Math.round(calcSomme(form)*100)/100}
                  </Text>
                </View>
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Fréq.moy</Text>
                  <Text style={styles.calcVal}>{calcFreqMoy(form)}</Text>
                </View>
                <View style={styles.calcBox}>
                  <Text style={styles.calcLabel}>Cot. Fréq</Text>
                  <Text style={[styles.calcVal, { color: '#C9A84C' }]}>
                    {calcCotFreq(calcFreqMoy(form))}
                  </Text>
                </View>
              </View>

              {/* Cotation gravité */}
              <Text style={styles.fieldLabel}>Cotation Gravité (1–6) *</Text>
              <View style={styles.numberRow}>
                {['1','2','3','4','5','6'].map(v => (
                  <TouchableOpacity key={v}
                    style={[styles.numberBtn, form.cotationGravite === v && styles.numberBtnActive]}
                    onPress={() => setForm(p => ({ ...p, cotationGravite: v }))}
                  >
                    <Text style={[styles.numberBtnText, form.cotationGravite === v && styles.numberBtnTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Responsable */}
              <Text style={styles.fieldLabel}>Responsable des mesures</Text>
              <TextInput style={styles.input} value={form.responsable}
                onChangeText={v => setForm(p => ({ ...p, responsable: v }))}
                placeholder="Ex: DT voie" placeholderTextColor="#607D8B" />

              {/* Mesures en vigueur */}
              <Text style={styles.fieldLabel}>Mesures de sécurité en vigueur (références)</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.mesuresEnVigueur} multiline
                onChangeText={v => setForm(p => ({ ...p, mesuresEnVigueur: v }))}
                placeholder="Ex: Auscultation des rails et confirmation ; Tournées de surveillance..."
                placeholderTextColor="#607D8B" />

              {/* Actions */}
              <Text style={styles.fieldLabel}>Actions {selectedAnnee}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.actions} multiline
                onChangeText={v => setForm(p => ({ ...p, actions: v }))}
                placeholder="Ex: Circulation SPI8 et confirmation ; Respect des périodicités..."
                placeholderTextColor="#607D8B" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>
                        {editing ? '✅ Mettre à jour' : '✅ Ajouter'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  header: { backgroundColor: '#0F2137', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 10 },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  pdfBtnText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 12 },

  countersRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  counterChip: { flex: 1, borderRadius: 8, borderWidth: 1, alignItems: 'center', paddingVertical: 6 },
  counterCount: { fontSize: 16, fontWeight: 'bold' },
  counterLabel: { fontSize: 9, marginTop: 1 },

  list: { paddingHorizontal: 12 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySubText: { color: '#607D8B', fontSize: 12, marginTop: 6 },

  anneeCard: {
    backgroundColor: '#0F2137', borderRadius: 12, padding: 18, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#C9A84C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  anneeTitre: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  anneeSubtitle: { color: '#607D8B', fontSize: 12, marginTop: 2 },
  arrow: { color: '#C9A84C', fontSize: 24, fontWeight: 'bold' },

  dangerCard: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  critBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  critBadgeText: { fontSize: 11, fontWeight: 'bold' },
  responsableText: { color: '#607D8B', fontSize: 11 },
  dangerTitre: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4, lineHeight: 18 },
  causesText: { color: '#607D8B', fontSize: 11, marginBottom: 8 },

  freqTable: { flexDirection: 'row', gap: 4, marginBottom: 8, flexWrap: 'wrap' },
  freqCell: { alignItems: 'center', backgroundColor: '#1A2F4A', borderRadius: 6, padding: 6, minWidth: 44 },
  freqCellTotal: { backgroundColor: '#0A1628', borderWidth: 1, borderColor: '#2A4060' },
  freqAnnee: { color: '#607D8B', fontSize: 9 },
  freqVal: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },

  cotationsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  cotBox: { flex: 1, alignItems: 'center', backgroundColor: '#1A2F4A', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#2A4060' },
  cotLabel: { color: '#607D8B', fontSize: 10 },
  cotVal: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  infoBox: { backgroundColor: '#1A2F4A', borderRadius: 8, padding: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#4A90D9' },
  infoLabel: { color: '#4A90D9', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  infoText: { color: '#B0BEC5', fontSize: 11, lineHeight: 16 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn: { backgroundColor: '#4A90D920', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#4A90D9' },
  editBtnText: { color: '#4A90D9', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { color: '#E74C3C', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  critPreview: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 10, alignItems: 'center' },
  critPreviewText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },

  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 6, marginTop: 12 },
  hintText: { color: '#607D8B', fontSize: 11, marginTop: 4 },
  input: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13 },

  freqInputRow: { flexDirection: 'row', gap: 6 },
  freqInputCell: { flex: 1, alignItems: 'center' },
  freqInputLabel: { color: '#607D8B', fontSize: 10, marginBottom: 4 },
  freqInput: { backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', borderRadius: 8, padding: 8, color: '#FFFFFF', fontSize: 14, width: '100%', textAlign: 'center' },

  calcRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  calcBox: { flex: 1, backgroundColor: '#0A1628', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2A4060' },
  calcLabel: { color: '#607D8B', fontSize: 10 },
  calcVal: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: 2 },

  numberRow: { flexDirection: 'row', gap: 8 },
  numberBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060', alignItems: 'center', justifyContent: 'center' },
  numberBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  numberBtnText: { color: '#607D8B', fontSize: 15, fontWeight: 'bold' },
  numberBtnTextActive: { color: '#0A1628' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#C9A84C', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});