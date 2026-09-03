import { useState } from "react";
import { Pressable, View, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, IconButton, Input, Photo, Row, Type } from "@/components/ui";
import { assets } from "@/constants/figma-assets";
import { useTravel } from "@/context/travel-store";
export default function Story() {
  const { author = "sara_explorer" } = useLocalSearchParams<{
    author?: string;
  }>();
  const [page, setPage] = useState(0);
  const [reply, setReply] = useState("");
  const [sent, setSent] = useState(false);
  const { update } = useTravel();
  const pictures = [
    assets.img6StoriesView,
    assets.imgRectangle9,
    assets.imgRectangle1,
  ];
  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/");
  return (
    <View style={{ flex: 1, backgroundColor: "#1c1715" }}>
      <StatusBar style="light" />
      <Photo
        source={pictures[page]}
        label="Island sunset travel story"
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 600,
            alignSelf: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ padding: 20, gap: 12, backgroundColor: "#0002" }}>
            <Row style={{ gap: 4 }}>
              {pictures.map((_, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`View story ${i + 1}`}
                  onPress={() => setPage(i)}
                  style={{ flex: 1, paddingVertical: 8 }}
                >
                  <View
                    style={{
                      height: 3,
                      borderRadius: 10,
                      backgroundColor: i <= page ? "white" : "#ffffff66",
                    }}
                  />
                </Pressable>
              ))}
            </Row>
            <Row>
              <Photo
                source={assets.imgEllipse10}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
              <View style={{ flex: 1 }}>
                <Type weight="semibold" style={{ color: "white" }}>
                  {author}
                </Type>
                <Type size={11} style={{ color: "#fffd" }}>
                  4 hours ago
                </Type>
              </View>
              <IconButton
                name="imgX"
                tint="white"
                label="Close story"
                onPress={close}
              />
            </Row>
          </View>
          <View style={{ flex: 1, flexDirection: "row" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous story"
              style={{ flex: 1 }}
              onPress={() => setPage(Math.max(0, page - 1))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next story"
              style={{ flex: 1 }}
              onPress={() =>
                page === pictures.length - 1 ? close() : setPage(page + 1)
              }
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore story destination"
            onPress={() => router.push("/post/bora")}
            style={{
              position: "absolute",
              top: "48%",
              alignSelf: "center",
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: "#ffffffbb",
              borderRadius: 100,
            }}
          >
            <Row style={{ gap: 6 }}>
              <Icon name="imgMapPin2" size={14} />
              <Type weight="bold" size={12}>
                Moorea, French Polynesia
              </Type>
            </Row>
          </Pressable>
          <View style={{ padding: 20, backgroundColor: "#0003", gap: 8 }}>
            {sent && (
              <Type
                style={{ color: "white" }}
                accessibilityLiveRegion="polite"
                size={12}
              >
                Reply saved in your local inbox.
              </Type>
            )}
            <Row>
              <Input
                accessibilityLabel={`Reply to ${author}`}
                placeholder={`Reply to ${author}…`}
                placeholderTextColor="#ffffffcc"
                value={reply}
                onChangeText={(text) => {
                  setReply(text);
                  setSent(false);
                }}
                maxLength={500}
                style={{
                  flex: 1,
                  borderColor: "white",
                  borderRadius: 100,
                  backgroundColor: "#ffffff22",
                  color: "white",
                }}
              />
              <IconButton
                name="imgCircleX1"
                tint="white"
                label="Save story reply"
                onPress={() => {
                  if (!reply.trim()) return;
                  update((s) => ({
                    ...s,
                    replies: [...s.replies, `To ${author}: ${reply.trim()}`],
                  }));
                  setReply("");
                  setSent(true);
                }}
              />
            </Row>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
