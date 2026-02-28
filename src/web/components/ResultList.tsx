import type { ResultBeerDto } from "../../shared/api-contracts";
import { BeerCard } from "./BeerCard";

interface ResultListProps {
  beers: ResultBeerDto[];
}

export function ResultList({ beers }: ResultListProps) {
  if (!beers.length) {
    return <div className="card text-center text-muted">Ei tuloksia vielä</div>;
  }

  return (
    <div className="beer-list">
      {beers.map((beer) => (
        <BeerCard key={beer.id} beer={beer} mode="results" />
      ))}
    </div>
  );
}
