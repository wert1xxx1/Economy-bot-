import { CasinoSchema } from "../../../Types/MongoDB/Interface/CasinoSchema";

import BlackjackPlayerHands from "../../../Types/Bot/Interface/BlackjackPlayer";

import getCardPoints from "./GetCardPoints";
import getValueFromPercent from "./GetValueFromPercent";

const generateFinalResult = (hands: Array<BlackjackPlayerHands>, dealerPoints: number, settings: CasinoSchema) => {
    let handsInString: string = "";

    hands.forEach((h) => {
        const maxValue = settings.blackjack.max_value;
        const sumOfPoints = getCardPoints(h.hand, settings);

        handsInString += `${h.hand.map(c => `${c.emoji}`).join(" ")}`;

        if (h.surrend) { handsInString += `: \`${sumOfPoints} - Отказ; +${Math.abs(h.bet - getValueFromPercent(h.bet, settings.blackjack.surrend_percent))} 💵\`\r\n`; return; }
        if (sumOfPoints == dealerPoints || (sumOfPoints > maxValue && dealerPoints > maxValue)) { handsInString += `: \`${sumOfPoints} - Ничья; 0 💵\`\r\n`; return; }
        if (sumOfPoints > maxValue) { handsInString += `: \`${sumOfPoints} - Перебор; -${h.bet} 💵\`\r\n`; return; }
        if (dealerPoints > maxValue || sumOfPoints > dealerPoints) { handsInString += `: \`${sumOfPoints} - ${sumOfPoints == maxValue ? "BLACKJACK" : "Победа"}; +${getValueFromPercent(h.bet, sumOfPoints == maxValue ? settings.blackjack.ace_win : settings.blackjack.win)} 💵\`\r\n`; return; }
        if (sumOfPoints < dealerPoints) { handsInString += `: \`${sumOfPoints} - Проигрыш; -${h.bet} 💵\`\r\n`; return; }
    })

    return handsInString;
}

export default generateFinalResult;