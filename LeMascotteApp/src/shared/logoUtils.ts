/**
 * Logo utility for Le Mascotte
 * Carga el logo como Base64 para incrustarlo en reportes PDF
 */
import { Image, Platform } from 'react-native';

export const STORE_INFO = {
  name: 'Le Mascotte Pet Shop',
  address: 'CL. 73 sur #45-15, Ciudad Bolívar',
  neighborhood: 'Barrio Arborizadora Alta',
  city: 'Bogotá D.C, Colombia',
  phone: '+57 300 6977862',
  instagram: '@lemascotte.petshop',
};

let cachedLogoBase64: string | null = null;

/**
 * Convierte una URI de imagen a Base64 Data URI usando fetch
 */
async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Carga el logo desde assets como Base64 para PDF.
 * Usa Image.resolveAssetSource para obtener la URI real, luego fetch + FileReader
 * para convertir a Data URI. Funciona en web y nativo.
 * El resultado se cachea tras la primera carga.
 */
export async function loadLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;

  try {
    const source = Image.resolveAssetSource(require('../../assets/images/logo.png'));
    const uri = source?.uri;

    if (!uri) return '';

    const dataUri = await uriToBase64(uri);
    cachedLogoBase64 = dataUri;
    return dataUri;
  } catch {
    // Si falla cualquier cosa, devolvemos vacío y el PDF usará el emoji fallback
    return '';
  }
}