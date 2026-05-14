import type { RatingConfig, ResultsVisibility, SessionSettingsInput } from "./session-settings";

export interface ErrorResponse {
  error: string;
}

export interface BeerDto {
  id: number;
  name: string;
  image_url: string | null;
  sort_order: number;
  untappd_url: string | null;
  untappd_source: string | null;
  untappd_confidence: number | null;
  untappd_resolved_at: string | null;
}

export interface GameDto {
  id: number;
  name: string;
  created_at: string;
  publicId: string | null;
  ratingConfig: RatingConfig;
  resultsVisibility: ResultsVisibility;
  resultsRevealedAt: string | null;
}

export interface CreateGameRequest {
  name: string;
  beers: Array<{
    name: string;
    image_url: string | null;
  }>;
  settings?: SessionSettingsInput;
}

export interface CreateGameResponse {
  ok: true;
  gameId: number;
  shareId: string;
  shareUrl: string;
  hostToken: string;
  hostUrl: string;
}

export interface GetGameResponse {
  game: GameDto;
  beers: BeerDto[];
}

export interface UpdateGameRequest {
  name: string;
  beers: Array<{
    id?: number;
    name: string;
    image_url: string | null;
  }>;
  settings?: SessionSettingsInput;
}

export interface UpdateGameResponse {
  ok: true;
  game: GameDto;
  beers: BeerDto[];
}

export interface RatingDto {
  beerId: number;
  score: number;
  comment?: string | null;
}

export interface SaveRatingsRequest {
  clientId: string;
  nickname?: string;
  ratings: RatingDto[];
}

export interface SaveRatingsResponse {
  ok: true;
  saved: number;
}

export interface GetRatingsResponse {
  ok: true;
  ratings: RatingDto[];
}

export interface ResultBeerDto extends BeerDto {
  avg_score: number;
  rating_count: number;
}

export interface GetResultsResponse {
  game: GameDto;
  summary: {
    players: number;
  };
  players: Array<{
    nickname: string | null;
  }>;
  beers: ResultBeerDto[];
}

export interface RevealResultsResponse {
  ok: true;
  game: GameDto;
}

export interface ReportSessionRequest {
  targetType: "session" | "beer" | "comment" | "participant" | "image";
  targetId?: string | number | null;
  reason: string;
  details?: string | null;
  clientId?: string | null;
}

export interface ReportSessionResponse {
  ok: true;
  reportId: number;
}

export interface UploadImageResponse {
  ok: true;
  imageUrl: string;
  key: string;
  contentType: string;
  bytes: number;
}

export interface IdentifyBeerNameResponse {
  ok: true;
  beerName: string;
  model: string;
}

export interface AccountUserDto {
  id: number;
  email: string;
}

export interface AccountHistoryItemDto {
  gameId: number;
  publicId: string | null;
  gameName: string;
  ratingsCount: number;
  updatedAt: string | null;
  isArchived: boolean;
  role: "host" | "player";
}

export interface SetSessionArchivedRequest {
  isArchived: boolean;
}

export interface SetSessionArchivedResponse {
  ok: true;
}

export interface RequestLoginCodeRequest {
  email: string;
}

export interface RequestLoginCodeResponse {
  ok: true;
  email: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface VerifyLoginCodeRequest {
  email: string;
  code: string;
  clientId?: string;
  clientIds?: string[];
  hostTokens?: Array<{ publicId: string; hostToken: string }>;
}

export interface VerifyLoginCodeResponse {
  ok: true;
  sessionToken: string;
  user: AccountUserDto;
  history: AccountHistoryItemDto[];
}

export interface AccountMeResponse {
  ok: true;
  user: AccountUserDto;
  history: AccountHistoryItemDto[];
}

export interface LogoutResponse {
  ok: true;
}

export interface DeleteAccountResponse {
  ok: true;
}
