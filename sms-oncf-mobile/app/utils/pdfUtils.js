import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function generateAndSharePDF(html, { dialogTitle = 'Document PDF', mimeType = 'application/pdf' } = {}) {
  if (Platform.OS === 'web') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        setTimeout(() => { win.print(); URL.revokeObjectURL(url); }, 300);
      });
    } else {
      URL.revokeObjectURL(url);
      Alert.alert('Info', 'Autorisez les popups pour exporter le PDF.');
    }
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
