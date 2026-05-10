import type { AccountHistoryItemDto } from "@breview/shared/api-contracts";
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
import { getOrCreateClientId } from "@/lib/player-identity";
import { mobileSupportConfig } from "@/lib/support";

function formatHistoryDate(value: string | null): string {
  if (!value) return "Ei päivämäärää";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function PrivacyText() {
  return (
    <View className="gap-3">
      <Text selectable variant="muted">
        Breview käyttää sähköpostiosoitetta vain kirjautumiseen ja omien arvostelujen löytämiseen.
        Arvosteluissa tallentuvat nimimerkki, arvosanat, kommentit, pelin tiedot ja mahdolliset ladatut kuvat.
      </Text>
      <Text selectable variant="muted">
        Laitteeseen tallennetaan tekninen tunniste, jolla aiemmat arvostelut voidaan liittää tiliin. Kertakäyttökoodi
        vanhenee 10 minuutissa.
      </Text>
      <Text selectable variant="muted">
        Tietoja käytetään pelien luomiseen, arvostelujen tallentamiseen, tulosten näyttämiseen ja väärinkäytön
        rajoittamiseen. Kirjautunut käyttäjä voi poistaa tilinsä tästä näkymästä.
      </Text>
    </View>
  );
}

function HistoryList({ history }: { history: AccountHistoryItemDto[] }) {
  if (!history.length) {
    return <Text variant="muted">Ei tilille linkitettyjä arvosteluja vielä.</Text>;
  }

  return (
    <View className="gap-2">
      {history.map((item) => (
        <View key={item.gameId} className="gap-1 rounded-md border border-border bg-background p-3">
          <Text variant="large">{item.gameName || `Peli #${item.gameId}`}</Text>
          <Text variant="muted">
            {item.ratingsCount} arviota · {formatHistoryDate(item.updatedAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function AccountScreen() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [history, setHistory] = useState<AccountHistoryItemDto[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
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

  async function openSupportPage() {
    try {
      await Linking.openURL(mobileSupportConfig.pageUrl);
    } catch {
      Alert.alert("Support page", "Support page could not be opened.");
    }
  }

  async function requestCode() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.requestLoginCode({ email });
      setEmail(response.email);
      setCodeSent(true);
      setMessage("Koodi lähetetty. Tarkista sähköposti.");
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
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
      setMessage("Kirjautuminen onnistui.");
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!session) return;
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
    Alert.alert("Poista tili", "Poistetaanko tili ja siihen linkitetyt arvostelut?", [
      { text: "Peruuta", style: "cancel" },
      {
        text: "Poista",
        style: "destructive",
        onPress: () => {
          void deleteAccount();
        },
      },
    ]);
  }

  async function deleteAccount() {
    if (!session) return;
    setLoading(true);
    setMessage(null);

    try {
      await apiClient.deleteAccount(session.sessionToken);
      await clearAccountSession();
      setSession(null);
      setHistory([]);
      setMessage("Tili poistettu.");
    } catch (error) {
      setMessage(String((error as Error)?.message ?? error));
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
      <View className="gap-1">
        <Text variant="h1">Tili</Text>
        <Text variant="muted">{session ? session.user.email : "Ei kirjautunut"}</Text>
      </View>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>{session ? "Omat arvostelut" : "Historia talteen"}</CardTitle>
          <CardDescription>
            {session
              ? "Tilille linkitetyt arvostelupelit löytyvät tästä."
              : "Kirjautuminen yhdistää tämän laitteen arvostelut sähköpostiin."}
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
              <Button loading={loading} onPress={requestCode}>
                {codeSent ? "Lähetä uusi koodi" : "Lähetä koodi"}
              </Button>
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
                    Kirjaudu
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
          <CardDescription>Want to support future beer science?</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Text variant="muted">No pressure. The app works either way.</Text>
          <Button variant="outline" onPress={() => void openSupportPage()}>
            {mobileSupportConfig.ctaLabel}
          </Button>
        </CardContent>
      </Card>

      {session ? (
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Data ja tuki</CardTitle>
            <CardDescription>Tilin hallinta koskee vain kirjautunutta tiliä.</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <Button variant="secondary" loading={loading} onPress={() => void logout()}>
              Kirjaudu ulos
            </Button>
            <Button variant="destructive" loading={loading} onPress={confirmDeleteAccount}>
              Poista tili
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-4">
        <CardContent className="gap-3">
          <Button variant="secondary" onPress={() => setPrivacyOpen((open) => !open)}>
            Tietosuoja
          </Button>
          {privacyOpen ? <PrivacyText /> : null}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
