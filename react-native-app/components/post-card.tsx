import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Card, Photo, Row, Type, Icon, IconButton } from "./ui";
import { Trip, tripSource } from "@/constants/trips";
import { assets } from "@/constants/figma-assets";
import { colors } from "@/constants/theme";
import { useTravel, toggle } from "@/context/travel-store";
export function PostCard({ trip }: { trip: Trip }) {
  const { state, update } = useTravel();
  const liked = state.liked.includes(trip.id);
  const saved = state.saved.includes(trip.id);
  const open = () =>
    router.push({ pathname: "/post/[id]", params: { id: trip.id } });
  return (
    <Card>
      <Row>
        <Photo
          source={assets[trip.avatar]}
          style={{ width: 36, height: 36, borderRadius: 18 }}
        />
        <View className="flex-1">
          <Type weight="semibold">{trip.author}</Type>
          <Type size={11} tone="muted">
            {trip.location}
          </Type>
        </View>
        <IconButton
          name="imgMoreHorizontal"
          label={`View ${trip.title}`}
          onPress={open}
        />
      </Row>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${trip.title}`}
        onPress={open}
      >
        <Photo
          source={tripSource(trip)}
          label={trip.location}
          style={{ width: "100%", aspectRatio: 338 / 260, borderRadius: 16 }}
        />
      </Pressable>
      <Row>
        <Pressable
          onPress={() =>
            update((s) => ({ ...s, liked: toggle(s.liked, trip.id) }))
          }
          accessibilityRole="button"
          accessibilityLabel={liked ? "Unlike trip" : "Like trip"}
          accessibilityState={{ selected: liked }}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Row style={{ gap: 4 }}>
            <Icon
              name="imgHeart"
              size={20}
              tint={liked ? colors.accent : colors.ink}
            />
            <Type size={13}>
              {(trip.likes + (liked ? 1 : 0)).toLocaleString()}
            </Type>
          </Row>
        </Pressable>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel="View comments"
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Row style={{ gap: 4 }}>
            <Icon name="imgMessageCircle" size={20} />
            <Type size={13}>
              {(trip.id === "amalfi" ? 84 : 42) +
                (state.comments[trip.id]?.length ?? 0)}
            </Type>
          </Row>
        </Pressable>
        <View className="flex-1" />
        <IconButton
          name="imgBookmark"
          label={saved ? "Unsave travel plan" : "Save travel plan"}
          tint={saved ? colors.accent : colors.ink}
          onPress={() =>
            update((s) => ({ ...s, saved: toggle(s.saved, trip.id) }))
          }
        />
      </Row>
      <Type size={13} numberOfLines={3}>
        <Type size={13} weight="semibold">
          {trip.author}{" "}
        </Type>
        {trip.caption}
      </Type>
    </Card>
  );
}
