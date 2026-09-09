import "@/global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { AuthScreen } from "@/components/auth-screen";
import { tokenCache } from "@clerk/expo/token-cache";
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

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthenticatedApp() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  if (!isSignedIn || !userId) return <AuthScreen />;
  return (
    <TravelProvider key={userId} accountId={userId}>
      <Routes />
    </TravelProvider>
  );
}

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
  if (!clerkPublishableKey) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 32,
            backgroundColor: colors.background,
          }}
        >
          <Type accessibilityRole="alert">
            Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local, then restart
            Expo to connect WeTravel to Clerk.
          </Type>
        </View>
      </SafeAreaProvider>
    );
  }
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <AuthenticatedApp />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
