"""Values must match the existing PostgreSQL enum definitions."""

from enum import Enum


class JourneyStatus(str, Enum):
    PLANNING = "Planning"
    TRAVELING = "Traveling"
    COMPLETED = "Completed"


class StopKind(str, Enum):
    HOTEL = "Hotel"
    RESTAURANT = "Restaurant"
    ACTIVITY = "Activity"


class BookingStatus(str, Enum):
    NOT_BOOKED = "Not booked"
    BOOKED = "Booked"
    NOT_REQUIRED = "No booking needed"
    CANCELLED = "Cancelled"
