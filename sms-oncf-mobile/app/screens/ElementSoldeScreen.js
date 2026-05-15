import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const API       = API_URL.replace('/auth', '/solde');
const API_ADMIN = API_URL.replace('/auth', '/admin');

const MOIS_LABELS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const TYPE_ASTREINTE = ['A domicile', 'A la chambre'];

const canEdit   = (role) => role === 'ADMIN' || role === 'CGPX';
const canView   = (role) => ['ADMIN', 'CGPX', 'CSPR', 'CET'].includes(role);
const isAgent   = (role) => role === 'AGENT';

const EMPTY_FORM = {
  matricule: '', nom: '', prenom: '', fonction: '', entite: '',
  mois: new Date().getMonth() + 1,
  annee: new Date().getFullYear(),
  nbJoursAstreinte: '', typeAstreinte: 'A domicile', periodeAstreinte: '',
  allocationNuit: '', repasNormal: '', decNormal: '',
  repasReduit: '', decReduit: '', allocationParcours: '', indemniteCup: '',
  nbJoursConge: '', periodeConge: '',
  nbJoursRC: '', periodeRC: '', motifRC: '',
  nbHeuresSupp: '', justificationHS: '',
};

export default function ElementSoldeScreen({ navigation }) {
  const [step, setStep]           = useState(0); // 0=période, 1=tableau
  const [annees, setAnnees]       = useState([]);
  const [moisList, setMoisList]   = useState([]);
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear());
  const [selectedMois, setSelectedMois]   = useState(new Date().getMonth() + 1);
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole]   = useState('');
  const [userEntite, setUserEntite] = useState('');
  const [userMatricule, setUserMatricule] = useState('');
  const [showModal, setShowModal]           = useState(false);
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState({ ...EMPTY_FORM });
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [showCollabPicker, setShowCollabPicker] = useState(false);
  const [collabSearch, setCollabSearch]     = useState('');
  const [selectedCollab, setSelectedCollab] = useState(null);

  const getToken = async () => await AsyncStorage.getItem('token');

  useEffect(() => { loadInitial(); }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const u = JSON.parse(userData);
        setUserRole(u.role || '');
        setUserEntite(u.entite || '');
        setUserMatricule(u.matricule || '');
      }
      const token = await getToken();
      const [annRes, collabRes] = await Promise.allSettled([
        axios.get(`${API}/annees`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_ADMIN}/collaborateurs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const annees = annRes.status === 'fulfilled' ? annRes.value.data : [];
      setAnnees(annees.length > 0 ? annees : [new Date().getFullYear()]);
      if (collabRes.status === 'fulfilled') setCollaborateurs(collabRes.value.data);
    } catch {
      setAnnees([new Date().getFullYear()]);
    } finally {
      setLoading(false);
    }
  };

  const loadMois = async (annee) => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API}/mois?annee=${annee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setMoisList(res.data);
    } catch { setMoisList([]); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API}?mois=${selectedMois}&annee=${selectedAnnee}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
      setStep(1);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setSelectedCollab(null);
    setCollabSearch('');
    setForm({
      ...EMPTY_FORM,
      mois: selectedMois,
      annee: selectedAnnee,
      entite: userEntite,
    });
    setShowModal(true);
  };

  const selectCollab = (collab) => {
    setSelectedCollab(collab);
    setForm(prev => ({
      ...prev,
      matricule: collab.matricule || '',
      nom:       collab.fullName  || '',
      prenom:    collab.prenom    || '',
      fonction:  collab.fonctionAssuree || '',
      entite:    collab.entite    || prev.entite,
    }));
    setShowCollabPicker(false);
    setCollabSearch('');
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      matricule:        item.matricule || '',
      nom:              item.nom || '',
      prenom:           item.prenom || '',
      fonction:         item.fonction || '',
      entite:           item.entite || '',
      mois:             item.mois,
      annee:            item.annee,
      nbJoursAstreinte: item.nbJoursAstreinte != null ? String(item.nbJoursAstreinte) : '',
      typeAstreinte:    item.typeAstreinte || 'A domicile',
      periodeAstreinte: item.periodeAstreinte || '',
      allocationNuit:   item.allocationNuit != null ? String(item.allocationNuit) : '',
      repasNormal:      item.repasNormal != null ? String(item.repasNormal) : '',
      decNormal:        item.decNormal != null ? String(item.decNormal) : '',
      repasReduit:      item.repasReduit != null ? String(item.repasReduit) : '',
      decReduit:        item.decReduit != null ? String(item.decReduit) : '',
      allocationParcours: item.allocationParcours != null ? String(item.allocationParcours) : '',
      indemniteCup:     item.indemniteCup != null ? String(item.indemniteCup) : '',
      nbJoursConge:     item.nbJoursConge != null ? String(item.nbJoursConge) : '',
      periodeConge:     item.periodeConge || '',
      nbJoursRC:        item.nbJoursRC != null ? String(item.nbJoursRC) : '',
      periodeRC:        item.periodeRC || '',
      motifRC:          item.motifRC || '',
      nbHeuresSupp:     item.nbHeuresSupp != null ? String(item.nbHeuresSupp) : '',
      justificationHS:  item.justificationHS || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing && !selectedCollab) {
      Alert.alert('Incomplet', 'Veuillez choisir un collaborateur');
      return;
    }
    if (!form.nom.trim()) {
      Alert.alert('Incomplet', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        mois:             parseInt(form.mois),
        annee:            parseInt(form.annee),
        nbJoursAstreinte: form.nbJoursAstreinte ? parseInt(form.nbJoursAstreinte) : null,
        allocationNuit:   form.allocationNuit   ? parseInt(form.allocationNuit)   : null,
        repasNormal:      form.repasNormal       ? parseInt(form.repasNormal)       : null,
        decNormal:        form.decNormal         ? parseInt(form.decNormal)         : null,
        repasReduit:      form.repasReduit       ? parseInt(form.repasReduit)       : null,
        decReduit:        form.decReduit         ? parseInt(form.decReduit)         : null,
        allocationParcours: form.allocationParcours ? parseInt(form.allocationParcours) : null,
        indemniteCup:     form.indemniteCup     ? parseInt(form.indemniteCup)     : null,
        nbJoursConge:     form.nbJoursConge     ? parseInt(form.nbJoursConge)     : null,
        nbJoursRC:        form.nbJoursRC        ? parseInt(form.nbJoursRC)        : null,
        nbHeuresSupp:     form.nbHeuresSupp     ? parseInt(form.nbHeuresSupp)     : null,
      };

      if (editing) {
        await axios.put(`${API}/${editing.id}`, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(API, payload,
          { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowModal(false);
      loadData();
    } catch (e) {
      const msg = e.response?.status === 400
        ? 'Cette ligne existe déjà pour ce collaborateur ce mois-ci.'
        : 'Impossible de sauvegarder.';
      Alert.alert('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Confirmation',
      `Supprimer la ligne de ${item.nom} ${item.prenom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await axios.delete(`${API}/${item.id}`,
              { headers: { Authorization: `Bearer ${token}` } });
            loadData();
          } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        }},
      ]);
  };

  // ===== EXPORT PDF =====
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const rows = data.map((d, i) => `
        <tr style="background:${i%2===0?'#fff':'#f8f9fa'}">
          <td>${d.matricule}</td>
          <td>${d.nom}</td>
          <td>${d.prenom}</td>
          <td>${d.fonction || ''}</td>
          <td>${d.entite || ''}</td>
          <td style="text-align:center">${d.nbJoursAstreinte ?? '-'}</td>
          <td style="text-align:center">${d.allocationNuit ?? '-'}</td>
          <td style="text-align:center">${d.repasNormal ?? '-'}</td>
          <td style="text-align:center">${d.decNormal ?? '-'}</td>
          <td style="text-align:center">${d.indemniteCup ?? '-'}</td>
          <td style="text-align:center">${d.nbJoursConge ?? '-'}</td>
          <td>${d.periodeConge || '-'}</td>
          <td style="text-align:center">${d.nbJoursRC ?? '-'}</td>
          <td>${d.periodeRC || '-'}</td>
          <td>${d.motifRC || '-'}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:8px; padding:8px; }
@page { size:A4 landscape; margin:6mm; }
h2 { color:#0A1628; font-size:12px; margin-bottom:4px; }
p { color:#607D8B; font-size:8px; margin-bottom:6px; }
table { width:100%; border-collapse:collapse; }
th { background:#0A1628; color:white; padding:4px 3px;
     font-size:7px; text-align:left; border:1px solid #ccc; }
td { font-size:7px; padding:3px; border:1px solid #ddd; }
</style></head><body>
<h2>ONCF — DRIC — Élément de Solde</h2>
<p>Établissement : ${userEntite || 'CAMI'} &nbsp;|&nbsp;
   Mois : ${MOIS_LABELS[selectedMois]} ${selectedAnnee} &nbsp;|&nbsp;
   ${data.length} collaborateur(s)</p>
<table>
<thead><tr>
  <th>MLE</th><th>Nom</th><th>Prénom</th><th>Fonction</th><th>Entité</th>
  <th>Ast.</th><th>Alloc. Nuit</th><th>Repas N.</th><th>Déc N.</th>
  <th>IJ CUP</th><th>Jrs Congé</th><th>Période Congé</th>
  <th>Jrs RC</th><th>Période RC</th><th>Motif RC</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div style="margin-top:10px;display:flex;justify-content:space-between;font-size:8px;color:#607D8B">
  <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
  <div>Vérifié et signé par le Chef de District</div>
</div>
</body></html>`;

      const { uri } = await Print.printToFileAsync({
        html, base64: false, width: 842, height: 595
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Élément de Solde — ${MOIS_LABELS[selectedMois]} ${selectedAnnee}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    } finally {
      setGenerating(false);
    }
  };

  // ===== ÉTAPE 0 — Sélection période =====
  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>💰 Élément de Solde</Text>
          <Text style={styles.headerSub}>
            Feuille d'attachement mensuelle
          </Text>
        </View>

        {loading
          ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
          : (
          <ScrollView style={styles.list}>
            {/* Sélection Année */}
            <Text style={styles.sectionLabel}>Année</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}>
              {annees.map(a => (
                <TouchableOpacity key={a}
                  style={[styles.chipBtn,
                    selectedAnnee === a && styles.chipBtnActive]}
                  onPress={() => {
                    setSelectedAnnee(a);
                    loadMois(a);
                  }}>
                  <Text style={[styles.chipText,
                    selectedAnnee === a && styles.chipTextActive]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Ajouter nouvelle année */}
              {canEdit(userRole) && (
                <TouchableOpacity
                  style={[styles.chipBtn, { borderColor: '#C9A84C' }]}
                  onPress={() => {
                    const newY = Math.max(...annees) + 1;
                    setAnnees(prev => [newY, ...prev]);
                    setSelectedAnnee(newY);
                  }}>
                  <Text style={[styles.chipText, { color: '#C9A84C' }]}>
                    + {Math.max(...annees) + 1}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Sélection Mois */}
            <Text style={styles.sectionLabel}>Mois</Text>
            <View style={styles.moisGrid}>
              {MOIS_LABELS.slice(1).map((m, i) => (
                <TouchableOpacity key={i+1}
                  style={[styles.moisBtn,
                    selectedMois === i+1 && styles.moisBtnActive]}
                  onPress={() => setSelectedMois(i+1)}>
                  <Text style={[styles.moisText,
                    selectedMois === i+1 && styles.moisTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Entité */}
            {userEntite ? (
              <View style={styles.entiteBox}>
                <Text style={styles.entiteLabel}>Votre entité</Text>
                <Text style={styles.entiteValue}>{userEntite}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.confirmBtn, loading && { opacity: 0.5 }]}
              onPress={loadData}
              disabled={loading}>
              <Text style={styles.confirmBtnText}>
                Consulter {MOIS_LABELS[selectedMois]} {selectedAnnee} →
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ===== ÉTAPE 1 — Tableau =====
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { setStep(0); setData([]); }}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {MOIS_LABELS[selectedMois]} {selectedAnnee}
            </Text>
            <Text style={styles.headerSub}>
              {data.length} collaborateur(s)
              {userEntite ? ` — ${userEntite}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canEdit(userRole) && (
              <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Ajouter</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.pdfBtn, generating && { opacity: 0.5 }]}
              onPress={generatePDF} disabled={generating}>
              {generating
                ? <ActivityIndicator color="#0A1628" size="small" />
                : <Text style={styles.pdfBtnText}>PDF</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading
        ? <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
        : (
        <ScrollView style={styles.list}>
          {data.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>Aucune donnée pour cette période</Text>
              {canEdit(userRole) && (
                <Text style={styles.emptySub}>
                  Appuyez sur "+ Ajouter" pour saisir les données
                </Text>
              )}
            </View>
          ) : (
            data.map(item => (
              <View key={item.id} style={styles.card}>
                {/* En-tête carte */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>
                      {item.nom} {item.prenom}
                    </Text>
                    <Text style={styles.cardSub}>
                      {item.matricule} — {item.fonction}
                    </Text>
                    {(userRole === 'CSPR' || userRole === 'CET' || userRole === 'ADMIN') && (
                      <Text style={styles.cardEntite}>{item.entite}</Text>
                    )}
                  </View>
                  {canEdit(userRole) && (
                    <View style={{ gap: 6 }}>
                      <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => openEdit(item)}>
                        <Text style={styles.editBtnText}>✏️</Text>
                      </TouchableOpacity>
                      {userRole === 'ADMIN' && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(item)}>
                          <Text style={styles.deleteBtnText}>🗑</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Grille des valeurs */}
                <View style={styles.valGrid}>
                  {[
                    ['Astreinte', item.nbJoursAstreinte, 'j'],
                    ['Alloc. Nuit', item.allocationNuit, ''],
                    ['Repas Normal', item.repasNormal, ''],
                    ['Déc. Normal', item.decNormal, ''],
                    ['IJ CUP', item.indemniteCup, 'j'],
                    ['Congé', item.nbJoursConge, 'j'],
                    ['RC', item.nbJoursRC, 'j'],
                    ['HS', item.nbHeuresSupp, 'h'],
                  ].map(([label, val, unit]) => (
                    <View key={label} style={styles.valCell}>
                      <Text style={styles.valLabel}>{label}</Text>
                      <Text style={[styles.valNum,
                        val == null && styles.valNull]}>
                        {val != null ? `${val}${unit}` : '-'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Détails texte */}
                {item.periodeAstreinte ? (
                  <Text style={styles.detailText}>
                    🕐 Astreinte : {item.typeAstreinte} — {item.periodeAstreinte}
                  </Text>
                ) : null}
                {item.periodeConge ? (
                  <Text style={styles.detailText}>
                    🏖️ Congé : {item.periodeConge}
                  </Text>
                ) : null}
                {item.periodeRC ? (
                  <Text style={styles.detailText}>
                    🔄 RC : {item.periodeRC}
                    {item.motifRC ? ` — ${item.motifRC}` : ''}
                  </Text>
                ) : null}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ===== MODAL SÉLECTEUR COLLABORATEUR ===== */}
      <Modal visible={showCollabPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 Choisir un collaborateur</Text>
              <TouchableOpacity onPress={() => {
                setShowCollabPicker(false);
                setCollabSearch('');
              }}>
                <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              value={collabSearch}
              onChangeText={setCollabSearch}
              placeholder="Rechercher par nom, prénom ou matricule…"
              placeholderTextColor="#607D8B"
              autoFocus
            />

            {collaborateurs.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 30 }}>
                <Text style={{ color: '#607D8B', fontSize: 13 }}>
                  Aucun collaborateur disponible pour votre entité.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {collaborateurs
                  .filter(c => {
                    const q = collabSearch.toLowerCase();
                    if (!q) return true;
                    return (
                      (c.fullName  || '').toLowerCase().includes(q) ||
                      (c.prenom    || '').toLowerCase().includes(q) ||
                      (c.matricule || '').toLowerCase().includes(q)
                    );
                  })
                  .map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.collabItem}
                      onPress={() => selectCollab(c)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.collabItemName}>
                          {c.fullName} {c.prenom}
                        </Text>
                        <Text style={styles.collabItemSub}>
                          {c.matricule}
                          {c.fonctionAssuree ? ` — ${c.fonctionAssuree}` : ''}
                        </Text>
                      </View>
                      <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  ))
                }
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ===== MODAL FORMULAIRE ===== */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <ScrollView showsVerticalScrollIndicator={false}>

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editing ? '✏️ Modifier' : '➕ Nouveau collaborateur'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Text style={{ color: '#607D8B', fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* ── IDENTIFICATION ── */}
                <Text style={styles.sectionTitle}>Identification</Text>

                {!editing ? (
                  /* ── Ajout : sélection depuis la liste des collaborateurs ── */
                  <>
                    <Text style={styles.fieldLabel}>Collaborateur *</Text>
                    <TouchableOpacity
                      style={[styles.collabPickerBtn,
                        selectedCollab && styles.collabPickerBtnFilled]}
                      onPress={() => setShowCollabPicker(true)}>
                      {selectedCollab ? (
                        <View>
                          <Text style={styles.collabPickerName}>
                            {selectedCollab.fullName} {selectedCollab.prenom}
                          </Text>
                          <Text style={styles.collabPickerSub}>
                            {selectedCollab.matricule}
                            {selectedCollab.fonctionAssuree
                              ? ` — ${selectedCollab.fonctionAssuree}` : ''}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.collabPickerPlaceholder}>
                          Appuyer pour choisir un collaborateur…
                        </Text>
                      )}
                      <Text style={{ color: '#C9A84C', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* ── Modification : affichage en lecture seule ── */
                  <View style={styles.collabReadonly}>
                    <Text style={styles.collabReadonlyName}>
                      {form.nom} {form.prenom}
                    </Text>
                    <Text style={styles.collabReadonlySub}>
                      {form.matricule}
                      {form.fonction ? ` — ${form.fonction}` : ''}
                    </Text>
                  </View>
                )}

                {/* ── ASTREINTE ── */}
                <Text style={styles.sectionTitle}>Astreinte</Text>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Nombre de jours</Text>
                    <TextInput style={styles.input}
                      value={form.nbJoursAstreinte}
                      onChangeText={v => setForm(p => ({...p, nbJoursAstreinte: v}))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#607D8B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Type</Text>
                    <View style={styles.typeRow}>
                      {TYPE_ASTREINTE.map(t => (
                        <TouchableOpacity key={t}
                          style={[styles.typeBtn,
                            form.typeAstreinte === t && styles.typeBtnActive]}
                          onPress={() => setForm(p => ({ ...p, typeAstreinte: t }))}>
                          <Text style={[styles.typeBtnText,
                            form.typeAstreinte === t && styles.typeBtnTextActive]}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Période astreinte</Text>
                <TextInput style={styles.input}
                  value={form.periodeAstreinte}
                  onChangeText={v => setForm(p => ({ ...p, periodeAstreinte: v }))}
                  placeholder="Du 01 au 14/12/25"
                  placeholderTextColor="#607D8B" />

                {/* ── INDEMNITÉS ── */}
                <Text style={styles.sectionTitle}>Indemnités</Text>

                <View style={styles.row2}>
                  {[
                    ['Allocation de nuit', 'allocationNuit'],
                    ['Repas Normal', 'repasNormal'],
                    ['Déc. Normal', 'decNormal'],
                    ['Repas Réduit', 'repasReduit'],
                    ['Déc. Réduit', 'decReduit'],
                    ['Alloc. Parcours', 'allocationParcours'],
                  ].map(([label, key]) => (
                    <View key={key} style={{ flex: 1, minWidth: '48%' }}>
                      <Text style={styles.fieldLabel}>{label}</Text>
                      <TextInput style={styles.input}
                        value={form[key]}
                        onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
                        keyboardType="numeric"
                        placeholder="-"
                        placeholderTextColor="#607D8B" />
                    </View>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Indemnité Journalière CUP (nb jours)</Text>
                <TextInput style={styles.input}
                  value={form.indemniteCup}
                  onChangeText={v => setForm(p => ({ ...p, indemniteCup: v }))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#607D8B" />

                {/* ── CONGÉS ── */}
                <Text style={styles.sectionTitle}>Congés</Text>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Nombre de jours</Text>
                    <TextInput style={styles.input}
                      value={form.nbJoursConge}
                      onChangeText={v => setForm(p => ({ ...p, nbJoursConge: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#607D8B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Période</Text>
                    <TextInput style={styles.input}
                      value={form.periodeConge}
                      onChangeText={v => setForm(p => ({ ...p, periodeConge: v }))}
                      placeholder="du 08 au 15/12/25"
                      placeholderTextColor="#607D8B" />
                  </View>
                </View>

                {/* ── REPOS COMPENSATEURS ── */}
                <Text style={styles.sectionTitle}>Repos Compensateurs (RC)</Text>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Nombre de jours</Text>
                    <TextInput style={styles.input}
                      value={form.nbJoursRC}
                      onChangeText={v => setForm(p => ({ ...p, nbJoursRC: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#607D8B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Période</Text>
                    <TextInput style={styles.input}
                      value={form.periodeRC}
                      onChangeText={v => setForm(p => ({ ...p, periodeRC: v }))}
                      placeholder="Le 22 et 23/12/25"
                      placeholderTextColor="#607D8B" />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Motif RC</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  value={form.motifRC}
                  onChangeText={v => setForm(p => ({ ...p, motifRC: v }))}
                  multiline
                  placeholder="RCA du 06 et 09/11/25..."
                  placeholderTextColor="#607D8B" />

                {/* ── HEURES SUPPLÉMENTAIRES ── */}
                <Text style={styles.sectionTitle}>Heures Supplémentaires</Text>

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Nombre d'heures</Text>
                    <TextInput style={styles.input}
                      value={form.nbHeuresSupp}
                      onChangeText={v => setForm(p => ({ ...p, nbHeuresSupp: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#607D8B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Justification</Text>
                    <TextInput style={styles.input}
                      value={form.justificationHS}
                      onChangeText={v => setForm(p => ({ ...p, justificationHS: v }))}
                      placeholder="-"
                      placeholderTextColor="#607D8B" />
                  </View>
                </View>

                {/* Boutons */}
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn}
                    onPress={() => setShowModal(false)}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                    onPress={handleSave} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color="#0A1628" size="small" />
                      : <Text style={styles.saveBtnText}>
                          {editing ? '✅ Mettre à jour' : '✅ Enregistrer'}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },

  header: {
    backgroundColor: '#0F2137', padding: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 12,
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },

  list: { paddingHorizontal: 14 },

  sectionLabel: { color: '#C9A84C', fontWeight: 'bold', fontSize: 13,
    marginBottom: 8, marginTop: 4 },
  chipBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    marginRight: 8,
  },
  chipBtnActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  chipText: { color: '#607D8B', fontWeight: 'bold' },
  chipTextActive: { color: '#0A1628' },

  moisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  moisBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#0F2137', borderWidth: 1, borderColor: '#2A4060',
    minWidth: '30%', alignItems: 'center',
  },
  moisBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' },
  moisText: { color: '#607D8B', fontSize: 12 },
  moisTextActive: { color: '#C9A84C', fontWeight: 'bold' },

  entiteBox: {
    backgroundColor: '#0F2137', borderRadius: 10, padding: 12,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#C9A84C',
  },
  entiteLabel: { color: '#607D8B', fontSize: 11 },
  entiteValue: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },

  confirmBtn: {
    backgroundColor: '#C9A84C', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20,
  },
  confirmBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },

  addBtn: { backgroundColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 12 },
  pdfBtn: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#C9A84C' },
  pdfBtnText: { color: '#C9A84C', fontWeight: 'bold', fontSize: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  emptySub: { color: '#607D8B', fontSize: 12, marginTop: 6, textAlign: 'center' },

  card: { backgroundColor: '#0F2137', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  cardSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  cardEntite: { color: '#C9A84C', fontSize: 11, marginTop: 2 },

  valGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  valCell: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 8,
    alignItems: 'center', minWidth: 70,
  },
  valLabel: { color: '#607D8B', fontSize: 9 },
  valNum: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  valNull: { color: '#2A4060' },

  detailText: { color: '#B0BEC5', fontSize: 11, marginTop: 4 },

  editBtn: { backgroundColor: '#4A90D920', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#4A90D9' },
  editBtnText: { fontSize: 14 },
  deleteBtn: { backgroundColor: '#E74C3C20', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E74C3C' },
  deleteBtnText: { fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F2137', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '93%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  sectionTitle: {
    color: '#C9A84C', fontSize: 12, fontWeight: 'bold',
    marginTop: 16, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#2A4060', paddingBottom: 4,
  },
  fieldLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 10, color: '#FFFFFF', fontSize: 13,
  },
  row2: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

  typeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  typeBtn: {
    flex: 1, padding: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
  },
  typeBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#C9A84C' },
  typeBtnText: { color: '#607D8B', fontSize: 10 },
  typeBtnTextActive: { color: '#C9A84C', fontWeight: 'bold' },

  // ── Sélecteur collaborateur ──
  collabPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A2F4A', borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 12, marginBottom: 4,
  },
  collabPickerBtnFilled: { borderColor: '#C9A84C' },
  collabPickerName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  collabPickerSub:  { color: '#607D8B', fontSize: 11, marginTop: 2 },
  collabPickerPlaceholder: { color: '#607D8B', fontSize: 13, flex: 1 },

  collabReadonly: {
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#C9A84C', marginBottom: 4,
  },
  collabReadonlyName: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  collabReadonlySub:  { color: '#607D8B', fontSize: 11, marginTop: 2 },

  collabItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8, padding: 12,
    marginBottom: 6,
  },
  collabItemName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  collabItemSub:  { color: '#607D8B', fontSize: 11, marginTop: 2 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#1A2F4A', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#607D8B', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#C9A84C', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 14 },
});
