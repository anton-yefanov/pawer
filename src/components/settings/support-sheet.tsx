import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Card, groupedStyles, ROW_HEIGHT, Separator } from '@/components/grouped-list';
import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedTextInput } from '@/components/themed-text-input';
import { CloseButton, HeaderConfirmButton } from '@/components/workout/workout-sheet-header';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useSheetAutoFocus } from '@/hooks/use-sheet-autofocus';
import { useTheme } from '@/hooks/use-theme';
import { notice } from '@/lib/notice';
import { attempt } from '@/lib/observability';
import { loadSupportIdentity, sendSupportMessage } from '@/lib/support';

const SEND_FAILED = {
  title: 'Couldn’t send',
  message: 'Please check your connection and try again.',
};

const SENT = {
  title: 'Thanks!',
  message: 'Your message is on its way. If you left an email address, you’ll hear back.',
};

/**
 * Only the message is required. An address is what makes a reply possible, but
 * demanding one is a reason not to write at all, and a bug report with no way
 * to answer it is still worth having.
 */
export function SupportSheet() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [nameRef, nameAutoFocus] = useSheetAutoFocus(true);
  const emailRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    void attempt(
      'support',
      loadSupportIdentity().then((stored) => {
        // Only ever fills a field the user has not started typing into: the
        // read races the sheet's own autofocus.
        if (cancelled) return;
        setName((current) => (current === '' ? stored.name : current));
        setEmail((current) => (current === '' ? stored.email : current));
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setSending(true);
    const sent = await sendSupportMessage({ name, email, message });
    if (!sent) {
      // Deliberately still open, with the text intact — losing a typed bug
      // report is the one outcome not worth risking.
      setSending(false);
      notice(SEND_FAILED);
      return;
    }
    router.back();
    notice(SENT);
  };

  return (
    <>
      <SheetHeader
        title="Support"
        left={<CloseButton onPress={() => router.back()} />}
        right={
          <HeaderConfirmButton
            onPress={() => void submit()}
            disabled={message.trim() === '' || sending}
          />
        }
      />

      <KeyboardScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <Card>
          <View style={groupedStyles.row}>
            <ThemedTextInput
              ref={nameRef}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              style={styles.input}
              autoFocus={nameAutoFocus}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
          <Separator />
          <View style={groupedStyles.row}>
            <ThemedTextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email (optional)"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
            />
          </View>
        </Card>

        <View style={styles.message}>
          <Card>
            <View style={groupedStyles.row}>
              <ThemedTextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Report a bug or suggest a feature"
                style={styles.messageInput}
                multiline
                textAlignVertical="top"
              />
            </View>
          </Card>
        </View>
      </KeyboardScrollView>

      <KeyboardDismissButton />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.three,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.four,
  },
  input: {
    flex: 1,
    minHeight: ROW_HEIGHT - Spacing.two * 2,
    paddingVertical: 0,
  },
  message: {
    marginTop: Spacing.four,
  },
  messageInput: {
    flex: 1,
    minHeight: ROW_HEIGHT * 3 - Spacing.two * 2,
    paddingVertical: 0,
  },
});
