export const TRAIN_CONFIG = {
  TOTAL_COACHES: 18,
  SEATS_PER_COACH: 72,
  TOTAL_SEATS: 1296,
  RESERVED_SEATS: [3, 35, 70],
  MAX_GROUP_SIZE: 8,
};

export const BERTH_TYPES = {
  LB: "Lower Berth",
  MB: "Middle Berth",
  UB: "Upper Berth",
  SL: "Side Lower",
  SU: "Side Upper",
} as const;

export type BerthType = keyof typeof BERTH_TYPES;

export const SEAT_COLORS = {
  AVAILABLE: "bg-green-500",
  BOOKED: "bg-red-500",
  RESERVED: "bg-gray-400",
};

export const getBerthType = (seatNumber: number): BerthType => {
  const mod8 = seatNumber % 8;
  switch (mod8) {
    case 1:
    case 4:
      return "LB";
    case 2:
    case 5:
      return "MB";
    case 3:
    case 6:
      return "UB";
    case 7:
      return "SL";
    case 0:
      return "SU";
    default:
      return "MB"; // Should never hit
  }
};
