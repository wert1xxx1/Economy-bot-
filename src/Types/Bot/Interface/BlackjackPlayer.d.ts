import { CardType } from "../../MongoDB/Interface/CasinoSchema";

export default interface BlackjackPlayerHands {
    bet: number,
    surrend: boolean,
    hand: Array<CardType>
}