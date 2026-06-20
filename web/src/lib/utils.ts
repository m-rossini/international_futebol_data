import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (typeof n !== "number" || !isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

export function winRateClass(rate: number): string {
  if (rate >= 60) return "badge-win";
  if (rate >= 45) return "badge-draw";
  return "badge-loss";
}

export function getFlagUrl(country: string, size = 40): string {
  // Map common country names to ISO codes
  const codeMap: Record<string, string> = {
    brazil: "br", argentina: "ar", germany: "de", england: "gb-eng",
    france: "fr", spain: "es", italy: "it", netherlands: "nl",
    uruguay: "uy", mexico: "mx", portugal: "pt", belgium: "be",
    sweden: "se", chile: "cl", paraguay: "py", colombia: "co",
    peru: "pe", bolivia: "bo", ecuador: "ec", venezuela: "ve",
    scotland: "gb-sct", wales: "gb-wls", japan: "jp", "south korea": "kr",
    australia: "au", "united states": "us", canada: "ca", russia: "ru",
    croatia: "hr", "czech republic": "cz", serbia: "rs", switzerland: "ch",
    austria: "at", poland: "pl", turkey: "tr", greece: "gr",
    denmark: "dk", norway: "no", finland: "fi", iceland: "is",
    hungary: "hu", romania: "ro", bulgaria: "bg", ukraine: "ua",
    "south africa": "za", egypt: "eg", nigeria: "ng", ghana: "gh",
    morocco: "ma", tunisia: "tn", algeria: "dz", senegal: "sn",
    cameroon: "cm", "ivory coast": "ci", iran: "ir", "saudi arabia": "sa",
    iraq: "iq", china: "cn", "north korea": "kp", qatar: "qa",
    "united arab emirates": "ae", "costa rica": "cr", honduras: "hn",
    panama: "pa", jamaica: "jm", "trinidad and tobago": "tt",
  };
  const code = codeMap[country.toLowerCase()] || country.toLowerCase().substring(0, 2);
  return `https://flagcdn.com/w${size}/${code}.png`;
}

export function tournamentTooltipMap(): Record<string, string> {
  return {
    "FIFA World Cup": "FIFA World Cup — The premier global football tournament held every 4 years",
    "Friendly": "Friendly — International exhibition match between nations",
    "UEFA European Championship": "UEFA European Championship — Europe's premier national team competition",
    "Copa América": "Copa América — South America's continental championship, the oldest international tournament",
    "AFC Asian Cup": "AFC Asian Cup — Asia's premier national team competition",
    "Africa Cup of Nations": "Africa Cup of Nations — Africa's premier national team competition",
    "WC Qualification": "FIFA World Cup Qualification — Qualifying rounds for the World Cup",
    "Confederations Cup": "FIFA Confederations Cup — Tournament of continental champions (discontinued)",
    "CONCACAF Gold Cup": "CONCACAF Gold Cup — North/Central America & Caribbean championship",
    "OFC Nations Cup": "OFC Nations Cup — Oceania's premier national team competition",
  };
}
