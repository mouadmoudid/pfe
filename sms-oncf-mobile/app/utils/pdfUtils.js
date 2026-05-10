import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Génère un PDF à partir d'un HTML et le partage.
 * - Mobile : crée un fichier PDF réel et ouvre le menu de partage natif.
 * - Web    : ouvre la boîte de dialogue impression du navigateur
 *            (l'utilisateur peut enregistrer en PDF via "Enregistrer au format PDF").
 */
export async function generateAndSharePDF(html, { dialogTitle = 'Document PDF', mimeType = 'application/pdf' } = {}) {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType,
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  }
}
