import React from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export default function AccountScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
    >
      <View className="gap-1">
        <Text variant="h1">Tili</Text>
        <Text variant="muted">Ei kirjautunut</Text>
      </View>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Historia talteen</CardTitle>
          <CardDescription>Kirjautuminen yhdistää luodut pelit tähän laitteeseen.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button>Kirjaudu sähköpostilla</Button>
          <Button variant="outline">Jatka ilman tiliä</Button>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Data ja tuki</CardTitle>
          <CardDescription>Store-julkaisuun tarvittavat tilisivut tulevat tähän näkymään.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button variant="secondary">Tietosuoja</Button>
          <Button variant="destructive">Poista tili</Button>
        </CardContent>
      </Card>
    </ScrollView>
  );
}
