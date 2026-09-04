import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

export const PRIVACY_POLICY_URL = 'https://www.getpawer.app/privacy';
export const TERMS_OF_SERVICE_URL = 'https://www.getpawer.app/terms';

/** Open legal documents in the same in-app browser used by other external links. */
export function openLegalDocument(url: string): Promise<unknown> {
  return openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}
