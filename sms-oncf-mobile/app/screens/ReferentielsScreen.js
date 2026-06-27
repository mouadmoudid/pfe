import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput, StatusBar, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../services/authService';

const REFERENTIEL_API = API_URL.replace('/auth', '/referentiels');

const canManage = (role) =>
  role === 'ADMIN' || role === 'CGPX' || role === 'CSPR' || role === 'CET';

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const safeName = (nom) => (nom || 'referentiel').replace(/[^a-zA-Z0-9._-]/g, '_');

export default function ReferentielsScreen({ navigation }) {
  const Wrapper = Platform.OS === 'web' ? View : SafeAreaView;
  const Scroller = Platform.OS === 'web' ? View : ScrollView;

  const [referentiels, setReferentiels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Upload multi-fichiers
  const [uploadModal, setUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // tableau de fichiers sélectionnés
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null); // { current, total }

  useEffect(() => {
    const init = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setCurrentUser(JSON.parse(userData));
      await loadReferentiels();
    };
    init();
  }, []);

  const getToken = async () => AsyncStorage.getItem('token');

  const loadReferentiels = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(REFERENTIEL_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReferentiels(res.data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger les référentiels');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    setPendingFiles(result.assets);
    setUploadDesc('');
    setUploadProgress(null);
    setUploadModal(true);
  };

  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;
    const token = await getToken();
    const total = pendingFiles.length;
    let errors = 0;

    setUploadProgress({ current: 0, total });

    for (let i = 0; i < total; i++) {
      const file = pendingFiles[i];
      setUploadProgress({ current: i + 1, total });
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          // Sur web : utiliser l'objet File natif du navigateur (boundary géré automatiquement)
          formData.append('file', file.file, file.name);
        } else {
          // Sur mobile : utiliser l'URI React Native
          formData.append('file', { uri: file.uri, name: file.name, type: 'application/pdf' });
        }
        formData.append('nom', file.name.replace(/\.pdf$/i, ''));
        if (uploadDesc.trim()) formData.append('description', uploadDesc.trim());

        await axios.post(REFERENTIEL_API, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Sur web : ne pas forcer Content-Type — le navigateur ajoute le boundary multipart
            ...(Platform.OS !== 'web' && { 'Content-Type': 'multipart/form-data' }),
          },
        });
      } catch {
        errors++;
      }
    }

    setUploadModal(false);
    setPendingFiles([]);
    setUploadProgress(null);
    setUploadDesc('');

    if (errors === 0) {
      Alert.alert('Succès', `${total} fichier${total > 1 ? 's' : ''} ajouté${total > 1 ? 's' : ''} !`);
    } else {
      Alert.alert('Partiel', `${total - errors}/${total} fichiers uploadés. ${errors} erreur(s).`);
    }
    loadReferentiels();
  };

  const handleRemoveFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleView = async (ref) => {
    setActionLoadingId(ref.id + '_view');
    try {
      const token = await getToken();
      const url = `${REFERENTIEL_API}/${ref.id}/download`;

      if (Platform.OS === 'web') {
        // Web : fetch avec header JWT → blob URL → nouvel onglet
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Erreur serveur ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        // Mobile : téléchargement temporaire + partage
        const fileUri = FileSystem.cacheDirectory + safeName(ref.nom) + '.pdf';
        const result = await FileSystem.downloadAsync(url, fileUri, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (result.status !== 200) throw new Error(`Erreur serveur ${result.status}`);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        } else {
          Alert.alert('Info', 'Visualisation non disponible sur cet appareil');
        }
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || "Impossible d'ouvrir le fichier");
    } finally {
      setActionLoadingId(null);
    }
  };

  const doDelete = async (ref) => {
    try {
      const token = await getToken();
      await axios.delete(`${REFERENTIEL_API}/${ref.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadReferentiels();
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const handleDelete = (ref) => {
    if (Platform.OS === 'web') {
      // window.confirm() est fiable sur web, Alert.alert avec boutons ne l'est pas
      if (window.confirm(`Supprimer définitivement "${ref.nom}" ?`)) {
        doDelete(ref);
      }
      return;
    }
    Alert.alert(
      'Supprimer',
      `Supprimer définitivement "${ref.nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => doDelete(ref) },
      ]
    );
  };

  const isUploading = uploadProgress !== null;

  return (
    <Wrapper style={Platform.OS === 'web' ? styles.webSafe : styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>📚 Référentiels</Text>
            <Text style={styles.headerSub}>Procédures, normes et documents PDF</Text>
          </View>
          {canManage(currentUser?.role) && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handlePickPdf}
              disabled={isUploading}
            >
              {isUploading
                ? <ActivityIndicator size="small" color="#0A1628" />
                : <Text style={styles.addBtnText}>+ PDF</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#C9A84C" style={{ marginTop: 40 }} />
      ) : (
        <Scroller style={Platform.OS === 'web' ? styles.webScroller : styles.list} {...(Platform.OS !== 'web' && { showsVerticalScrollIndicator: false })}>
          {referentiels.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Aucun référentiel</Text>
              {canManage(currentUser?.role) && (
                <Text style={styles.emptyHint}>Appuyez sur "+ PDF" pour ajouter</Text>
              )}
            </View>
          ) : (
            referentiels.map((ref) => (
              <View key={ref.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconBox}>
                    <Text style={styles.cardIconText}>📄</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNom} numberOfLines={2}>{ref.nom}</Text>
                    {ref.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>{ref.description}</Text>
                    ) : null}
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardMetaText}>{formatSize(ref.taille)}</Text>
                      <Text style={styles.cardMetaDot}>·</Text>
                      <Text style={styles.cardMetaText}>{formatDate(ref.createdAt)}</Text>
                      {ref.createdByName ? (
                        <>
                          <Text style={styles.cardMetaDot}>·</Text>
                          <Text style={styles.cardMetaText}>👤 {ref.createdByName}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleView(ref)}
                    disabled={!!actionLoadingId}
                  >
                    {actionLoadingId === ref.id + '_view'
                      ? <ActivityIndicator size="small" color="#4A90D9" />
                      : <Text style={styles.actionBtnText}>👁 Voir</Text>
                    }
                  </TouchableOpacity>

                  {canManage(currentUser?.role) && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => handleDelete(ref)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#E74C3C' }]}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </Scroller>
      )}

      {/* Modal upload multi-fichiers */}
      <Modal
        visible={uploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isUploading) { setUploadModal(false); setPendingFiles([]); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              {isUploading
                ? `Upload en cours... ${uploadProgress.current}/${uploadProgress.total}`
                : `${pendingFiles.length} fichier${pendingFiles.length > 1 ? 's' : ''} sélectionné${pendingFiles.length > 1 ? 's' : ''}`
              }
            </Text>

            {/* Barre de progression */}
            {isUploading && (
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                }]} />
              </View>
            )}

            {/* Liste des fichiers */}
            {!isUploading && (
              <>
                <ScrollView style={styles.fileList} showsVerticalScrollIndicator={false}>
                  {pendingFiles.map((file, index) => (
                    <View key={index} style={styles.fileRow}>
                      <Text style={styles.fileRowIcon}>📄</Text>
                      <View style={styles.fileRowInfo}>
                        <Text style={styles.fileRowName} numberOfLines={1}>
                          {file.name.replace(/\.pdf$/i, '')}
                        </Text>
                        <Text style={styles.fileRowSize}>{formatSize(file.size)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.fileRowRemove}
                        onPress={() => handleRemoveFile(index)}
                      >
                        <Text style={styles.fileRowRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                {/* Bouton ajouter d'autres fichiers */}
                <TouchableOpacity style={styles.addMoreBtn} onPress={async () => {
                  const result = await DocumentPicker.getDocumentAsync({
                    type: 'application/pdf',
                    copyToCacheDirectory: true,
                    multiple: true,
                  });
                  if (!result.canceled) {
                    setPendingFiles(prev => [...prev, ...result.assets]);
                  }
                }}>
                  <Text style={styles.addMoreBtnText}>+ Ajouter d'autres PDF</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Description commune (optionnelle)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : Documents procédures sécurité LGV"
                  placeholderTextColor="#607D8B"
                  value={uploadDesc}
                  onChangeText={setUploadDesc}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, pendingFiles.length === 0 && styles.submitBtnDisabled]}
                  onPress={handleUploadAll}
                  disabled={pendingFiles.length === 0}
                >
                  <Text style={styles.submitBtnText}>
                    ⬆ Uploader {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setUploadModal(false); setPendingFiles([]); setUploadDesc(''); }}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Pendant l'upload : juste le spinner */}
            {isUploading && (
              <View style={styles.uploadingBox}>
                <ActivityIndicator color="#C9A84C" size="large" />
                <Text style={styles.uploadingText}>
                  Envoi de {pendingFiles[uploadProgress.current - 1]?.name}...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1628' },
  webSafe: { height: '100vh', backgroundColor: '#0A1628' },
  webScroller: { flex: 1, overflow: 'scroll', paddingBottom: 40 },

  header: {
    backgroundColor: '#0F2137',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#C9A84C',
  },
  backText: { color: '#C9A84C', fontSize: 14, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  addBtn: {
    backgroundColor: '#C9A84C', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 60, alignItems: 'center',
  },
  addBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 13 },

  list: { paddingHorizontal: 16 },

  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#607D8B', fontSize: 16, marginBottom: 6 },
  emptyHint: { color: '#4A90D9', fontSize: 13 },

  card: {
    backgroundColor: '#0F2137',
    borderRadius: 12, padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#C9A84C',
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: '#C9A84C20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardNom: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, lineHeight: 17 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  cardMetaText: { color: '#607D8B', fontSize: 11 },
  cardMetaDot: { color: '#2A4060', fontSize: 11 },

  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    flex: 1, backgroundColor: '#1A2F4A',
    borderWidth: 1, borderColor: '#2A4060',
    borderRadius: 8, padding: 8,
    alignItems: 'center', justifyContent: 'center', minHeight: 36,
  },
  actionBtnDanger: { borderColor: '#E74C3C20', backgroundColor: '#E74C3C10', flex: 0, paddingHorizontal: 12 },
  actionBtnText: { color: '#4A90D9', fontSize: 11, fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F2137',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: {
    color: '#FFFFFF', fontSize: 17, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 14,
  },

  // Barre de progression
  progressBg: {
    backgroundColor: '#1A2F4A', borderRadius: 6,
    height: 8, marginBottom: 16, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#C9A84C', borderRadius: 6,
  },

  // Liste fichiers
  fileList: { maxHeight: 200, marginBottom: 8 },
  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A2F4A', borderRadius: 8,
    padding: 10, marginBottom: 6,
  },
  fileRowIcon: { fontSize: 18, marginRight: 10 },
  fileRowInfo: { flex: 1 },
  fileRowName: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  fileRowSize: { color: '#607D8B', fontSize: 11, marginTop: 2 },
  fileRowRemove: {
    backgroundColor: '#E74C3C20', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8,
  },
  fileRowRemoveText: { color: '#E74C3C', fontSize: 12, fontWeight: 'bold' },

  addMoreBtn: {
    borderWidth: 1, borderColor: '#C9A84C', borderStyle: 'dashed',
    borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 12,
  },
  addMoreBtnText: { color: '#C9A84C', fontSize: 13 },

  inputLabel: { color: '#B0BEC5', fontSize: 12, marginBottom: 4, marginTop: 4 },
  input: {
    backgroundColor: '#1A2F4A', borderWidth: 1,
    borderColor: '#2A4060', borderRadius: 8,
    padding: 10, color: '#FFFFFF', fontSize: 13, marginBottom: 4,
  },

  submitBtn: {
    backgroundColor: '#C9A84C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#0A1628', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: {
    backgroundColor: '#1A2F4A', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8,
  },
  cancelBtnText: { color: '#607D8B', fontSize: 14 },

  uploadingBox: { alignItems: 'center', paddingVertical: 24 },
  uploadingText: { color: '#B0BEC5', fontSize: 13, marginTop: 12, textAlign: 'center' },
});
