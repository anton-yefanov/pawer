import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';

export type SheetFooterProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** What a scrolling sheet has to keep clear under its content for the footer. */
export const SHEET_FOOTER_HEIGHT = 50 + Spacing.three * 2;
