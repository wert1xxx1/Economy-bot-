import SlotItem from "../../Bot/Interface/SlotItem";
import CasinoPoint from "../../Bot/Interface/CasinoPoint";

type CardColor = "heart" | "diamond" | "club" | "spade";

interface CardType {
    type: CardColor,
    points: number
    emoji: string
}

interface CasinoSchema {
    cards: {
        hearts: Array<CardType>,
        diamonds: Array<CardType>,
        clubs: Array<CardType>,
        spades: Array<CardType>,
        hidden: string
    },
    blackjack: {
        opened: boolean,
        min_bet: number,
        max_value: number,
        ace_win: number,
        surrend_percent: number,
        win: number,
        ace_points: number,
        min_ace_points: number,
        min_ace_after: number,
        disable_double_after: number,
        disable_surrend_after: number,
        player: {
            max_splits: number,
            always_surrend: boolean,
            surrender_sum: number
        },
        dealer: {
            stand: number
        }
    },
    slots: {
        min_bet: number,
        max_spins: number,
        delay_spins: number,
        wait_after_spins: number,
        double_match_multiplier: number,
        triple_match_multiplier: number,
        items: Array<SlotItem>
    },
    casino: {
        min_bet: number,
        points: Array<CasinoPoint>
    },
    coinflip: {
        min_bet: number
    },
    roulette: {
        single: {
            multiplier: number
        },
        dozens: {
            multiplier: number
        },
        halves: {
            multiplier: number
        },
        oddoreven: {
            multiplier: number
        },
        colours: {
            multiplier: number
        },
        min_bet: number
    }
}

export { CardColor, CardType, CasinoSchema };