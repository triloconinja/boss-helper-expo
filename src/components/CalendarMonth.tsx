// src/components/CalendarMonth.tsx
import { View, Text } from 'react-native';
import { COLORS, RAD } from '../theme';

type Day = { day: number; label?: string; color?: 'blue' | 'lime' | 'muted' };

export default function CalendarMonth({
  title,
  days,
  weekLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}: {
  title: string;
  days: Day[];
  weekLabels?: string[];
}) {
  return (
    <View style={{ gap: 16 }}>
      <Text
        style={{
          color: COLORS.text,
          fontFamily: 'Montserrat_700Bold',
          fontSize: 36,
          lineHeight: 40,
        }}
      >
        {title}
      </Text>

      {/* Week labels */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {weekLabels.map((w) => (
          <View
            key={w}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: RAD.pill,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.textMuted, fontFamily: 'Montserrat_500Medium' }}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {days.map((d, i) => {
          const bg =
            d.color === 'blue'
              ? COLORS.blue
              : d.color === 'lime'
              ? COLORS.lime
              : 'transparent';
          const color =
            d.color === 'lime'
              ? '#0A0D12'
              : COLORS.text;

          return (
            <View
              key={i}
              style={{
                width: 56,
                height: 64,
                borderRadius: RAD.lg,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: bg,
                padding: 8,
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color,
                  fontFamily: 'Montserrat_700Bold',
                  fontSize: 18,
                }}
              >
                {String(d.day).padStart(2, '0')}
              </Text>
              {!!d.label && (
                <Text
                  numberOfLines={1}
                  style={{
                    color,
                    fontSize: 10,
                    fontFamily: 'Montserrat_500Medium',
                    opacity: 0.9,
                  }}
                >
                  {d.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
