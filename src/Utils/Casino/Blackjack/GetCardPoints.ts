import { CasinoSchema, CardType } from "../../../Types/MongoDB/Interface/CasinoSchema";

const getCardPoints = (cards: Array<CardType>, settings: CasinoSchema) => {
    let points = 0;
    let ace = 0;

    cards.forEach((c) => {
        if (c.points == 11)
        {
            ace += 11;
            return;
        }
        points += c.points;
    });

    if (ace > 0) points += points > settings.blackjack.min_ace_after || points + ace > settings.blackjack.max_value ? Math.floor(ace / 10) : ace;

    return points;
}

export default getCardPoints;