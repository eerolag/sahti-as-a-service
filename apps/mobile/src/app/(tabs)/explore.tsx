import type { AccountHistoryItemDto } from "@breview/shared/api-contracts";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { apiClient } from "@/lib/api";
import {
  clearAccountSession,
  loadAccountSession,
  saveAccountSession,
  type AccountSession,
} from "@/lib/account-session";
import { haptics } from "@/lib/haptics";
import { getOrCreateClientId } from "@/lib/player-identity";
import { mobileSupportConfig } from "@/lib/support";
import { useI18n, useT } from "@/lib/i18nContext";

function PrivacyText() {
  const t = useT();
  return (
    <View className="gap-3">
      {t.publicInfo.privacySections.map((section, idx) => (
        <View key={idx} className="gap-2">
          {section.paragraphs.map((p, pIdx) => (
            <Text key={pIdx} selectable variant="muted">
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function HistoryList({ history }: { history: AccountHistoryItemDto[] }) {
  const t = useT();
  const { lang } = useI18n();
  
  function formatHistoryDate(value: string | null): string {
    if (!value) return t.account.noDate;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(lang, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  }

  if (!history.length) {
    return <Text variant="muted">{t.account.noReviewsYet}</Text>;
  }

  return (
    <View className="gap-2">
      {history.map((item) => (
        <View key={item.gameId} className="gap-1 rounded-md border border-border bg-background p-3">
          <Text variant="large">{item.gameName || `${t.home.session} #${item.gameId}`}</Text>
          <Text variant="muted">
            {item.ratingsCount} {t.account.reviewsCount} · {formatHistoryDate(item.updatedAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const t = useT();
  const [session, setSession] = useState<AccountSession | null>(null);
  const [history, setHistory] = useState<AccountHistoryItemDto[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshAccount = useCallback(async (nextSession: AccountSession) => {
    try {
      const account = await apiClient.getAccount(nextSession.sessionToken);
      const hydrated = { sessionToken: nextSession.sessionToken, user: account.user };
      await saveAccountSession(hydrated);
      setSession(hydrated);
      setEmail(account.user.email);
      setHistory(account.history);
    } catch {
      await clearAccountSession();
      setSession(null);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = await loadAccountSession();
      if (stored) {
        setSession(stored);
        setEmail(stored.user.email);
        await refreshAccount(stored);
      }
    })();
  }, [refreshAccount]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timeout = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [resendCooldown]);

  async function openExternalPage(url: string, title = "Breview") {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(title, t.errors.pageNotOpened);
    }
  }

  async function requestCode() {
    if (resendCooldown > 0) return;
    haptics.light();
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.requestLoginCode({ email });
      setEmail(response.email);
      setCodeSent(true);
      setResendCooldown(response.resendAvailableInSeconds);
      setMessage(t.account.codeSentMessage);
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    haptics.light();
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.verifyLoginCode({
        email,
        code,
        clientId: await getOrCreateClientId(),
      });
      const nextSession = { sessionToken: response.sessionToken, user: response.user };
      await saveAccountSession(nextSession);
      setSession(nextSession);
      setHistory(response.history);
      setCode("");
      setCodeSent(false);
      setResendCooldown(0);
      setMessage(t.account.loginSuccess);
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!session) return;
    haptics.selection();
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.logout(session.sessionToken);
    } catch {
      // Local logout should still happen if the session was already gone.
    } finally {
      await clearAccountSession();
      setSession(null);
      setHistory([]);
      setLoading(false);
    }
  }

  function confirmDeleteAccount() {
    if (!session) return;
    haptics.selection();
    Alert.alert(t.nav.deleteAccount, t.account.deleteConfirm, [
      { text: t.game.cancel, style: "cancel" },
      {
        text: t.account.deleteAccountAction,
        style: "destructive",
        onPress: () => {
          void deleteAccount();
        },
      },
    ]);
  }

  async function deleteAccount() {
    if (!session) return;
    haptics.light();
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.deleteAccount(session.sessionToken);
      await clearAccountSession();
      setSession(null);
      setHistory([]);
      setMessage(t.account.deleteSuccess);
      haptics.success();
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="h1">{t.nav.account}</Text>
          <Text variant="muted" numberOfLines={1}>
            {session ? session.user.email : t.account.notLoggedIn}
          </Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            haptics.selection();
            router.replace("/");
          }}
        >
          {t.nav.home}
        </Button>
      </View>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{session ? t.account.myReviews : t.account.historyTitle}</CardTitle>
          <CardDescription>
            {session
              ? t.account.myReviewsSubtitle
              : t.account.historySubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {session ? (
            <HistoryList history={history} />
          ) : (
            <>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="nimi@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button loading={loading} disabled={resendCooldown > 0} onPress={requestCode}>
                {resendCooldown > 0
                  ? t.account.newCodeWait.replace("{seconds}", String(resendCooldown))
                  : codeSent
                    ? t.account.sendNewCode
                    : t.account.sendCode}
              </Button>
              {codeSent && resendCooldown > 0 ? (
                <Text variant="muted">{t.account.codeCooldown}</Text>
              ) : null}
              {codeSent ? (
                <>
                  <Input
                    value={code}
                    onChangeText={setCode}
                    placeholder="123456"
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                  />
                  <Button variant="success" loading={loading} onPress={verifyCode}>
                    {t.account.login}
                  </Button>
                </>
              ) : null}
            </>
          )}
          {message ? (
            <Text selectable variant="muted" className="text-accent">
              {message}
            </Text>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-4 border-primary/40">
        <CardHeader>
          <CardTitle>Made by {mobileSupportConfig.makerName}</CardTitle>
          <CardDescription>Support Breview via the external web page. Support does not unlock additional features.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Text variant="muted">The app works the same without payment.</Text>
          <Button variant="outline" onPress={() => void openExternalPage(mobileSupportConfig.pageUrl, "Breview")}>
            {mobileSupportConfig.ctaLabel}
          </Button>
        </CardContent>
      </Card>

      {session ? (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>{t.account.dataAndSupport}</CardTitle>
            <CardDescription>{t.account.manageAccountOnlyForLoggedIn}</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button variant="secondary" loading={loading} onPress={() => void logout()}>
              {t.account.logout}
            </Button>
            <Button variant="destructive" loading={loading} onPress={confirmDeleteAccount}>
              {t.account.deleteAccountAction}
            </Button>
            <Button
              variant="outline"
              onPress={() => void openExternalPage(mobileSupportConfig.deleteAccountUrl, t.nav.deleteAccount)}
            >
              {t.nav.deleteAccount}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-4">
        <CardContent className="gap-3">
          <Button variant="secondary" onPress={() => setPrivacyOpen((open) => !open)}>
            {t.nav.privacy}
          </Button>
          {privacyOpen ? <PrivacyText /> : null}
          <View className="gap-2">
            <Button variant="outline" onPress={() => void openExternalPage(mobileSupportConfig.privacyUrl, t.nav.privacy)}>
              {t.nav.privacy}
            </Button>
            <Button variant="outline" onPress={() => void openExternalPage(mobileSupportConfig.supportUrl, t.nav.support)}>
              {t.nav.support}
            </Button>
            {!session ? (
              <Button
                variant="outline"
                onPress={() => void openExternalPage(mobileSupportConfig.deleteAccountUrl, t.nav.deleteAccount)}
              >
                {t.nav.deleteAccount}
              </Button>
            ) : null}
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}
