import React, { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
  StyleProp,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TextInputProps,
} from "react-native";
import { Image, ImageSource, ImageStyle } from "expo-image";
import { router, Href } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { assets } from "@/constants/figma-assets";
import { colors as c, fonts as f } from "@/constants/theme";

export function Type({
  style,
  tone = "ink",
  size = 14,
  weight = "regular",
  ...props
}: TextProps & {
  tone?: keyof typeof c;
  size?: number;
  weight?: keyof typeof f;
}) {
  return (
    <Text
      {...props}
      style={[
        {
          color: c[tone],
          fontSize: size,
          fontFamily: f[weight],
          lineHeight: size * 1.4,
        },
        style,
      ]}
    />
  );
}
export function Photo({
  source,
  style,
  label,
}: {
  source: ImageSource | number;
  style?: StyleProp<ImageStyle>;
  label?: string;
}) {
  return (
    <Image
      source={source}
      contentFit="cover"
      accessibilityLabel={label}
      style={style}
    />
  );
}
export function Icon({
  name,
  size = 22,
  tint,
}: {
  name: keyof typeof assets;
  size?: number;
  tint?: string;
}) {
  return (
    <Image
      source={assets[name]}
      contentFit="contain"
      tintColor={tint}
      style={{ width: size, height: size }}
    />
  );
}
export function IconButton({
  name,
  label,
  onPress,
  tint,
}: {
  name: keyof typeof assets;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} tint={tint} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  secondary,
  disabled,
  small,
}: PropsWithChildren<{
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: secondary ? c.background : c.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.border,
        borderRadius: small ? 100 : 12,
        paddingVertical: small ? 8 : 12,
        paddingHorizontal: small ? 12 : 18,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Type
        weight="semibold"
        size={small ? 12 : 13}
        style={{ color: secondary ? c.ink : "white" }}
      >
        {children}
      </Type>
    </Pressable>
  );
}
export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={c.subtle}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}
export const Row = ({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View className="flex-row items-center" style={[{ gap: 10 }, style]}>
    {children}
  </View>
);
export const Card = ({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) => (
  <View style={[styles.card, style]}>{children}</View>
);
export function Header({
  title,
  left,
  right,
  serif = true,
}: {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  serif?: boolean;
}) {
  return (
    <Row style={styles.header}>
      {left}
      <Type
        weight={serif ? "serif" : "semibold"}
        size={serif ? 30 : 16}
        style={{ flex: 1 }}
      >
        {title}
      </Type>
      {right}
    </Row>
  );
}
export type Tab = "Home" | "Explore" | "Create" | "Inbox" | "Profile";
const tabs: { name: Tab; href: Href; icon: keyof typeof assets }[] = [
  { name: "Home", href: "/", icon: "imgHome1" },
  { name: "Explore", href: "/explore", icon: "imgCompass" },
  { name: "Create", href: "/plans", icon: "imgPlusSquare" },
  { name: "Inbox", href: "/inbox", icon: "imgBell" },
  { name: "Profile", href: "/profile", icon: "imgUser" },
];
export function BottomNav({ active }: { active: Tab }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: c.paper,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <Row style={{ justifyContent: "space-around", paddingTop: 5, gap: 0 }}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.name}
            onPress={() => router.navigate(tab.href)}
            accessibilityRole="tab"
            accessibilityLabel={tab.name}
            accessibilityState={{ selected: tab.name === active }}
            style={{
              flex: 1,
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Icon
              name={tab.icon}
              tint={tab.name === active ? c.accent : c.muted}
            />
            <Type
              size={10}
              weight={tab.name === active ? "semibold" : "regular"}
              tone={tab.name === active ? "accent" : "muted"}
            >
              {tab.name}
            </Type>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}
export function Screen({
  children,
  active,
  scroll = true,
  header,
}: PropsWithChildren<{
  active: Tab;
  scroll?: boolean;
  header?: React.ReactNode;
}>) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.shell}
      >
        {header}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1">{children}</View>
        )}
        <BottomNav active={active} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Back() {
  return (
    <IconButton
      name="imgArrowLeft"
      label="Go back"
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  shell: {
    flex: 1,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: c.background,
  },
  header: {
    backgroundColor: c.paper,
    paddingHorizontal: 20,
    minHeight: 64,
    borderBottomColor: c.border,
    borderBottomWidth: 1,
  },
  card: {
    backgroundColor: c.paper,
    padding: 12,
    borderRadius: 24,
    gap: 12,
    boxShadow: "0 8px 16px rgba(42,36,33,0.04)",
  },
  input: {
    backgroundColor: c.paper,
    color: c.ink,
    fontFamily: f.regular,
    fontSize: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 48,
  },
});
