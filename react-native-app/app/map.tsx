import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Icon, Input, Photo, Row, Screen, Type } from "@/components/ui";
import { assets } from "@/constants/figma-assets";
import { colors as c } from "@/constants/theme";
import { useTravel } from "@/context/travel-store";
import { tripSource } from "@/constants/trips";
export default function SearchMap() {
  const { trips } = useTravel();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("temple");
  const results = query.trim()
    ? trips.filter((t) =>
        `${t.title} ${t.location}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : trips.filter((t) => t.id === selected);
  return (
    <Screen active="Explore">
      <View style={{ height: 520, position: "relative" }}>
        <Photo
          source={assets.imgMapCanvas}
          label="Illustrated destination map"
          style={{ width: "100%", height: "100%" }}
        />
        <Row
          style={{
            position: "absolute",
            top: 16,
            left: 24,
            right: 24,
            backgroundColor: "white",
            borderRadius: 100,
            paddingHorizontal: 16,
          }}
        >
          <Icon name="imgSearch1" size={18} />
          <Input
            accessibilityLabel="Search maps, logs, tags"
            value={query}
            onChangeText={setQuery}
            placeholder="Search maps, logs, tags…"
            style={{ flex: 1, borderWidth: 0, paddingHorizontal: 0 }}
          />
        </Row>
        {[
          ["temple", "imgRectangle14", 30, 180],
          ["bali", "imgRectangle15", 60, 290],
        ].map(([id, asset, left, top]) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`Select ${id} travel log`}
            accessibilityState={{ selected: selected === id }}
            onPress={() => {
              setSelected(String(id));
              setQuery("");
            }}
            style={{
              position: "absolute",
              left: `${Number(left)}%`,
              top: Number(top),
              padding: 4,
              backgroundColor: "white",
              borderRadius: 10,
              borderWidth: selected === id ? 2 : 0,
              borderColor: c.accent,
            }}
          >
            <Photo
              source={assets[asset as keyof typeof assets]}
              style={{ width: 36, height: 36, borderRadius: 8 }}
            />
          </Pressable>
        ))}
      </View>
      <View
        style={{
          backgroundColor: "white",
          padding: 20,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.border,
          }}
        />
        <Row>
          <Type size={22} weight="serif" style={{ flex: 1 }}>
            {query ? "Search results" : "Explore Nearby Logs"}
          </Type>
          <Type tone="accent" size={12}>
            2.4 miles
          </Type>
        </Row>
        {results.map((trip) => (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${trip.title}`}
            onPress={() =>
              router.push({ pathname: "/post/[id]", params: { id: trip.id } })
            }
          >
            <Row>
              <Photo
                source={tripSource(trip)}
                style={{ width: 64, height: 64, borderRadius: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Type weight="semibold">{trip.title}</Type>
                <Type size={12} tone="muted">
                  {trip.author} · {trip.country}
                </Type>
              </View>
              <Icon name="imgArrowRight" size={20} />
            </Row>
          </Pressable>
        ))}
        {!results.length && (
          <Type tone="muted">No journeys found. Try a country or city.</Type>
        )}
        <Type size={11} tone="subtle">
          Illustrated demo map · distances are sample data
        </Type>
      </View>
    </Screen>
  );
}
