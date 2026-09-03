import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { seedTrips, Trip } from "@/constants/trips";
type State = {
  journeys: import("@/domain/journeys").Journey[];
  liked: string[];
  saved: string[];
  following: string[];
  posts: Trip[];
  comments: Record<string, string[]>;
  replies: string[];
  profile: { name: string; bio: string };
  draft: { caption: string; location: string; category: string };
};
const initial: State = {
  journeys: [],
  liked: [],
  saved: [],
  following: ["theo_wander"],
  posts: [],
  comments: {},
  replies: [],
  profile: {
    name: "Aria Thorne",
    bio: "Slow traveler & editorial photographer. Crafting stories with golden light, earthy shadows, and winding dusty trails.",
  },
  draft: { caption: "", location: "", category: "Hidden Gems" },
};
const Context = createContext<{
  state: State;
  ready: boolean;
  error: string;
  trips: Trip[];
  update: (fn: (s: State) => State) => void;
} | null>(null);
export function TravelProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("wetravel-demo-v1")
      .then((raw) => {
        if (!mounted || !raw) return;
        const saved = JSON.parse(raw);
        if (
          Array.isArray(saved.posts) &&
          Array.isArray(saved.saved) &&
          Array.isArray(saved.liked)
        )
          setState({
            ...initial,
            ...saved,
            journeys: Array.isArray(saved.journeys) ? saved.journeys : [],
          });
      })
      .catch(() => {
        if (mounted) setError("Your saved data could not be loaded.");
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    queue.current = queue.current
      .then(() =>
        AsyncStorage.setItem("wetravel-demo-v1", JSON.stringify(state)),
      )
      .catch(() => {
        setError(
          "Changes are available in this session but could not be saved on this device.",
        );
      });
  }, [state, ready]);
  return (
    <Context.Provider
      value={{
        state,
        ready,
        error,
        trips: [...state.posts, ...seedTrips],
        update: setState,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTravel() {
  const value = useContext(Context);
  if (!value) throw new Error("TravelProvider is required");
  return value;
}
export const toggle = (items: string[], id: string) =>
  items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
