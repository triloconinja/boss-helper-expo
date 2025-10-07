
import { View, ViewProps } from 'react-native';
import { COLORS, RAD } from '../theme';

export default function Card(props: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: COLORS.card,
          borderRadius: RAD.xl,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
        },
        props.style as any,
      ]}
    />
  );
}
