import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Header,
  Icon,
  IconButton,
  Photo,
  Row,
  Screen,
  Type,
} from "@/components/ui";
import { assets } from "@/constants/figma-assets";
import { colors as c } from "@/constants/theme";
import { useTravel, toggle } from "@/context/travel-store";
export default function Inbox() {
  const { state, update } = useTravel();
  const [settings, setSettings] = useState(false);
  const notifications = [
    {
      avatar: "imgEllipse11",
      author: "elena.wild",
      text: "liked your travel log from Lauterbrunnen.",
      time: "12 mins ago",
      photo: "imgRectangle17",
    },
    {
      avatar: "imgEllipse12",
      author: "sara_explorer",
      text: "started following your journal.",
      time: "1 hour ago",
      photo: null,
    },
    {
      avatar: "imgEllipse13",
      author: "marcus_travels",
      text: "commented: “Incredible frame! The mist is perfect.”",
      time: "4 hours ago",
      photo: "imgRectangle18",
    },
  ] as const;
  return (
    <Screen
      active="Inbox"
      header={
        <Header
          title="Inbox"
          right={
            <IconButton
              name="imgSettings"
              label="Notification settings"
              onPress={() => setSettings(!settings)}
            />
          }
        />
      }
    >
      <View style={{ padding: 20, gap: 16 }}>
        {settings && (
          <View
            style={{ backgroundColor: c.pale, padding: 16, borderRadius: 16 }}
          >
            <Type weight="semibold">Notification settings</Type>
            <Type tone="muted" size={13}>
              These are sample notifications. Push notifications will be
              available when accounts and the backend are connected.
            </Type>
          </View>
        )}
        {notifications.map((n) => (
          <Row key={n.author} style={{ minHeight: 48, gap: 12 }}>
            <Photo
              source={assets[n.avatar]}
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
            <Pressable
              onPress={() => router.push(n.photo ? "/post/swiss" : "/profile")}
              accessibilityRole="button"
              style={{ flex: 1 }}
            >
              <Type size={13}>
                <Type size={13} weight="semibold">
                  {n.author}{" "}
                </Type>
                {n.text}
              </Type>
              <Type size={11} tone="subtle">
                {n.time}
              </Type>
            </Pressable>
            {n.photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open mentioned trip"
                onPress={() => router.push("/post/swiss")}
              >
                <Photo
                  source={assets[n.photo]}
                  style={{ width: 36, height: 36, borderRadius: 6 }}
                />
              </Pressable>
            ) : (
              <Button
                small
                secondary={state.following.includes(n.author)}
                onPress={() =>
                  update((s) => ({
                    ...s,
                    following: toggle(s.following, n.author),
                  }))
                }
              >
                {state.following.includes(n.author) ? "Following" : "Follow"}
              </Button>
            )}
          </Row>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore Marrakesh journey"
          onPress={() => router.push("/post/marrakesh")}
          style={{
            padding: 16,
            backgroundColor: c.pale,
            borderRadius: 20,
            gap: 12,
          }}
        >
          <Row>
            <Type size={11} tone="accent" weight="bold" style={{ flex: 1 }}>
              WEEKEND ESCAPE
            </Type>
            <Icon name="imgCompass2" size={16} />
          </Row>
          <View>
            <Type weight="serif" size={22}>
              Quiet Riad in Marrakesh
            </Type>
            <Type size={13} tone="muted">
              A courtyard worth slowing down for. Explore a traveler’s Marrakesh
              journey.
            </Type>
          </View>
        </Pressable>
        {state.replies.length > 0 && (
          <View style={{ gap: 8 }}>
            <Type weight="serif" size={24}>
              Your story replies
            </Type>
            {state.replies.map((reply, i) => (
              <Type key={i} size={13}>
                {reply}
              </Type>
            ))}
            <Type size={11} tone="muted">
              Saved on this device; not sent to another user.
            </Type>
          </View>
        )}
      </View>
    </Screen>
  );
}
