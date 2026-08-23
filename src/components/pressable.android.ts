/**
 * Gesture Handler's Pressable, which decides what the touch belongs to natively
 * rather than by measuring the responder in JS. Inside a `formSheet` those two
 * disagree: the sheet's footer is repositioned by react-native-screens over the
 * sheet's visible bottom edge, while React still has it at the bottom of a
 * full-height layout, so below the expanded detent a press is judged to have
 * left the button and never fires. See sheet-footer.android.tsx.
 */
export { Pressable } from 'react-native-gesture-handler';
