import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = (scheme === 'light' || scheme === 'dark') ? scheme : 'dark';
  return Colors[theme] || Colors.dark;
}
