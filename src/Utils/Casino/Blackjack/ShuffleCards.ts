import { CardType } from "../../../Types/MongoDB/Interface/CasinoSchema";

import shuffleArray from "../../ShuffleArray/ShuffleArray";

const shuffleCards = (cards: Array<CardType>): Array<CardType> => { return shuffleArray([...cards, ...cards, ...cards, ...cards]); }

export default shuffleCards;