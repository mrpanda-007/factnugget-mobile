import { Linking, Text, View } from 'react-native';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import {
  getLegalLinks,
  hasAnyLegalLink,
  type LegalLinks,
} from '../../../application/release/legalLinks';

interface LegalLinksSectionProps {
  links?: LegalLinks;
  openUrl?: (url: string) => Promise<unknown>;
}

const ROWS: { key: keyof LegalLinks; label: string; description: string }[] = [
  {
    key: 'privacyPolicy',
    label: 'Privacy Policy',
    description: 'How FactNuggets handles information.',
  },
  { key: 'terms', label: 'Terms', description: 'The terms for using FactNuggets.' },
  { key: 'support', label: 'Support', description: 'Get help or send us a question.' },
];

/**
 * Parent-gated only. Rows appear solely for links that are configured and pass
 * scheme validation, so an unset or malformed value renders nothing rather than
 * a dead control. A failed open is swallowed: there is no useful recovery to
 * offer a parent, and it must never surface as a crash.
 */
export function LegalLinksSection({
  links = getLegalLinks(),
  openUrl = Linking.openURL,
}: LegalLinksSectionProps) {
  if (!hasAnyLegalLink(links)) return null;

  const open = (url: string) => {
    void Promise.resolve()
      .then(() => openUrl(url))
      .catch(() => undefined);
  };

  return (
    <View className="gap-md">
      <Text
        accessibilityRole="header"
        className="font-fredoka-semibold text-display-md text-ink-900"
      >
        About &amp; Legal
      </Text>
      <Card className="gap-md" padding="lg">
        {ROWS.map(({ key, label, description }) => {
          const url = links[key];
          if (!url) return null;
          return (
            <View key={key} className="gap-sm">
              <Text className="font-nunito-semibold text-body-md text-ink-900">{label}</Text>
              <Text className="font-nunito-regular text-body-sm text-ink-600">{description}</Text>
              <Button
                label={`Open ${label}`}
                onPress={() => open(url)}
                variant="secondary"
                accessibilityLabel={`Open ${label} in your browser`}
              />
            </View>
          );
        })}
      </Card>
    </View>
  );
}
