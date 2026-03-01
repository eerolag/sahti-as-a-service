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
}

export interface CreateGameRequest {
  name: string;
  beers: Array<{
    name: string;
    image_url: string | null;
  }>;
}

export interface CreateGameResponse {
  ok: true;
  gameId: number;
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
  beers: ResultBeerDto[];
}

export interface ImageSearchResultDto {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  sourceUrl: string | null;
  sourceDomain: string;
}

export interface ImageSearchResponse {
  ok: true;
  provider: "brave";
  results: ImageSearchResultDto[];
}
