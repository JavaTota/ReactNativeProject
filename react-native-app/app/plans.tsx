import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Header, Input, Screen, Type } from "@/components/ui";
import { Calendar } from "@/components/calendar";
import { useTravel } from "@/context/travel-store";
import {
  bookingProgress,
  copyItinerary,
  today,
  uid,
  validateJourney,
  Journey,
} from "@/domain/journeys";

export default function Plans() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { state, trips, update, ready, error: storageError } = useTravel();
  const original = trips.find((t) => t.id === source);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [error, setError] = useState("");
  function create() {
    try {
      const journey: Journey = original
        ? copyItinerary(original, start)
        : {
            id: uid(),
            title: title.trim(),
            destination: destination.trim(),
            startDate: start,
            endDate: end,
            status: "Planning",
            stops: [],
          };
      validateJourney(journey);
      update((s) => ({ ...s, journeys: [journey, ...s.journeys] }));
      setCreating(false);
      router.replace({ pathname: "/journey/[id]", params: { id: journey.id } });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen active="Create" header={<Header title="Your journeys" />}>
      <View style={{ padding: 20, gap: 18 }}>
        <Type tone="muted">
          Plan the days. Live the moments. Share the journey.
        </Type>
        {storageError ? (
          <Type accessibilityRole="alert">{storageError}</Type>
        ) : null}
        {!ready ? (
          <Type>Loading your journeys…</Type>
        ) : (
          <>
            {source && !original ? (
              <Type>This itinerary is no longer available.</Type>
            ) : null}
            {creating || original ? (
              <Card>
                <Type weight="serif" size={26}>
                  {original ? "Make it your journey" : "A new adventure"}
                </Type>
                {original ? (
                  <Type>
                    Inspired by {original.author}: {original.title}. Your copy
                    will have its own dates, bookings and memories.
                  </Type>
                ) : (
                  <>
                    <Input
                      accessibilityLabel="Journey name"
                      placeholder="Journey name"
                      value={title}
                      onChangeText={setTitle}
                      maxLength={120}
                    />
                    <Input
                      accessibilityLabel="Destination"
                      placeholder="City, country"
                      value={destination}
                      onChangeText={setDestination}
                      maxLength={160}
                    />
                  </>
                )}
                <Calendar label="Departure" value={start} onChange={setStart} />
                {original ? (
                  <Type tone="muted">
                    {original.durationDays ??
                      Math.max(1, original.itinerary.length)}{" "}
                    days; you can edit the dates after copying.
                  </Type>
                ) : (
                  <Calendar label="Return" value={end} onChange={setEnd} />
                )}
                {error ? (
                  <Type accessibilityRole="alert" tone="accent">
                    {error}
                  </Type>
                ) : null}
                <Button onPress={create}>
                  {original ? "Create my copy" : "Create journey"}
                </Button>
                <Button
                  secondary
                  onPress={() => {
                    setCreating(false);
                    setError("");
                    if (source) router.replace("/plans");
                  }}
                >
                  Cancel
                </Button>
              </Card>
            ) : (
              <Button onPress={() => setCreating(true)}>Plan a journey</Button>
            )}
            {!state.journeys.length && !creating && !original ? (
              <Card>
                <Type weight="serif" size={24}>
                  Your next chapter starts here
                </Type>
                <Type tone="muted">
                  Choose dates and add places to stay, eat and explore. Or open
                  a post and tap “Use this itinerary”.
                </Type>
              </Card>
            ) : null}
            {state.journeys.map((j) => {
              const p = bookingProgress(j.stops);
              return (
                <Card key={j.id}>
                  <Type tone="accent" size={12}>
                    {j.status}
                    {j.publishedId ? " · Published locally" : ""}
                  </Type>
                  <Type weight="serif" size={26}>
                    {j.title}
                  </Type>
                  <Type>{j.destination}</Type>
                  <Type tone="muted">
                    {j.startDate} — {j.endDate}
                  </Type>
                  <Type>
                    {p.booked} of {p.total} required bookings completed
                  </Type>
                  <Button
                    secondary
                    onPress={() =>
                      router.push({
                        pathname: "/journey/[id]",
                        params: { id: j.id },
                      })
                    }
                  >
                    Open journey
                  </Button>
                </Card>
              );
            })}
            <Button secondary onPress={() => router.push("/create")}>
              Create a quick travel log
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}
