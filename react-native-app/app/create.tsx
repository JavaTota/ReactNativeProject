import { useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button, Icon, Input, Photo, Row, Screen, Type } from "@/components/ui";
import { assets } from "@/constants/figma-assets";
import { colors as c } from "@/constants/theme";
import { useTravel } from "@/context/travel-store";
import { AssetName } from "@/constants/trips";
export default function Create() {
  const { state, update } = useTravel();
  const [filter, setFilter] = useState(0);
  const [photo, setPhoto] = useState<string>();
  const [error, setError] = useState("");
  const [days, setDays] = useState("");
  const sharing = useRef(false);
  const filters: [string, AssetName][] = [
    ["Sienna", "imgRectangle10"],
    ["Misty", "imgRectangle11"],
    ["Carbon", "imgRectangle12"],
    ["Vivid", "imgRectangle13"],
  ];
  const patch = (changes: Partial<typeof state.draft>) =>
    update((s) => ({ ...s, draft: { ...s.draft, ...changes } }));
  const publish = () => {
    if (sharing.current) return;
    if (!state.draft.caption.trim() || !state.draft.location.trim()) {
      setError("Add a story and a destination before sharing.");
      return;
    }
    sharing.current = true;
    const id = `journey-${Date.now()}`;
    update((s) => ({
      ...s,
      posts: [
        {
          id,
          author: s.profile.name,
          avatar: "imgEllipse9",
          location: s.draft.location.trim(),
          country: s.draft.location.split(",").pop()!.trim(),
          title: s.draft.location.trim(),
          caption: s.draft.caption.trim(),
          photo: filter === 0 ? "imgImagePreview" : filters[filter][1],
          photoUri: photo,
          category: s.draft.category,
          likes: 0,
          mine: true,
          itinerary: days
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        },
        ...s.posts,
      ],
      draft: { caption: "", location: "", category: "Hidden Gems" },
    }));
    router.replace({ pathname: "/post/[id]", params: { id } });
  };
  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        if (!image.base64) {
          setError("This image could not be imported. Try a JPEG or PNG.");
          return;
        }
        if (image.base64.length > 2_000_000) {
          setError(
            "Choose a smaller photo (under roughly 1.5 MB) for this local demo.",
          );
          return;
        }
        setPhoto(
          `data:${image.mimeType ?? "image/jpeg"};base64,${image.base64}`,
        );
        setError("");
      }
    } catch {
      setError(
        "The photo library could not be opened. You can still use a sample image.",
      );
    }
  };
  return (
    <Screen
      active="Create"
      header={
        <Row
          style={{
            paddingHorizontal: 16,
            minHeight: 60,
            backgroundColor: "white",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          <Pressable
            onPress={() => router.replace("/")}
            accessibilityRole="button"
            style={{ padding: 8 }}
          >
            <Type tone="muted">Cancel</Type>
          </Pressable>
          <Type weight="semibold" size={16}>
            New Travel Log
          </Type>
          <Pressable
            onPress={publish}
            accessibilityRole="button"
            style={{ padding: 8 }}
          >
            <Type weight="semibold" tone="accent">
              Share
            </Type>
          </Pressable>
        </Row>
      }
    >
      <View style={{ padding: 20, gap: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose a travel photo"
          onPress={pick}
        >
          <Photo
            source={
              photo
                ? { uri: photo }
                : assets[filter === 0 ? "imgImagePreview" : filters[filter][1]]
            }
            style={{ width: "100%", height: 280, borderRadius: 16 }}
          />
        </Pressable>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {filters.map(([name, asset], i) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`Use ${name} sample`}
              accessibilityState={{ selected: filter === i && !photo }}
              onPress={() => {
                setFilter(i);
                setPhoto(undefined);
              }}
              style={{ gap: 4, alignItems: "center" }}
            >
              <Photo
                source={assets[asset]}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  borderWidth: i === filter && !photo ? 2 : 0,
                  borderColor: c.accent,
                }}
              />
              <Type
                size={11}
                tone={i === filter && !photo ? "accent" : "muted"}
              >
                {name}
              </Type>
            </Pressable>
          ))}
        </ScrollView>
        <Button secondary onPress={pick}>
          Choose your photo
        </Button>
      </View>
      <View style={{ paddingHorizontal: 24, gap: 16 }}>
        <Input
          accessibilityLabel="Travel story"
          multiline
          placeholder="Write an editorial story about this journey…"
          value={state.draft.caption}
          onChangeText={(caption) => patch({ caption })}
          maxLength={2000}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />
        <Row>
          <Icon name="imgMapPin1" size={18} />
          <Input
            accessibilityLabel="Destination"
            placeholder="Add location (city, country)"
            value={state.draft.location}
            onChangeText={(location) => patch({ location })}
            style={{ flex: 1 }}
          />
        </Row>
        <Row>
          <Icon name="imgTag" size={18} />
          <Type tone="muted" style={{ flex: 1 }}>
            Choose Category
          </Type>
        </Row>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {["Beaches", "Mountains", "Cities", "Hidden Gems"].map((category) => (
            <Button
              small
              secondary={state.draft.category !== category}
              key={category}
              onPress={() => patch({ category })}
            >
              {category}
            </Button>
          ))}
        </ScrollView>
        <Type weight="serif" size={24}>
          Your travel plan
        </Type>
        <Input
          accessibilityLabel="Daily itinerary"
          value={days}
          onChangeText={setDays}
          placeholder={
            "One day per line, e.g.\nExplore the old town\nVisit the coast"
          }
          multiline
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
        {error ? (
          <Type accessibilityRole="alert" tone="accent">
            {error}
          </Type>
        ) : null}
        <Type size={11} tone="muted">
          This preview saves your travel log on this device. It is not published
          to other users.
        </Type>
      </View>
    </Screen>
  );
}
