import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { IconButton, Input, Photo, Row, Screen, Type } from "@/components/ui";
import { useTravel } from "@/context/travel-store";
import { tripSource, Trip } from "@/constants/trips";
import { colors as c } from "@/constants/theme";
export default function Explore() {
  const [category, setCategory] = useState("Beaches");
  const [query, setQuery] = useState("");
  const { trips } = useTravel();
  const found = query.trim()
    ? trips.filter((t) =>
        `${t.location} ${t.country} ${t.title}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : category === "Beaches"
      ? ["bali", "santorini", "bora", "maldives"].map((id) =>
          trips.find((t) => t.id === id)!,
        )
      : trips.filter((t) => t.category === category);
  const tile = (trip: Trip, i: number) => (
    <Pressable
      key={trip.id}
      onPress={() =>
        router.push({ pathname: "/post/[id]", params: { id: trip.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`Explore ${trip.title}`}
      style={{ padding: 8, backgroundColor: "white", borderRadius: 20, gap: 8 }}
    >
      <Photo
        source={tripSource(trip)}
        style={{
          width: "100%",
          height: i % 3 === 0 ? 220 : 150,
          borderRadius: 12,
        }}
      />
      <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
        <Type weight="semibold" size={14}>
          {trip.location}
        </Type>
        {i % 3 === 0 && (
          <Type size={11} tone="muted">
            {trip.likes.toLocaleString()} saved this week
          </Type>
        )}
      </View>
    </Pressable>
  );
  return (
    <Screen active="Explore">
      <View style={{ padding: 24, paddingBottom: 16 }}>
        <Row>
          <Type weight="serif" size={32} style={{ flex: 1 }}>
            Discover the world
          </Type>
          <IconButton
            name="imgSearch"
            label="Open map search"
            onPress={() => router.push("/map")}
          />
        </Row>
        <Type tone="muted">Handpicked wanderlust inspiration</Type>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          gap: 8,
          paddingBottom: 16,
        }}
      >
        {["Beaches", "Mountains", "Cities", "Hidden Gems"].map((cat) => (
          <Pressable
            key={cat}
            onPress={() => {
              setCategory(cat);
              setQuery("");
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: cat === category }}
            style={{
              paddingHorizontal: 16,
              minHeight: 44,
              justifyContent: "center",
              borderRadius: 100,
              backgroundColor: category === cat ? c.accent : c.paper,
            }}
          >
            <Type
              size={12}
              style={{ color: category === cat ? "white" : c.muted }}
            >
              {cat}
            </Type>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Input
          accessibilityLabel="Search by country or destination"
          placeholder="Search by country or destination"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      </View>
      {found.length ? (
        <Row
          style={{ paddingHorizontal: 24, gap: 12, alignItems: "flex-start" }}
        >
          {[0, 1].map((col) => (
            <View key={col} style={{ flex: 1, gap: 12 }}>
              {found.map((trip, i) => (i % 2 === col ? tile(trip, i) : null))}
            </View>
          ))}
        </Row>
      ) : (
        <Type tone="muted" style={{ padding: 24 }}>
          No journeys found. Try another destination.
        </Type>
      )}
    </Screen>
  );
}
