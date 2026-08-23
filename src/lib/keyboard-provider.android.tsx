import { KeyboardProvider as Controller } from 'react-native-keyboard-controller';

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  return <Controller>{children}</Controller>;
}
