import { CardType } from "../../../Types/MongoDB/Interface/CasinoSchema";

import BlackjackPlayerHands from "../../../Types/Bot/Interface/BlackjackPlayer";

const addPlayerCards = (player: BlackjackPlayerHands, cards: Array<CardType>) => {
    const getCard = cards.shift();

    player.hand.push(getCard);
    return;
}

export default addPlayerCards;