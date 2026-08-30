import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { GlassCircle } from "@/components/circle-button";
import { AddMenu } from "@/components/templates/add-menu";
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

const COLUMNS = 2;
const GAP = Spacing.two;
/**
 * Room for a card's shadow inside the collapsible's clip box. Cancelled by an
 * equal negative margin, so the grid sits exactly where it did without it.
 */
const BLEED = 12;

type Cell =
  | { kind: "folder"; key: string; folder: FolderCardData }
  | { kind: "template"; key: string; template: TemplateCardData };

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
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = (screenWidth - Spacing.three * 2 - GAP) / COLUMNS;
  const cellHeight = slotHeight(cellWidth);

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

  const isEmpty = cells.length === 0;
  const rows = Math.ceil(cells.length / COLUMNS);
  const gridHeight = rows === 0 ? 0 : rows * cellHeight + (rows - 1) * GAP;

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
        <View style={styles.empty}>
          <Icon
            name="rectangle.stack.badge.plus"
            size={52}
            tintColor={theme.textSecondary}
          />
          <ThemedText style={styles.emptyText} themeColor="textSecondary">
            {emptyHint}
          </ThemedText>
        </View>
      )}

      {isEmpty ? null : (
        <Collapsible collapsed={collapsed} height={gridHeight}>
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
                <View
                  key={cell.key}
                  style={[
                    styles.cell,
                    slotOffset(index, cellWidth, cellHeight),
                  ]}
                >
                  <Placed
                    cell={cell}
                    index={index}
                    width={cellWidth}
                    draggable={false}
                  />
                </View>
              ))}
            </View>
          )}
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
        <View
          key={cell.key}
          style={[styles.cell, slotOffset(index, cellWidth, cellHeight)]}
        >
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
  return cell.kind === "folder" ? (
    <FolderCard folder={cell.folder} width={width} index={index} />
  ) : (
    <TemplateCard
      template={cell.template}
      width={width}
      index={index}
      draggable={draggable}
    />
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
    alignItems: "center",
    gap: Spacing.two,
    // Asymmetric so the whitespace reads even: the section's own gap adds
    // Spacing.two above, the screen's gap between sections Spacing.four below.
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: "center",
  },
});
