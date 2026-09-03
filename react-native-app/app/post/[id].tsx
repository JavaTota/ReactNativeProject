import { useState } from "react";
import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Back,
  Button,
  Header,
  Icon,
  Input,
  Photo,
  Row,
  Screen,
  Type,
} from "@/components/ui";
import { useTravel, toggle } from "@/context/travel-store";
import { assets } from "@/constants/figma-assets";
import { tripSource } from "@/constants/trips";
import { colors as c } from "@/constants/theme";
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, state, update } = useTravel();
  const trip = trips.find((t) => t.id === id);
  const [comment, setComment] = useState("");
  if (!trip)
    return (
      <Screen active="Home" header={<Header title="Journey" left={<Back />} />}>
        <Type style={{ padding: 24 }}>
          This journey is no longer available.
        </Type>
      </Screen>
    );
  const saved = state.saved.includes(trip.id),
    following = state.following.includes(trip.author);
  return (
    <Screen
      active="Home"
      header={<Header title="WeTravel Post" serif={false} left={<Back />} />}
    >
      <Photo
        source={tripSource(trip)}
        label={trip.location}
        style={{ width: "100%", height: 360 }}
      />
      <View style={{ backgroundColor: "white", padding: 20, gap: 16 }}>
        <Row>
          <Photo
            source={assets[trip.avatar]}
            style={{ width: 36, height: 36, borderRadius: 18 }}
          />
          <View style={{ flex: 1 }}>
            <Type weight="semibold">{trip.author}</Type>
            <Type size={11} tone="muted">
              {trip.location}
            </Type>
          </View>
          {!trip.mine && (
            <Button
              small
              secondary
              onPress={() =>
                update((s) => ({
                  ...s,
                  following: toggle(s.following, trip.author),
                }))
              }
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
        </Row>
        <Type weight="serif" size={28}>
          {trip.title}
        </Type>
        <Type>{trip.caption}</Type>
        {trip.source ? (
          <Type tone="muted">
            Inspired by {trip.source.author} · {trip.source.title}
          </Type>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore location on map"
          onPress={() => router.push("/map")}
        >
          <Row
            style={{
              backgroundColor: c.background,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <Photo
              source={assets.imgMapThumb}
              style={{ width: 56, height: 56, borderRadius: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Type size={13} weight="semibold">
                {trip.location}
              </Type>
              <Type size={11} tone="muted">
                Explore the destination
              </Type>
            </View>
            <Icon name="imgMapPin" size={18} />
          </Row>
        </Pressable>
        <Type weight="serif" size={26}>
          The travel plan
        </Type>
        {trip.itinerary.map((day, i) => (
          <Row key={`${i}-${day}`} style={{ alignItems: "flex-start" }}>
            <Type weight="semibold" tone="accent" style={{ width: 48 }}>
              Day {i + 1}
            </Type>
            <Type style={{ flex: 1 }}>{day}</Type>
          </Row>
        ))}
        {trip.planStops?.map((stop, i) => (
          <View key={i} style={{ gap: 6 }}>
            <Type weight="semibold">
              Day {stop.day + 1} · {stop.name}
            </Type>
            <Type tone="muted">
              {stop.kind}
              {stop.kind === "Hotel"
                ? ` · ${stop.endDay! - stop.day} nights · Check-out day ${stop.endDay! + 1}`
                : ""}
              {stop.rating ? ` · ${stop.rating}/5 ★` : ""}
            </Type>
            {stop.review ? <Type>{stop.review}</Type> : null}
            {stop.photoUri ? (
              <Photo
                source={{ uri: stop.photoUri }}
                style={{ height: 220, borderRadius: 16 }}
              />
            ) : null}
          </View>
        ))}
        <Button
          onPress={() =>
            router.push({ pathname: "/plans", params: { source: trip.id } })
          }
        >
          Use this itinerary
        </Button>
        <Type size={12} tone="muted">
          Create an editable copy with your dates. Save keeps a bookmark to this
          original.
        </Type>
        <Button
          secondary
          onPress={() =>
            update((s) => ({ ...s, saved: toggle(s.saved, trip.id) }))
          }
        >
          {saved ? "Saved to your travel plans ✓" : "Save this travel plan"}
        </Button>
      </View>
      <View style={{ padding: 20, gap: 12 }}>
        <Type weight="semibold" tone="muted">
          Comments ({1 + (state.comments[id]?.length ?? 0)})
        </Type>
        <Row style={{ alignItems: "flex-start" }}>
          <Photo
            source={assets.imgEllipse8}
            style={{ width: 28, height: 28, borderRadius: 14 }}
          />
          <View style={{ flex: 1 }}>
            <Type size={12}>
              <Type size={12} weight="semibold">
                clara_adventures{" "}
              </Type>
              Adding this to my bucket list immediately!
            </Type>
            <Type size={10} tone="subtle">
              2h ago
            </Type>
          </View>
        </Row>
        {(state.comments[id] ?? []).map((text, i) => (
          <Type key={i} size={13}>
            <Type weight="semibold" size={13}>
              You{" "}
            </Type>
            {text}
          </Type>
        ))}
        <Input
          accessibilityLabel="Write a comment"
          placeholder="Add a comment…"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={1000}
        />
        <Button
          disabled={!comment.trim()}
          onPress={() => {
            const text = comment.trim();
            if (!text) return;
            update((s) => ({
              ...s,
              comments: {
                ...s.comments,
                [id]: [...(s.comments[id] ?? []), text],
              },
            }));
            setComment("");
          }}
        >
          Post comment
        </Button>
      </View>
    </Screen>
  );
}
