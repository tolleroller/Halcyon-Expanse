import raw from "../content/story.json";
import type { HingeBand } from "./grade-hinge";

export type PlateBeat = {
  id?: string;
  plate: string;
  top?: string;
  band?: string;
  cropLetterbox?: boolean;
};

export type OpeningBook = {
  title: string;
  ship?: string;
  player?: string;
  cover: string;
  trailer: string;
  trailerRule?: string;
  beginLabel: string;
  dialogue?: string;
  pages: PlateBeat[];
  hinge: {
    id: string;
    afterPage?: string;
    plate: string;
    placeholder?: string;
    truth?: string;
    strongHints?: string[];
    adequateHints?: string[];
  };
  aftermath: Record<HingeBand, PlateBeat[]>;
  join: PlateBeat[];
};

export const book = raw as OpeningBook;

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const cleaned = path.replace(/^\/+/, "");
  return `${base}${cleaned}`;
}
