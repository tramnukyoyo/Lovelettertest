import type { CardType } from '../../types';

// Import card back from assets (keeping the old back)
import backImg from '../../assets/cards/back.png';

export interface CardData {
  id: CardType;         // CardType (1-8)
  name: string;         // "Guard", "Priest", etc.
  value: number;        // Game value (same as id)
  type: string;         // Thematic category
  description: string;  // Effect text
  image: string;        // Path to webp file
  copies: number;       // How many of this card in deck (16 total)
}

/**
 * Card Database - Murder Mystery Theme
 * Noir crime mystery style - English card names and descriptions
 * Images are loaded from public/images/
 */
export const cardDatabase: CardData[] = [
  {
    id: 1,
    name: "Inspector",
    value: 1,
    type: "Law",
    description: "Accuse someone directly - if correct, they're arrested.",
    image: "/primesuspect/images/1.webp",
    copies: 5
  },
  {
    id: 2,
    name: "Butler",
    value: 2,
    type: "Staff",
    description: "You've seen everything - look at another player's card.",
    image: "/primesuspect/images/2.webp",
    copies: 2
  },
  {
    id: 3,
    name: "Witness",
    value: 3,
    type: "Civilian",
    description: "Confrontation: Compare alibis - the weaker one breaks down.",
    image: "/primesuspect/images/3.webp",
    copies: 2
  },
  {
    id: 4,
    name: "Lawyer",
    value: 4,
    type: "Civilian",
    description: "Protection from accusation for one round.",
    image: "/primesuspect/images/4.webp",
    copies: 2
  },
  {
    id: 5,
    name: "Blackmailer",
    value: 5,
    type: "Criminal",
    description: "Force someone to reveal their alibi (discard & draw new).",
    image: "/primesuspect/images/5.webp",
    copies: 2
  },
  {
    id: 6,
    name: "Double Agent",
    value: 6,
    type: "Spy",
    description: "Swap your identity with another guest.",
    image: "/primesuspect/images/6.webp",
    copies: 1
  },
  {
    id: 7,
    name: "Accomplice",
    value: 7,
    type: "Dangerous",
    description: "Knows too much - must reveal when with Blackmailer or Double Agent.",
    image: "/primesuspect/images/7.webp",
    copies: 1
  },
  {
    id: 8,
    name: "The Murderer",
    value: 8,
    type: "Guilty",
    description: "The highest card - but beware if you're exposed!",
    image: "/primesuspect/images/8.webp",
    copies: 1
  }
];

// Card back image (unchanged from original)
export const CARD_BACK_IMAGE = backImg;

/**
 * Get card data by CardType
 */
export function getCardData(cardType: CardType): CardData | null {
  if (cardType === 0) return null; // Card back has no data
  return cardDatabase.find(card => card.id === cardType) || null;
}

/**
 * Get card name by CardType
 */
export function getCardName(cardType: CardType): string {
  if (cardType === 0) return "Card Back";
  const card = getCardData(cardType);
  return card?.name || "Unknown";
}

/**
 * Get card description by CardType
 */
export function getCardDescription(cardType: CardType): string {
  const card = getCardData(cardType);
  return card?.description || "";
}

/**
 * Get card image by CardType
 */
export function getCardImage(cardType: CardType): string {
  if (cardType === 0) return CARD_BACK_IMAGE;
  const card = getCardData(cardType);
  return card?.image || CARD_BACK_IMAGE;
}

/**
 * Legacy compatibility: CARD_NAMES record
 */
export const CARD_NAMES: Record<number, string> = {
  0: "Card Back",
  ...Object.fromEntries(cardDatabase.map(card => [card.id, card.name]))
};

/**
 * Legacy compatibility: CARD_DESCRIPTIONS record
 */
export const CARD_DESCRIPTIONS: Record<number, string> = Object.fromEntries(
  cardDatabase.map(card => [card.id, card.description])
);

/**
 * Legacy compatibility: CARD_IMAGES record
 */
export const CARD_IMAGES: Record<number, string> = {
  0: CARD_BACK_IMAGE,
  ...Object.fromEntries(cardDatabase.map(card => [card.id, card.image]))
};
