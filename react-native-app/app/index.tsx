import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Header, IconButton, Photo, Screen, Type } from "@/components/ui";
import { PostCard } from "@/components/post-card";
import { storyPeople } from "@/constants/trips";
import { assets } from "@/constants/figma-assets";
import { colors } from "@/constants/theme";
import { useTravel } from "@/context/travel-store";
export default function Home() {
  const { trips } = useTravel();
  return (
    <Screen
      active="Home"
      header={
        <Header
          title="WeTravel"
          right={
            <View className="flex-row">
              <IconButton
                name="imgSearch"
                label="Search destinations"
                onPress={() => router.push("/map")}
              />
              <IconButton
                name="imgCircleX"
                label="Open inbox"
                onPress={() => router.push("/inbox")}
              />
            </View>
          }
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 14,
          padding: 16,
          paddingHorizontal: 24,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {storyPeople.map(([name, avatar], i) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name}`}
            onPress={() =>
              router.push({
                pathname: "/story",
                params: { author: name === "My Story" ? "aria_thorne" : name },
              })
            }
            style={{ width: 64, gap: 6, alignItems: "center" }}
          >
            <View
              style={{
                borderWidth: 2,
                borderColor: i ? colors.accent : colors.border,
                borderRadius: 34,
                padding: 2,
              }}
            >
              <Photo
                source={assets[avatar]}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
            </View>
            <Type size={11} tone="muted" numberOfLines={1}>
              {name}
            </Type>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ padding: 20, gap: 20 }}>
        {trips
          .filter((t) => t.mine || ["amalfi", "marrakesh"].includes(t.id))
          .map((trip) => (
            <PostCard key={trip.id} trip={trip} />
          ))}
      </View>
    </Screen>
  );
}
