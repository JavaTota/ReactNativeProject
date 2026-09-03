import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from "@expo-google-fonts/instrument-serif";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TravelProvider, useTravel } from "@/context/travel-store";
import { colors } from "@/constants/theme";
import { Type } from "@/components/ui";
function Routes() {
  const { ready, error } = useTravel();
  if (!ready)
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      {error ? (
        <Type
          accessibilityRole="alert"
          style={{ padding: 12, backgroundColor: colors.pale }}
        >
          {error}
        </Type>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="story"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
    </>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <TravelProvider>
        <Routes />
      </TravelProvider>
    </SafeAreaProvider>
  );
}
