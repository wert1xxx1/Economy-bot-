import { CasinoSchema } from "../../../Types/MongoDB/Interface/CasinoSchema";

import BlackjackPlayerHands from "../../../Types/Bot/Interface/BlackjackPlayer";

import getCardPoints from "./GetCardPoints";
import getValueFromPercent from "./GetValueFromPercent";

const addAllSum = (hands: Array<BlackjackPlayerHands>, dealerPoints: number, settings: CasinoSchema): number => {
    const maxValue = settings.blackjack.max_value;

    let sum: number = 0;

    hands.forEach((h) => {
        const sumOfPoints = getCardPoints(h.hand, settings);

        if (h.surrend) { sum += h.bet - getValueFromPercent(h.bet, settings.blackjack.surrend_percent); return; };
        if ((sumOfPoints > maxValue && dealerPoints > maxValue) || sumOfPoints == dealerPoints) { return sum += h.bet; };
        if (dealerPoints > sumOfPoints && dealerPoints <= maxValue) return;

        sum += h.bet + getValueFromPercent(h.bet, sumOfPoints == maxValue ? settings.blackjack.ace_win : settings.blackjack.win);
    })

    return sum;
}

export default addAllSum;