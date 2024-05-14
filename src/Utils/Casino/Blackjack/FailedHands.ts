import { CasinoSchema } from "../../../Types/MongoDB/Interface/CasinoSchema";

import BlackjackPlayerHands from "../../../Types/Bot/Interface/BlackjackPlayer";

import getCardPoints from "./GetCardPoints";

const failedHands = (hands: Array<BlackjackPlayerHands>, dealerPoints: number = 0, settings: CasinoSchema): number => {
    let loosed: number = 0;

    hands.forEach((h) => {
        const sumOfPoints = getCardPoints(h.hand, settings);

        if ((sumOfPoints < dealerPoints || sumOfPoints > settings.blackjack.max_value) && dealerPoints <= settings.blackjack.max_value) loosed++;
    });

    return loosed;
}

export default failedHands;