import { MeshGradientView } from 'expo-mesh-gradient';
import { StyleSheet, View } from 'react-native';

import { type CardColor } from '@/constants/card-colors';
import { cardGradient, MESH_POINTS } from '@/lib/card-gradients';

/**
 * The cover behind a template or folder's artwork. The flat fill is not
 * decoration: below iOS 18 the mesh view renders nothing and the fill is the
 * whole cover.
 *
 * `ignoresSafeArea` is the default, but it has to be passed: every mesh view
 * is its own SwiftUI host and is handed the window's insets whatever it sits
 * on, so honouring them shrinks each cover by the home indicator's 34pt and
 * leaves a band of bare fill along the bottom.
 */
export function CardCover({ color }: { color: CardColor | null }) {
  const { colors, flat } = cardGradient(color);

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: flat }]} />
      <MeshGradientView
        style={StyleSheet.absoluteFill}
        columns={3}
        rows={3}
        colors={colors}
        points={MESH_POINTS}
        ignoresSafeArea
      />
    </>
  );
}
