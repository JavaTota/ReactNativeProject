import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Back,
  Button,
  Card,
  Header,
  Input,
  Photo,
  Row,
  Screen,
  Type,
} from "@/components/ui";
import { Calendar } from "@/components/calendar";
import { useTravel } from "@/context/travel-store";
import {
  addDays,
  bookingProgress,
  dateNumber,
  dayCount,
  emptyStop,
  Journey,
  publishJourney,
  Stop,
  validateJourney,
} from "@/domain/journeys";

export default function JourneyPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, update, ready, error: storageError } = useTravel();
  const journey = state.journeys.find((j) => j.id === id);
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState<Stop>();
  const [details, setDetails] = useState<Journey>();
  const [error, setError] = useState("");
  const [needsBooking, setNeedsBooking] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  function save(next: Journey) {
    validateJourney(next);
    update((s) => ({
      ...s,
      journeys: s.journeys.map((j) => (j.id === next.id ? next : j)),
    }));
    setError("");
  }
  function attempt(action: () => void) {
    try {
      action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function patch(changes: Partial<Stop>) {
    setEditing((s) => (s ? { ...s, ...changes } : s));
  }
  async function photo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 600_000)
        throw new Error(
          "Choose a smaller photo (under roughly 450 KB) for this local prototype.",
        );
      patch({
        photoUri: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!journey)
    return (
      <Screen
        active="Create"
        header={<Header title="Journey" left={<Back />} />}
      >
        <Type style={{ padding: 20 }}>
          {ready ? "Journey not found." : "Loading…"}
        </Type>
      </Screen>
    );
  const count = dayCount(journey.startDate, journey.endDate);
  const progress = bookingProgress(journey.stops);
  const visible = journey.stops.filter((s) =>
    needsBooking
      ? s.booking === "Not booked" || s.booking === "Cancelled"
      : s.day === day ||
        (s.kind === "Hotel" && s.day <= day && s.endDay! >= day),
  );
  return (
    <Screen
      active="Create"
      header={<Header title="Journey planner" left={<Back />} />}
    >
      <View style={{ padding: 20, gap: 16 }}>
        <Type weight="serif" size={34}>
          {journey.title}
        </Type>
        <Type tone="muted">
          {journey.destination} · {count} days
        </Type>
        <Type>
          {journey.startDate} — {journey.endDate}
        </Type>
        {journey.source ? (
          <Type tone="muted">
            Inspired by {journey.source.author} · {journey.source.title}
          </Type>
        ) : null}
        {storageError || error ? (
          <Type accessibilityRole="alert" tone="accent">
            {error || storageError}
          </Type>
        ) : null}
        {editing ? (
          <Card>
            <Type weight="serif" size={26}>
              {journey.stops.some((s) => s.id === editing.id)
                ? "Edit stop"
                : "Add a stop"}
            </Type>
            <Row style={{ flexWrap: "wrap" }}>
              {(["Hotel", "Restaurant", "Activity"] as const).map((kind) => (
                <Button
                  key={kind}
                  small
                  secondary={editing.kind !== kind}
                  onPress={() =>
                    patch({
                      kind,
                      endDay:
                        kind === "Hotel"
                          ? Math.min(editing.day + 1, count - 1)
                          : undefined,
                    })
                  }
                >
                  {kind}
                </Button>
              ))}
            </Row>
            <Input
              accessibilityLabel="Place name"
              placeholder="Place name"
              value={editing.name}
              onChangeText={(name) => patch({ name })}
              maxLength={200}
            />
            <Calendar
              label={editing.kind === "Hotel" ? "Check-in" : "Visit date"}
              value={addDays(journey.startDate, editing.day)}
              onChange={(date) =>
                patch({
                  day:
                    (dateNumber(date) - dateNumber(journey.startDate)) /
                    86400000,
                })
              }
            />
            {editing.kind === "Hotel" ? (
              <Calendar
                label="Check-out"
                value={addDays(
                  journey.startDate,
                  editing.endDay ?? editing.day + 1,
                )}
                onChange={(date) =>
                  patch({
                    endDay:
                      (dateNumber(date) - dateNumber(journey.startDate)) /
                      86400000,
                  })
                }
              />
            ) : null}
            <Type weight="semibold">Booking status</Type>
            <Row style={{ flexWrap: "wrap" }}>
              {(
                [
                  "Not booked",
                  "Booked",
                  "No booking needed",
                  "Cancelled",
                ] as const
              ).map((booking) => (
                <Button
                  small
                  key={booking}
                  secondary={editing.booking !== booking}
                  onPress={() => patch({ booking })}
                >
                  {booking}
                </Button>
              ))}
            </Row>
            <Type tone="muted" size={12}>
              Reservation details stay out of shared posts.
            </Type>
            <Input
              accessibilityLabel="Confirmation number"
              placeholder="Confirmation number (optional)"
              value={editing.confirmation}
              onChangeText={(confirmation) => patch({ confirmation })}
            />
            <Input
              accessibilityLabel="Booking link"
              placeholder="https://booking-link (optional)"
              autoCapitalize="none"
              value={editing.bookingLink}
              onChangeText={(bookingLink) => patch({ bookingLink })}
            />
            <Row>
              <Input
                accessibilityLabel="Cost"
                placeholder="Cost"
                keyboardType="decimal-pad"
                value={editing.cost}
                onChangeText={(cost) => patch({ cost })}
                style={{ flex: 1 }}
              />
              <Input
                accessibilityLabel="Currency"
                placeholder="USD"
                value={editing.currency}
                onChangeText={(currency) =>
                  patch({ currency: currency.toUpperCase() })
                }
                maxLength={3}
                style={{ width: 90 }}
              />
            </Row>
            <Calendar
              label="Cancellation deadline (optional)"
              value={editing.cancellationDate}
              onChange={(cancellationDate) => patch({ cancellationDate })}
            />
            {editing.cancellationDate ? (
              <Button
                secondary
                small
                onPress={() => patch({ cancellationDate: "" })}
              >
                Clear deadline
              </Button>
            ) : null}
            <Row>
              <Type style={{ flex: 1 }}>I visited this place</Type>
              <Switch
                accessibilityLabel="Visited this place"
                value={editing.visited}
                onValueChange={(visited) => patch({ visited })}
              />
            </Row>
            {editing.visited ? (
              <>
                <Type weight="serif" size={24}>
                  Your travel journal
                </Type>
                <Row style={{ flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      small
                      key={rating}
                      secondary={editing.rating !== rating}
                      onPress={() =>
                        patch({
                          rating: editing.rating === rating ? 0 : rating,
                        })
                      }
                    >
                      {rating} ★
                    </Button>
                  ))}
                </Row>
                <Input
                  accessibilityLabel="Review"
                  placeholder="What made this place memorable?"
                  multiline
                  value={editing.review}
                  onChangeText={(review) => patch({ review })}
                  maxLength={2000}
                />
                {editing.photoUri ? (
                  <>
                    <Photo
                      source={{ uri: editing.photoUri }}
                      style={{ height: 200, borderRadius: 16 }}
                    />
                    <Button
                      secondary
                      onPress={() => patch({ photoUri: undefined })}
                    >
                      Remove photo
                    </Button>
                  </>
                ) : null}
                <Button secondary onPress={photo}>
                  Choose a journal photo
                </Button>
              </>
            ) : null}
            <Button
              onPress={() =>
                attempt(() => {
                  save({
                    ...journey,
                    stops: [
                      ...journey.stops.filter((s) => s.id !== editing.id),
                      { ...editing, name: editing.name.trim() },
                    ].sort((a, b) => a.day - b.day),
                  });
                  setEditing(undefined);
                })
              }
            >
              Save stop
            </Button>
            <Button
              secondary
              onPress={() => {
                setEditing(undefined);
                setError("");
                setConfirmDelete(false);
              }}
            >
              Cancel
            </Button>
            {journey.stops.some((s) => s.id === editing.id) ? (
              <Button
                secondary
                onPress={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  attempt(() => {
                    save({
                      ...journey,
                      stops: journey.stops.filter((s) => s.id !== editing.id),
                    });
                    setEditing(undefined);
                    setConfirmDelete(false);
                  });
                }}
              >
                {confirmDelete
                  ? "Confirm removal of stop and journal"
                  : "Remove stop"}
              </Button>
            ) : null}
          </Card>
        ) : details ? (
          <Card>
            <Input
              accessibilityLabel="Journey name"
              value={details.title}
              onChangeText={(title) => setDetails({ ...details, title })}
            />
            <Input
              accessibilityLabel="Destination"
              value={details.destination}
              onChangeText={(destination) =>
                setDetails({ ...details, destination })
              }
            />
            <Calendar
              label="Departure"
              value={details.startDate}
              onChange={(startDate) => setDetails({ ...details, startDate })}
            />
            <Calendar
              label="Return"
              value={details.endDate}
              onChange={(endDate) => setDetails({ ...details, endDate })}
            />
            <Type tone="muted">
              Stops keep their day number when dates change.
            </Type>
            <Button
              onPress={() =>
                attempt(() => {
                  save({
                    ...details,
                    title: details.title.trim(),
                    destination: details.destination.trim(),
                  });
                  setDetails(undefined);
                  setDay(0);
                })
              }
            >
              Save dates and details
            </Button>
            <Button
              secondary
              onPress={() => {
                setDetails(undefined);
                setError("");
              }}
            >
              Cancel
            </Button>
          </Card>
        ) : (
          <>
            <Button secondary small onPress={() => setDetails({ ...journey })}>
              Edit dates and details
            </Button>
            <Row style={{ flexWrap: "wrap" }}>
              {(["Planning", "Traveling", "Completed"] as const).map(
                (status) => (
                  <Button
                    small
                    key={status}
                    secondary={journey.status !== status}
                    onPress={() => attempt(() => save({ ...journey, status }))}
                  >
                    {status}
                  </Button>
                ),
              )}
            </Row>
            <Card>
              <Type weight="semibold">
                {progress.booked} of {progress.total} required bookings
                completed
              </Type>
              <Type tone="muted" size={12}>
                Places that need no booking are excluded. Cancelled bookings
                remain outstanding.
              </Type>
              <Button
                secondary
                small
                onPress={() => setNeedsBooking(!needsBooking)}
              >
                {needsBooking ? "Show daily plan" : "Show outstanding bookings"}
              </Button>
            </Card>
            {!needsBooking ? (
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {Array.from({ length: count }, (_, i) => (
                  <Button
                    small
                    key={i}
                    secondary={day !== i}
                    onPress={() => setDay(i)}
                  >
                    Day {i + 1}
                  </Button>
                ))}
              </ScrollView>
            ) : null}
            <Type weight="serif" size={25}>
              {needsBooking
                ? "Still to book"
                : `Day ${day + 1} · ${addDays(journey.startDate, day)}`}
            </Type>
            {!visible.length ? (
              <Type tone="muted">
                {needsBooking
                  ? "Nothing outstanding. You’re all set."
                  : "A blank day, full of possibilities. Add your first stop."}
              </Type>
            ) : null}
            {visible.map((s) => (
              <Card key={s.id}>
                <Type tone="accent" size={12}>
                  {s.kind} · Day {s.day + 1}
                  {s.kind === "Hotel"
                    ? `–${s.endDay! + 1} · ${s.endDay! - s.day} nights${s.endDay === day && !needsBooking ? " · Check-out today" : ""}`
                    : ""}
                </Type>
                <Type weight="semibold" size={18}>
                  {s.name}
                </Type>
                <Type>
                  {s.booking} · {s.visited ? "Visited" : "Planned"}
                </Type>
                {s.cancellationDate ? (
                  <Type tone="muted">
                    Cancellation deadline: {s.cancellationDate}
                  </Type>
                ) : null}
                {s.visited && s.review ? <Type>{s.review}</Type> : null}
                <Button
                  secondary
                  small
                  onPress={() => {
                    setEditing({ ...s });
                    setConfirmDelete(false);
                  }}
                >
                  Edit booking & journal
                </Button>
              </Card>
            ))}
            <Button
              onPress={() => {
                setEditing(emptyStop(day));
                setConfirmDelete(false);
              }}
            >
              Add hotel, restaurant or activity
            </Button>
            {journey.status === "Completed" ? (
              <Card>
                <Type weight="serif" size={25}>
                  Share the journey
                </Type>
                <Type>
                  Only visited places and their journal photos and reviews will
                  appear in the post. Reservation details stay private.
                </Type>
                <Type tone="muted" size={12}>
                  Publishing creates a post on this device for now.
                </Type>
                {confirmPublish ? (
                  <Type>
                    Ready to share{" "}
                    {journey.stops.filter((s) => s.visited).length} visited
                    places across {count} days?
                  </Type>
                ) : null}
                <Button
                  onPress={() =>
                    attempt(() => {
                      const post = publishJourney(journey, state.profile.name);
                      if (!confirmPublish) {
                        setConfirmPublish(true);
                        return;
                      }
                      update((s) => ({
                        ...s,
                        journeys: s.journeys.map((j) =>
                          j.id === id ? { ...j, publishedId: post.id } : j,
                        ),
                        posts: [
                          post,
                          ...s.posts.filter((p) => p.id !== post.id),
                        ],
                      }));
                      router.push({
                        pathname: "/post/[id]",
                        params: { id: post.id },
                      });
                      setConfirmPublish(false);
                    })
                  }
                >
                  {confirmPublish
                    ? "Confirm publication"
                    : journey.publishedId
                      ? "Update published post"
                      : "Review & publish"}
                </Button>
                {confirmPublish ? (
                  <Button secondary onPress={() => setConfirmPublish(false)}>
                    Cancel
                  </Button>
                ) : null}
              </Card>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
