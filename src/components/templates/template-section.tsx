import { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AddMenu } from '@/components/templates/add-menu';
import { FolderCard, type FolderCardData } from '@/components/templates/folder-card';
import { slotHeight } from '@/components/templates/grid-card';
import { TemplateCard, type TemplateCardData } from '@/components/templates/template-card';
import { useTemplateDrag } from '@/components/templates/template-drag';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const COLUMNS = 2;
const GAP = Spacing.two;

type Cell =
  | { kind: 'folder'; key: string; folder: FolderCardData }
  | { kind: 'template'; key: string; template: TemplateCardData };

/**
 * A lattice of absolutely-positioned cells rather than rows of flexed views:
 * reordering slides a card from one slot to another, which needs every slot at
 * a position arithmetic can predict from its index. Folders come first, so a
 * folder's index is always below every template's.
 */
export function TemplateSection({
  title,
  templates,
  folders = [],
  showAdd = false,
  draggable = false,
  emptyHint,
}: {
  title: string;
  templates: readonly TemplateCardData[];
  folders?: readonly FolderCardData[];
  showAdd?: boolean;
  draggable?: boolean;
  emptyHint?: string;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = (screenWidth - Spacing.three * 2 - GAP) / COLUMNS;
  const cellHeight = slotHeight(cellWidth);

  const cells: Cell[] = [
    ...folders.map((folder): Cell => ({ kind: 'folder', key: `f-${folder.id}`, folder })),
    ...templates.map((template): Cell => ({ kind: 'template', key: `t-${template.id}`, template })),
  ];

  const rows = Math.ceil(cells.length / COLUMNS);
  const gridHeight = rows === 0 ? 0 : rows * cellHeight + (rows - 1) * GAP;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {showAdd && <AddMenu />}
      </View>

      {cells.length === 0 && emptyHint && (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyHint}
        </ThemedText>
      )}

      {draggable ? (
        <DraggableGrid
          cells={cells}
          cellWidth={cellWidth}
          cellHeight={cellHeight}
          gridHeight={gridHeight}
          folderCount={folders.length}
        />
      ) : (
        <View style={{ height: gridHeight }}>
          {cells.map((cell, index) => (
            <View key={cell.key} style={[styles.cell, slotOffset(index, cellWidth, cellHeight)]}>
              <Placed cell={cell} index={index} width={cellWidth} draggable={false} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function DraggableGrid({
  cells,
  cellWidth,
  cellHeight,
  gridHeight,
  folderCount,
}: {
  cells: readonly Cell[];
  cellWidth: number;
  cellHeight: number;
  gridHeight: number;
  folderCount: number;
}) {
  const drag = useTemplateDrag();
  const ref = useRef<View>(null);

  // Re-registered whenever the lattice changes shape. The frame itself is
  // measured at the start of each drag, since scrolling moves it.
  useEffect(() => {
    drag.registerGrid(ref, {
      cellWidth,
      cellHeight,
      gap: GAP,
      columns: COLUMNS,
      folderCount,
      itemCount: cells.length,
    });
  }, [cellHeight, cellWidth, cells.length, drag, folderCount]);

  return (
    <View ref={ref} style={{ height: gridHeight }}>
      {cells.map((cell, index) => (
        <View key={cell.key} style={[styles.cell, slotOffset(index, cellWidth, cellHeight)]}>
          <Placed cell={cell} index={index} width={cellWidth} draggable />
        </View>
      ))}
    </View>
  );
}

function Placed({
  cell,
  index,
  width,
  draggable,
}: {
  cell: Cell;
  index: number;
  width: number;
  draggable: boolean;
}) {
  return cell.kind === 'folder' ? (
    <FolderCard folder={cell.folder} width={width} index={index} />
  ) : (
    <TemplateCard template={cell.template} width={width} index={index} draggable={draggable} />
  );
}

function slotOffset(index: number, cellWidth: number, cellHeight: number) {
  return {
    left: (index % COLUMNS) * (cellWidth + GAP),
    top: Math.floor(index / COLUMNS) * (cellHeight + GAP),
  };
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cell: {
    position: 'absolute',
  },
});
