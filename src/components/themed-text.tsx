import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, ThemeColor, TypeStyles } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    ...TypeStyles.small,
  },
  smallBold: {
    ...TypeStyles.small,
    fontWeight: '700',
  },
  default: {
    ...TypeStyles.body,
  },
  title: {
    ...TypeStyles.display,
  },
  subtitle: {
    ...TypeStyles.headline,
  },
  link: {
    ...TypeStyles.small,
    lineHeight: 30,
  },
  linkPrimary: {
    ...TypeStyles.small,
    lineHeight: 30,
    color: Colors.light.primary,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
