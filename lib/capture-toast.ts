import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

import { DOMAIN_LABELS, type Domain } from '@/constants/domains';
import type { CaptureResult } from '@/types/capture';
import type { Entry } from '@/types/entry';

interface CaptureToastOptions {
  /** Brain dump uses softer "saved for morning" copy. */
  brainDump?: boolean;
}

function openInInbox(entryId?: string): void {
  Toast.hide();
  if (entryId) {
    router.push({
      pathname: '/inbox',
      params: { highlightEntryId: entryId },
    });
    return;
  }
  router.push('/inbox');
}

function domainLabel(domain: Domain): string {
  return DOMAIN_LABELS[domain] ?? 'Inbox';
}

function toastWithView(
  text1: string,
  text2: string,
  entryId?: string,
): void {
  Toast.show({
    type: 'success',
    text1,
    text2: `${text2} · Tap to view`,
    visibilityTime: 5000,
    onPress: () => openInInbox(entryId),
  });
}

function toastForEntry(entry: Entry, options?: CaptureToastOptions): void {
  const label = domainLabel(entry.domain);
  if (options?.brainDump) {
    toastWithView('Saved for morning', `Routed to ${label}: ${entry.title}`, entry.id);
    return;
  }
  toastWithView(`Saved to ${label}`, entry.title, entry.id);
}

/** Show domain-aware success feedback after capture / voice / brain dump. */
export function showCaptureSuccessToast(
  result: CaptureResult | void | null | unknown,
  options?: CaptureToastOptions,
): void {
  if (!result || typeof result !== 'object' || !('kind' in result)) {
    if (options?.brainDump) {
      Toast.show({
        type: 'success',
        text1: 'Saved for morning',
        text2: "I'll handle it when you wake up",
      });
      return;
    }
    Toast.show({
      type: 'success',
      text1: 'Saved',
      text2: 'Captured and routed · Tap to view in Inbox',
      visibilityTime: 5000,
      onPress: () => openInInbox(),
    });
    return;
  }

  const capture = result as CaptureResult;

  if (capture.kind === 'feedback') {
    Toast.show({
      type: 'success',
      text1: 'Thanks',
      text2: 'Logged as app feedback',
    });
    return;
  }

  if (capture.kind === 'entry') {
    toastForEntry(capture.entry, options);
    return;
  }

  if (capture.kind === 'entries') {
    const first = capture.entries[0];
    const domains = [...new Set(capture.entries.map((e) => domainLabel(e.domain)))];
    const summary =
      domains.length === 1
        ? `${capture.count} items → ${domains[0]}`
        : `${capture.count} items routed`;
    toastWithView(
      options?.brainDump ? 'Saved for morning' : 'Saved',
      summary,
      first?.id,
    );
    return;
  }
}
