import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

type Props = ViewProps & {
  /**
   * Extra top spacing below the safe area (default 16).
   * Set to 0 if a screen already spaces itself.
   */
  topGutter?: number;
  /**
   * Horizontal padding for cards / content (default 20).
   */
  side?: number;
};

export default function Screen({
  children,
  style,
  topGutter = 16,
  side = 20,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      edges={['top', 'left', 'right']}
    >
      <View
        {...rest}
        style={[
          {
            flex: 1,
            paddingTop: Math.max(8, topGutter), // uniform breathing room
            paddingHorizontal: side,
          },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
