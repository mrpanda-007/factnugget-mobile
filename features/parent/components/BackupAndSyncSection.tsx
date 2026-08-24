import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { useState } from 'react';

import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { colors } from '@constants/tokens';
import { useBackupAndSync } from '@features/parent/hooks/useBackupAndSync';
import { AccountSwitchSection } from '@features/parent/components/AccountSwitchSection';
import { RemoteExplorerImportSection } from '@features/parent/components/RemoteExplorerImportSection';

type FormMode = 'none' | 'create' | 'signIn' | 'reset';

function AccountForm({
  mode,
  disabled,
  onSubmit,
  onForgot,
}: {
  mode: Exclude<FormMode, 'none'>;
  disabled: boolean;
  onSubmit: (email: string, password: string) => void;
  onForgot: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const reset = mode === 'reset';
  const create = mode === 'create';
  const valid = email.trim().includes('@') && (reset || password.length >= 6);
  return (
    <View className="gap-md">
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Parent email"
        editable={!disabled}
        accessibilityLabel="Parent email"
        className="rounded-md border-2 border-ocean-100 bg-cream px-md py-sm font-nunito-regular text-body-md text-ink-900"
      />
      {!reset ? (
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Password"
          editable={!disabled}
          accessibilityLabel="Password"
          className="rounded-md border-2 border-ocean-100 bg-cream px-md py-sm font-nunito-regular text-body-md text-ink-900"
        />
      ) : null}
      <Button
        label={reset ? 'Send reset link' : create ? 'Create account & set up backup' : 'Sign in'}
        onPress={() => (reset ? onForgot(email) : onSubmit(email, password))}
        disabled={disabled || !valid}
        accessibilityLabel={
          reset
            ? 'Send password reset link'
            : create
              ? 'Create parent account and set up backup'
              : 'Sign in to parent account'
        }
      />
    </View>
  );
}

/** Parent-gated account and learning-progress backup controls. Store purchases stay separate. */
export function BackupAndSyncSection() {
  const backup = useBackupAndSync();
  const [form, setForm] = useState<FormMode>('none');
  const [showRemoteImport, setShowRemoteImport] = useState(false);
  const [switchConfirmation, setSwitchConfirmation] = useState(false);
  const working = backup.operationActive;

  const submit = (email: string, password: string) => {
    if (form === 'create') void backup.createAccount(email, password);
    if (form === 'signIn') void backup.signIn(email, password);
  };

  return (
    <View className="gap-md">
      <Text
        accessibilityRole="header"
        className="font-fredoka-semibold text-display-md text-ink-900"
      >
        Backup &amp; Sync
      </Text>
      <Card className="gap-md" padding="lg">
        <Text className="font-nunito-semibold text-body-md text-ink-900">
          Keep learning progress connected to your parent account
        </Text>
        <Text className="font-nunito-regular text-body-sm text-ink-600">
          Back up your Explorer&apos;s learning progress and keep it available with your parent
          account. Backup &amp; Sync is optional and does not restore App Store or Google Play
          purchases.
        </Text>
        {working ? (
          <View className="flex-row items-center gap-md" accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.ocean500} />
            <Text className="font-nunito-regular text-body-sm text-ink-600">{backup.message}</Text>
          </View>
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            className="font-nunito-regular text-body-sm text-ink-600"
          >
            {backup.message}
          </Text>
        )}

        {(backup.status === 'localOnlySignedOut' ||
          backup.status === 'error' ||
          backup.status === 'offline') &&
        form === 'none' ? (
          <View className="gap-sm">
            {/* <Button
              label="Create parent account"
              onPress={() => setForm('create')}
              disabled={working}
            />
            <Button
              label="Sign in"
              onPress={() => setForm('signIn')}
              variant="secondary"
              disabled={working}
            /> */}
            <Text className="font-nunito-regular text-body-sm text-ink-600">Coming soon...</Text>
          </View>
        ) : null}
        {form === 'create' || form === 'signIn' ? (
          <View className="gap-sm">
            <AccountForm
              mode={form}
              disabled={working}
              onSubmit={submit}
              onForgot={(email) => void backup.requestPasswordReset(email)}
            />
            {form === 'signIn' ? (
              <Button
                label="Forgot password?"
                onPress={() => setForm('reset')}
                variant="secondary"
                disabled={working}
              />
            ) : null}
            <Button
              label="Cancel"
              onPress={() => setForm('none')}
              variant="secondary"
              disabled={working}
            />
          </View>
        ) : null}
        {form === 'reset' ? (
          <View className="gap-sm">
            <AccountForm
              mode="reset"
              disabled={working}
              onSubmit={() => undefined}
              onForgot={(email) => void backup.requestPasswordReset(email)}
            />
            <Button
              label="Back to sign in"
              onPress={() => setForm('signIn')}
              variant="secondary"
              disabled={working}
            />
          </View>
        ) : null}

        {backup.status === 'signedOutBound' ? (
          <Button
            label="Sign in to resume backup"
            onPress={() => setForm('signIn')}
            disabled={working}
          />
        ) : null}
        {backup.status === 'familySetupAvailable' || backup.status === 'authenticatedUnbound' ? (
          <Button
            label="Set up Backup & Sync"
            onPress={() => void backup.setUpBackup()}
            disabled={working}
          />
        ) : null}
        {backup.status === 'existingFamilyChoiceRequired' ? (
          <View className="gap-sm">
            <Text className="font-nunito-regular text-body-sm text-ink-600">
              Add this device&apos;s Explorer(s) to your Family, or keep this device local for now.
              Existing cloud Explorers are not imported automatically.
            </Text>
            <Button
              label="Add this device’s Explorer(s)"
              onPress={() => void backup.addThisDevice()}
              disabled={working}
            />
            <Button
              label="Keep this device local for now"
              onPress={() => backup.keepLocal()}
              variant="secondary"
              disabled={working}
            />
          </View>
        ) : null}
        {backup.status === 'connected' ||
        backup.status === 'pendingChanges' ||
        backup.status === 'offline' ? (
          <View className="gap-sm">
            <Button
              label={backup.status === 'connected' ? 'Sync now' : 'Try again'}
              onPress={() => void backup.syncNow()}
              disabled={working}
              variant="secondary"
            />
            <Button
              label="Sign out"
              onPress={() => void backup.signOut()}
              disabled={working}
              variant="secondary"
            />
            {!switchConfirmation ? (
              <Button
                label="Switch parent account"
                onPress={() => setSwitchConfirmation(true)}
                disabled={working}
                variant="secondary"
              />
            ) : (
              <View className="gap-sm">
                <Text className="font-nunito-regular text-body-sm text-ink-600">
                  Switching accounts will not move unsynced changes from the previous account. Sign
                  in to the new account, then choose how this device should connect.
                </Text>
                <Button
                  label="Sign out and choose another account"
                  onPress={() => {
                    void backup.signOut();
                    setForm('signIn');
                    setSwitchConfirmation(false);
                  }}
                  disabled={working}
                  variant="secondary"
                />
              </View>
            )}
          </View>
        ) : null}
        {backup.status === 'accountMismatch' || backup.status === 'familyMismatch' ? (
          <View className="gap-sm">
            {backup.status === 'accountMismatch' ? (
              <AccountSwitchSection
                onSwitched={(mode) => {
                  if (mode === 'addLocal') void backup.addThisDevice();
                  else {
                    setShowRemoteImport(mode === 'import');
                    void backup.syncNow();
                  }
                }}
              />
            ) : null}
            <Button
              label="Sign out"
              onPress={() => void backup.signOut()}
              disabled={working}
              variant="secondary"
            />
          </View>
        ) : null}
        {backup.status === 'connected' || backup.status === 'pendingChanges' || showRemoteImport ? (
          <RemoteExplorerImportSection />
        ) : null}
      </Card>
    </View>
  );
}
