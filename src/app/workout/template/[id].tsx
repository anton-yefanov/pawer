import { useLocalSearchParams } from 'expo-router';

import { TemplatePreview } from '@/components/templates/template-preview';

export default function TemplatePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TemplatePreview id={id} />;
}
