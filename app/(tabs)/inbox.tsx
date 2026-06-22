import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InboxList } from '@/components/InboxList';
import {
  ALL_LIFE_AREAS,
  BROWSABLE_DOMAINS,
  DOMAIN_LABELS,
  LIFE_AREA_LABELS,
  type Domain,
  type LifeArea,
} from '@/constants/domains';
import { useTheme } from '@/hooks/useTheme';

export default function InboxScreen() {
  const { colors, typography, radius } = useTheme();
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);
  const [activeLifeArea, setActiveLifeArea] = useState<LifeArea | null>(null);

  const header = (
    <View style={styles.header}>
      <Text style={[typography.display, { color: colors.textPrimary }]}>Inbox</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>Everything, in one place.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        <Chip
          label="All"
          active={activeDomain === null}
          color={colors.primary}
          textColor={colors.textSecondary}
          activeText={colors.primaryContrast}
          border={colors.border}
          radius={radius.pill}
          onPress={() => setActiveDomain(null)}
        />
        {BROWSABLE_DOMAINS.map((domain) => (
          <Chip
            key={domain}
            label={DOMAIN_LABELS[domain]}
            active={activeDomain === domain}
            color={colors.domain[domain]}
            textColor={colors.textSecondary}
            activeText={colors.primaryContrast}
            border={colors.border}
            radius={radius.pill}
            onPress={() => setActiveDomain(activeDomain === domain ? null : domain)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}>
        {ALL_LIFE_AREAS.map((area) => (
          <Chip
            key={area}
            label={LIFE_AREA_LABELS[area]}
            active={activeLifeArea === area}
            color={colors.lifeArea[area]}
            textColor={colors.textSecondary}
            activeText={colors.primaryContrast}
            border={colors.border}
            radius={radius.pill}
            onPress={() => setActiveLifeArea(activeLifeArea === area ? null : area)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <InboxList activeDomain={activeDomain} activeLifeArea={activeLifeArea} header={header} />
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  color: string;
  textColor: string;
  activeText: string;
  border: string;
  radius: number;
  onPress: () => void;
}

function Chip({ label, active, color, textColor, activeText, border, radius, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? color : 'transparent',
          borderColor: active ? color : border,
          borderRadius: radius,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? activeText : textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 6,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
