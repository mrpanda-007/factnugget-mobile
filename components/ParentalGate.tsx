import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@components/Button';
import { Card } from '@components/Card';

interface ParentalGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface MathProblem {
  a: number;
  b: number;
  answer: number;
}

/** Never the same problem twice in a row — docs/design/02-component-architecture.md#parentalgate. */
function generateProblem(previousAnswer?: number): MathProblem {
  let a = 0;
  let b = 0;
  let answer = 0;
  do {
    a = 2 + Math.floor(Math.random() * 8);
    b = 2 + Math.floor(Math.random() * 8);
    answer = a + b;
  } while (answer === previousAnswer);
  return { a, b, answer };
}

/**
 * Required before any in-app purchase or external link, and before entering
 * the Parent Area at all (docs/design/01-screen-map.md) —
 * docs/implementation/13-apple-kids-compliance.md#parental-gates. The only
 * place gate logic lives; no feature re-implements this.
 *
 * "Voice-forward" here means a strong, explicit, screen-reader-announced
 * prompt rather than a played audio file — real narration is out of MVP
 * scope (docs/implementation/05-content-schema.md#audio-future-narration).
 */
export function ParentalGate({ onSuccess, onCancel }: ParentalGateProps) {
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem());
  const [input, setInput] = useState('');
  const [showRetry, setShowRetry] = useState(false);

  const handleSubmit = useCallback(() => {
    const value = Number.parseInt(input, 10);
    if (value === problem.answer) {
      onSuccess();
      return;
    }
    setShowRetry(true);
    setInput('');
    setProblem(generateProblem(problem.answer));
  }, [input, problem, onSuccess]);

  return (
    <View className="flex-1 items-center justify-center bg-cream px-xl">
      <Card padding="xl" radius="xl" elevation="floating" className="w-full items-center gap-lg">
        <Text
          className="text-center font-nunito-semibold text-body-md text-ink-600"
          accessibilityRole="text"
          accessibilityLabel="Ask a grown-up to help with this next part."
        >
          👨‍👩‍👧 Ask a grown-up to help!
        </Text>

        <Text className="font-fredoka-semibold text-display-lg text-ink-900">Parent Area</Text>

        <Text className="font-nunito-regular text-body-md text-ink-600">
          What is {problem.a} + {problem.b}?
        </Text>

        <TextInput
          value={input}
          onChangeText={setInput}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel={`Enter the answer to ${problem.a} plus ${problem.b}`}
          className="w-24 rounded-md border-2 border-sand bg-surface py-sm text-center font-nunito-extrabold text-display-md text-ink-900"
        />

        {showRetry ? (
          <Text className="font-nunito-semibold text-body-sm text-coral-700">
            Not quite — try the new question!
          </Text>
        ) : null}

        <View className="w-full gap-sm">
          <Button label="Continue" onPress={handleSubmit} disabled={input.length === 0} />
          <Button label="Not Now" onPress={onCancel} variant="secondary" />
        </View>
      </Card>
    </View>
  );
}
