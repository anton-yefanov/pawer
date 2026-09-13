import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { GlassCircle } from "@/components/circle-button";
import { AddMenu } from "@/components/templates/add-menu";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  FolderCard,
  type FolderCardData,
} from "@/components/templates/folder-card";
import { slotHeight } from "@/components/templates/grid-card";
import {
  TemplateCard,
  type TemplateCardData,
} from "@/components/templates/template-card";
import { useTemplateDrag } from "@/components/templates/template-drag";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import * as haptics from "@/lib/haptics";

export const COLUMNS = 2;
export const GAP = Spacing.two;
/**
 * Room for a card's shadow inside the collapsible's clip box. Cancelled by an
 * equal negative margin, so the grid sits exactly where it did without it.
 */
const BLEED = 12;

export type Cell =
  | { kind: "folder"; key: string; folder: FolderCardData }
  | { kind: "template"; key: string; template: TemplateCardData };

export function TemplateSection({
  title,
  templates,
  folders = [],
  showAdd = false,
  collapsible = false,
  draggable = false,
  emptyHint,
}: {
  title: string;
  templates: readonly TemplateCardData[];
  folders?: readonly FolderCardData[];
  showAdd?: boolean;
  collapsible?: boolean;
  draggable?: boolean;
  emptyHint?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const count = folders.length + templates.length;
  const { gridHeight } = useGridMetrics(count);
  const isEmpty = count === 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="title2">{title}</ThemedText>
        {showAdd && <AddMenu />}
        {collapsible && (
          <CollapseToggle
            title={title}
            collapsed={collapsed}
            onPress={() => {
              haptics.tap();
              setCollapsed((current) => !current);
            }}
          />
        )}
      </View>

      {isEmpty && emptyHint && (
        <EmptyState
          icon="rectangle.stack.badge.plus"
          text={emptyHint}
          style={styles.empty}
        />
      )}

      {isEmpty ? null : (
        <Collapsible collapsed={collapsed} height={gridHeight}>
          <CardGrid folders={folders} templates={templates} draggable={draggable} />
        </Collapsible>
      )}
    </View>
  );
}

/**
 * Collapsing animates the section's own height rather than unmounting the grid:
 * the cells are absolutely positioned off a height the parent already knows, so
 * there is nothing to measure and the cards keep their slots on the way back.
 */
function Collapsible({
  collapsed,
  height,
  children,
}: {
  collapsed: boolean;
  height: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    height: withTiming(collapsed ? 0 : height + BLEED * 2, { duration: 240 }),
    opacity: withTiming(collapsed ? 0 : 1, { duration: 240 }),
  }));

  return (
    <Animated.View style={[styles.collapsible, style]}>
      {children}
    </Animated.View>
  );
}

function CollapseToggle({
  title,
  collapsed,
  onPress,
}: {
  title: string;
  collapsed: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(collapsed ? "-90deg" : "0deg", { duration: 240 }) },
    ],
  }));

  return (
    <GlassCircle>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        accessibilityState={{ expanded: !collapsed }}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Animated.View style={style}>
          <Icon name="chevron.down" size={22} tintColor={theme.text} />
        </Animated.View>
      </Pressable>
    </GlassCircle>
  );
}

/**
 * A lattice of absolutely-positioned cells rather than rows of flexed views:
 * reordering slides a card from one slot to another, which needs every slot at
 * a position arithmetic can predict from its index. Folders come first, so a
 * folder's index is always below every template's.
 */
export function CardGrid({
  folders = [],
  templates,
  draggable = false,
  menuFor,
}: {
  folders?: readonly FolderCardData[];
  templates: readonly TemplateCardData[];
  draggable?: boolean;
  /** A card's corner menu; none when omitted. */
  menuFor?: (cell: Cell) => React.ReactNode;
}) {
  const cells: Cell[] = [
    ...folders.map((folder): Cell => ({
      kind: "folder",
      key: `f-${folder.id}`,
      folder,
    })),
    ...templates.map((template): Cell => ({
      kind: "template",
      key: `t-${template.id}`,
      template,
    })),
  ];
  const { cellWidth, cellHeight, gridHeight } = useGridMetrics(cells.length);

  return draggable ? (
    <DraggableGrid
      cells={cells}
      cellWidth={cellWidth}
      cellHeight={cellHeight}
      gridHeight={gridHeight}
      folderCount={folders.length}
      menuFor={menuFor}
    />
  ) : (
    <View style={{ height: gridHeight }}>
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          style={[styles.cell, slotOffset(index, cellWidth, cellHeight)]}
        >
          <Placed
            cell={cell}
            index={index}
            width={cellWidth}
            draggable={false}
            menu={menuFor?.(cell)}
          />
        </View>
      ))}
    </View>
  );
}

function useGridMetrics(count: number) {
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = cardCellWidth(screenWidth);
  const cellHeight = slotHeight(cellWidth);
  const rows = Math.ceil(count / COLUMNS);
  const gridHeight = rows === 0 ? 0 : rows * cellHeight + (rows - 1) * GAP;
  return { cellWidth, cellHeight, gridHeight };
}

function DraggableGrid({
  cells,
  cellWidth,
  cellHeight,
  gridHeight,
  folderCount,
  menuFor,
}: {
  cells: readonly Cell[];
  cellWidth: number;
  cellHeight: number;
  gridHeight: number;
  folderCount: number;
  menuFor?: (cell: Cell) => React.ReactNode;
}) {
  const drag = useTemplateDrag();

  // Re-registered whenever the lattice changes shape.
  useEffect(() => {
    drag.registerGrid({
      cellWidth,
      cellHeight,
      gap: GAP,
      columns: COLUMNS,
      folderCount,
      itemCount: cells.length,
    });
  }, [cellHeight, cellWidth, cells.length, drag, folderCount]);

  return (
    <View style={{ height: gridHeight }}>
      {cells.map((cell, index) => (
        <View
          key={cell.key}
          style={[styles.cell, slotOffset(index, cellWidth, cellHeight)]}
        >
          <Placed
            cell={cell}
            index={index}
            width={cellWidth}
            draggable
            menu={menuFor?.(cell)}
          />
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
  menu,
}: {
  cell: Cell;
  index: number;
  width: number;
  draggable: boolean;
  menu: React.ReactNode;
}) {
  return cell.kind === "folder" ? (
    <FolderCard
      folder={cell.folder}
      width={width}
      index={index}
      draggable={draggable}
      menu={menu}
    />
  ) : (
    <TemplateCard
      template={cell.template}
      width={width}
      index={index}
      draggable={draggable}
      menu={menu}
    />
  );
}

/** A grid cell's width on a screen with the standard side gutter. */
export function cardCellWidth(screenWidth: number): number {
  return (screenWidth - Spacing.three * 2 - GAP) / COLUMNS;
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cell: {
    position: "absolute",
  },
  collapsible: {
    overflow: "hidden",
    margin: -BLEED,
    padding: BLEED,
  },
  toggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  empty: {
    // Asymmetric so the whitespace reads even: the section's own gap adds
    // Spacing.two above, the screen's gap between sections Spacing.four below.
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
});
