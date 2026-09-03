import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Button, Row, Type } from "./ui";
import { colors as c } from "@/constants/theme";
import { addDays, today } from "@/domain/journeys";
export function Calendar({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || today()).slice(0, 7));
  const [year, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const shift = (by: number) => {
    const date = new Date(Date.UTC(year, m - 1 + by, 1));
    setMonth(date.toISOString().slice(0, 7));
  };
  return (
    <View style={{ gap: 6 }}>
      <Type size={12} tone="muted">
        {label}
      </Type>
      <Button
        secondary
        onPress={() => {
          setMonth((value || today()).slice(0, 7));
          setOpen(true);
        }}
      >
        {value || "Choose date"}
      </Button>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: c.background,
              borderRadius: 24,
              padding: 16,
              maxWidth: 420,
              width: "100%",
              alignSelf: "center",
              gap: 12,
            }}
          >
            <Type weight="serif" size={26}>
              {label}
            </Type>
            <Type weight="semibold" style={{ textAlign: "center" }}>
              {new Date(`${first}T00:00:00Z`).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </Type>
            <Row style={{ justifyContent: "space-between" }}>
              <Button secondary onPress={() => shift(-1)}>
                Previous
              </Button>
              <Button secondary onPress={() => shift(1)}>
                Next
              </Button>
            </Row>
            <View style={{ flexDirection: "row" }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <Type
                  key={i}
                  style={{ width: "14.2857%", textAlign: "center" }}
                  tone="muted"
                >
                  {d}
                </Type>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {Array.from({ length: offset + count }, (_, i) => {
                const date = addDays(first, i - offset);
                return i < offset ? (
                  <View key={i} style={{ width: "14.2857%" }} />
                ) : (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={date}
                    accessibilityState={{ selected: value === date }}
                    onPress={() => {
                      onChange(date);
                      setOpen(false);
                    }}
                    style={{
                      width: "14.2857%",
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      backgroundColor:
                        value === date ? c.accent : "transparent",
                    }}
                  >
                    <Type style={{ color: value === date ? "white" : c.ink }}>
                      {i - offset + 1}
                    </Type>
                  </Pressable>
                );
              })}
            </View>
            <Button secondary onPress={() => setOpen(false)}>
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
