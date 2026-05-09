import React from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

const RECENT_GAMES = [
  { id: "demo-1", name: "Breview-ilta", meta: "4 olutta" },
  { id: "demo-2", name: "IPA-kierros", meta: "6 olutta" },
];

export default function GamesScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-5 px-5 pb-10 pt-6"
    >
      <View className="gap-1">
        <Text variant="h1" className="text-foreground">
          Breview
        </Text>
        <Text variant="muted">Pelit</Text>
      </View>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Luo peli</CardTitle>
          <CardDescription>Lisää oluet, kuvat ja jaettava pelikoodi.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input placeholder="Pelin nimi" />
          <Button>Luo peli</Button>
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Liity peliin</CardTitle>
          <CardDescription>Avaa jaettu peli numerolla tai linkillä.</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Input placeholder="Pelikoodi tai linkki" autoCapitalize="none" />
          <Button variant="secondary">Liity</Button>
        </CardContent>
      </Card>

      <View className="gap-3">
        <Text variant="large">Viimeisimmät</Text>
        {RECENT_GAMES.map((game) => (
          <Card key={game.id} className="py-4">
            <CardContent className="gap-1 py-0">
              <Text variant="large">{game.name}</Text>
              <Text variant="muted">{game.meta}</Text>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm">
                Avaa
              </Button>
            </CardFooter>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
