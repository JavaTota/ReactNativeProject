import { useState } from "react";
import { Modal, Pressable, ScrollView, Share, View } from "react-native";
import { router } from "expo-router";
import { Button, Input, Photo, Row, Screen, Type } from "@/components/ui";
import { assets } from "@/constants/figma-assets";
import { colors as c } from "@/constants/theme";
import { useTravel } from "@/context/travel-store";
import { tripSource } from "@/constants/trips";
export default function Profile() {
  const { state, update, trips } = useTravel();
  const [tab, setTab] = useState("Grid Log");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [notice, setNotice] = useState("");
  const thumbnails = [
    "imgRectangle4",
    "imgRectangle5",
    "imgRectangle6",
    "imgRectangle7",
    "imgRectangle8",
    "imgRectangle9",
  ] as const;
  const ids = ["amalfi", "marrakesh", "swiss", "bali", "temple", "bora"];
  return (
    <Screen active="Profile">
      <View
        style={{
          padding: 24,
          backgroundColor: "white",
          gap: 20,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <Photo
            source={assets.imgEllipse9}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
          <Row style={{ gap: 16 }}>
            {[
              ["34", "Countries"],
              [String(142 + state.posts.length), "Posts"],
              ["12.8k", "Followers"],
            ].map(([n, label]) => (
              <View key={label} style={{ alignItems: "center" }}>
                <Type weight="bold" size={18}>
                  {n}
                </Type>
                <Type size={10} tone="muted">
                  {label}
                </Type>
              </View>
            ))}
          </Row>
        </Row>
        <View style={{ gap: 6 }}>
          <Type weight="serif" size={26}>
            {state.profile.name}
          </Type>
          <Type size={13} tone="muted">
            {state.profile.bio}
          </Type>
          <Type size={12} weight="semibold" tone="accent">
            @aria_thorne · Travel journal
          </Type>
        </View>
        <Row>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() => {
                setName(state.profile.name);
                setBio(state.profile.bio);
                setEditing(true);
              }}
            >
              Edit Profile
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={async () => {
                try {
                  await Share.share({
                    message: `${state.profile.name}'s WeTravel journal\n${state.profile.bio}`,
                  });
                } catch {
                  setNotice("Sharing is not available on this device.");
                }
              }}
            >
              Share Journal
            </Button>
          </View>
        </Row>
        {notice ? <Type accessibilityRole="alert">{notice}</Type> : null}
      </View>
      <Row style={{ paddingHorizontal: 24, gap: 12 }}>
        {["Grid Log", "Map View", "Saved Plans"].map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => setTab(item)}
            style={{
              flex: 1,
              minHeight: 56,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 2,
              borderBottomColor: item === tab ? c.accent : "transparent",
            }}
          >
            <Type size={13} tone={item === tab ? "accent" : "muted"}>
              {item}
            </Type>
          </Pressable>
        ))}
      </Row>
      {tab === "Grid Log" ? (
        <View
          style={{
            padding: 24,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {state.posts.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() =>
                router.push({ pathname: "/post/[id]", params: { id: trip.id } })
              }
              style={{ width: "31%", aspectRatio: 1 }}
              accessibilityRole="button"
              accessibilityLabel={trip.title}
            >
              <Photo
                source={tripSource(trip)}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
              />
            </Pressable>
          ))}
          {thumbnails.map((asset, i) => (
            <Pressable
              key={asset}
              onPress={() =>
                router.push({ pathname: "/post/[id]", params: { id: ids[i] } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open journey ${i + 1}`}
              style={{ width: "31%", aspectRatio: 1 }}
            >
              <Photo
                source={assets[asset]}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
              />
            </Pressable>
          ))}
        </View>
      ) : tab === "Map View" ? (
        <Pressable
          onPress={() => router.push("/map")}
          accessibilityRole="button"
          accessibilityLabel="Open travel map"
          style={{ padding: 24 }}
        >
          <Photo
            source={assets.imgMapCanvas}
            style={{ width: "100%", height: 340, borderRadius: 20 }}
          />
          <Type style={{ textAlign: "center", padding: 12 }} tone="accent">
            Explore your travel map
          </Type>
        </Pressable>
      ) : (
        <View style={{ padding: 24, gap: 16 }}>
          {trips
            .filter((t) => state.saved.includes(t.id))
            .map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() =>
                  router.push({
                    pathname: "/post/[id]",
                    params: { id: trip.id },
                  })
                }
                accessibilityRole="button"
              >
                <Row>
                  <Photo
                    source={tripSource(trip)}
                    style={{ width: 70, height: 70, borderRadius: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Type weight="semibold">{trip.title}</Type>
                    <Type size={12} tone="muted">
                      {trip.country} · {trip.itinerary.length} days
                    </Type>
                  </View>
                </Row>
              </Pressable>
            ))}
          {!state.saved.length && (
            <Type tone="muted">
              Save a travel plan from a post and find it here for your next
              journey.
            </Type>
          )}
        </View>
      )}
      <Modal
        visible={editing}
        transparent
        animationType="fade"
        onRequestClose={() => setEditing(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                backgroundColor: c.background,
                padding: 24,
                borderRadius: 24,
                gap: 16,
                width: "100%",
                maxWidth: 480,
                alignSelf: "center",
              }}
            >
              <Type weight="serif" size={28}>
                Edit profile
              </Type>
              <Input
                accessibilityLabel="Your name"
                value={name}
                onChangeText={setName}
                maxLength={60}
              />
              <Input
                accessibilityLabel="Your biography"
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={300}
              />
              <Button
                disabled={!name.trim()}
                onPress={() => {
                  update((s) => ({
                    ...s,
                    profile: { name: name.trim(), bio: bio.trim() },
                  }));
                  setEditing(false);
                }}
              >
                Save changes
              </Button>
              <Button secondary onPress={() => setEditing(false)}>
                Cancel
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
