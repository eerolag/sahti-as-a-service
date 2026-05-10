import type { ResultBeerDto } from "@breview/shared/api-contracts";
import type { RatingConfig } from "@breview/shared";
import { BeerCard } from "./BeerCard";

interface ResultListProps {
  beers: ResultBeerDto[];
  ratingConfig?: RatingConfig;
}

export function ResultList({ beers, ratingConfig }: ResultListProps) {
  if (!beers.length) {
    return <div className="card text-center text-muted">Ei tuloksia vielä</div>;
  }

  return (
    <div className="beer-list">
      {beers.map((beer) => (
        <BeerCard key={beer.id} beer={beer} mode="results" ratingConfig={ratingConfig} />
      ))}
    </div>
  );
}
