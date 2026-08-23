import Svg, { Ellipse, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { BODY_PLATES, BODY_VIEWBOX, HEAD, platePath, type BodyView } from '@/lib/body-map';
import type { MuscleGroup } from '@/lib/muscle-groups';
import { recoveryFill } from '@/lib/muscle-recovery';

/**
 * The svg sizes itself to whatever box it is given — the card and the sheet
 * hand it very different ones — so nothing here needs a measured layout.
 */
export function BodyMap({
  view,
  readiness,
}: {
  view: BodyView;
  readiness: Readonly<Record<MuscleGroup, number>>;
}) {
  const theme = useTheme();

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} fill={theme.backgroundElement} />
      {BODY_PLATES[view].map((plate, index) => (
        <Path
          key={index}
          d={platePath(plate.points, plate.radius)}
          fill={plate.group ? recoveryFill(readiness[plate.group], theme) : theme.backgroundElement}
        />
      ))}
    </Svg>
  );
}
