import { StyleSheet, Text, View } from 'react-native';

import { DOMAINS, DOMAIN_LABELS, type Domain } from '@/constants/domains';
import { useTheme } from '@/hooks/useTheme';

interface DomainIconProps {
  domain: Domain;
  size?: number;
}

const DOMAIN_EMOJI: Record<Domain, string> = {
  [DOMAINS.HEALTH]: '♥',
  [DOMAINS.TASK]: '✓',
  [DOMAINS.LEARNING]: '📚',
  [DOMAINS.IDEA]: '💡',
  [DOMAINS.NOTE]: '📝',
  [DOMAINS.JOURNAL]: '📓',
};

export function DomainIcon({ domain, size = 32 }: DomainIconProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.domain[domain],
        },
      ]}>
      <Text style={[styles.emoji, { fontSize: size * 0.45, color: colors.primaryContrast }]}>
        {DOMAIN_EMOJI[domain]}
      </Text>
    </View>
  );
}

export function DomainLabel({ domain }: { domain: Domain }) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSecondary }]}>{DOMAIN_LABELS[domain]}</Text>;
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
