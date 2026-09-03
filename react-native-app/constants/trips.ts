import { assets } from "./figma-assets";
export type AssetName = keyof typeof assets;
export type Trip = {
  durationDays?: number;
  planStops?: import("../domain/journeys").PublicStop[];
  source?: { id: string; author: string; title: string };
  id: string;
  author: string;
  avatar: AssetName;
  location: string;
  country: string;
  title: string;
  caption: string;
  photo: AssetName;
  photoUri?: string;
  category: string;
  likes: number;
  itinerary: string[];
  mine?: boolean;
};
export const seedTrips: Trip[] = [
  {
    id: "amalfi",
    author: "elena.wild",
    avatar: "imgEllipse5",
    location: "Amalfi Coast, Italy",
    country: "Italy",
    title: "A week along the Amalfi Coast",
    caption:
      "Waking up to these cliffside pastel houses. Amalfi has a way of stealing your breath before the coffee even kicks in...",
    photo: "imgPostImage",
    category: "Beaches",
    likes: 1420,
    itinerary: [
      "Arrive in Amalfi and explore the old town",
      "Walk the coastal paths around Positano",
      "Spend a slow afternoon in Ravello",
    ],
  },
  {
    id: "marrakesh",
    author: "marcus_travels",
    avatar: "imgEllipse6",
    location: "Marrakesh, Morocco",
    country: "Morocco",
    title: "A quiet riad in Marrakesh",
    caption: "A quiet courtyard, warm terracotta, and a city full of stories.",
    photo: "imgPostImage1",
    category: "Cities",
    likes: 983,
    itinerary: [
      "Settle into a riad in the medina",
      "Explore the souks and local gardens",
      "Discover the city over a rooftop dinner",
    ],
  },
  {
    id: "swiss",
    author: "theo_wander",
    avatar: "imgEllipse7",
    location: "Lauterbrunnen, Switzerland",
    country: "Switzerland",
    title: "Mornings in the Swiss Alps",
    caption:
      "Woke up at 5 AM to catch the valley mist dancing with the sunrise. Lauterbrunnen never feels real, but mornings like this are truly otherworldly.",
    photo: "imgMainPhoto",
    category: "Mountains",
    likes: 824,
    itinerary: [
      "Sunrise in Lauterbrunnen Valley",
      "Walk to Staubbach Falls",
      "Explore the mountain village of Wengen",
    ],
  },
  {
    id: "bali",
    author: "aria_thorne",
    avatar: "imgEllipse9",
    location: "Nusa Penida, Bali",
    country: "Indonesia",
    title: "Nusa Penida, Bali",
    caption: "Cliffside paths and turquoise water. A little island adventure.",
    photo: "imgRectangle",
    category: "Beaches",
    likes: 1200,
    itinerary: [
      "Arrive on Nusa Penida",
      "Discover the coastal viewpoints",
      "Relax by the sea",
    ],
  },
  {
    id: "bora",
    author: "sara_explorer",
    avatar: "imgEllipse3",
    location: "Bora Bora",
    country: "French Polynesia",
    title: "Bora Bora",
    caption: "Days measured in ocean swims and sunsets.",
    photo: "imgRectangle1",
    category: "Beaches",
    likes: 672,
    itinerary: [
      "Arrive and settle in",
      "Explore the lagoon",
      "Watch the sunset",
    ],
  },
  {
    id: "santorini",
    author: "elena.wild",
    avatar: "imgEllipse5",
    location: "Oia, Santorini",
    country: "Greece",
    title: "Oia, Santorini",
    caption: "Following the whitewashed lanes all the way to the sea.",
    photo: "imgRectangle2",
    category: "Cities",
    likes: 731,
    itinerary: [
      "Explore Oia",
      "Walk the caldera trail",
      "Enjoy a quiet sunset",
    ],
  },
  {
    id: "maldives",
    author: "marcus_travels",
    avatar: "imgEllipse6",
    location: "Male, Maldives",
    country: "Maldives",
    title: "Male, Maldives",
    caption: "An escape to the islands.",
    photo: "imgRectangle3",
    category: "Beaches",
    likes: 942,
    itinerary: [
      "Arrive in Male",
      "Take an island transfer",
      "Explore the reef",
    ],
  },
  {
    id: "temple",
    author: "aria_thorne",
    avatar: "imgEllipse9",
    location: "Bali, Indonesia",
    country: "Indonesia",
    title: "The Lost Passage Temple",
    caption: "Following a green trail to a quiet temple.",
    photo: "imgRectangle16",
    category: "Hidden Gems",
    likes: 214,
    itinerary: ["Explore the forest trail", "Visit the temple courtyard"],
  },
];
export const tripSource = (trip: Trip) =>
  trip.photoUri
    ? { uri: trip.photoUri }
    : trip.planStops
      ? {
          uri:
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="440" viewBox="0 0 600 440"><rect width="600" height="440" fill="#faf0ec"/><circle cx="300" cy="180" r="65" fill="none" stroke="#e2843b" stroke-width="3"/><path d="M275 205l15-40 35-10-15 40z" fill="#e2843b"/><text x="300" y="295" text-anchor="middle" font-family="serif" font-size="34" fill="#2a2421">A journey to remember</text><text x="300" y="330" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#7a6f6a">WeTravel itinerary</text></svg>',
            ),
        }
      : assets[trip.photo];
export const storyPeople = [
  ["My Story", "imgEllipse"],
  ["elena.wild", "imgEllipse1"],
  ["marcus_travels", "imgEllipse2"],
  ["sara_explorer", "imgEllipse3"],
  ["theo_wander", "imgEllipse4"],
] as const;
