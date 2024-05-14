import { CardType } from "../../../Types/MongoDB/Interface/CasinoSchema";

const checkSplit = (cards: Array<CardType>) => {
    if (cards.length == 1 || cards.length > 2) return false;
    return (cards[0].points === cards[1].points);
}

export default checkSplit;