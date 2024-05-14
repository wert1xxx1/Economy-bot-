import getCardPoints from "./GetCardPoints";

import { CasinoSchema, CardType } from "../../../Types/MongoDB/Interface/CasinoSchema";

const addDealerCards = (dealer: Array<CardType>, cards: Array<CardType>, settings: CasinoSchema): number => {

    let sumOfPoints = getCardPoints(dealer, settings);

    if (sumOfPoints > settings.blackjack.dealer.stand) return sumOfPoints;

    const getCard = cards.shift();
    dealer.push(getCard);

    sumOfPoints += sumOfPoints > settings.blackjack.min_ace_after && getCard.points == settings.blackjack.min_ace_points ? 1 : getCard.points;

    if (sumOfPoints < settings.blackjack.dealer.stand) return addDealerCards(dealer, cards, settings);

    return sumOfPoints;
}

export default addDealerCards;