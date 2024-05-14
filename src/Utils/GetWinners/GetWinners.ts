import { User } from "discord.js";

import randomizer from "../Randomizer/Randomizer";

import GiveawaySchema from "../../Types/MongoDB/Interface/GiveawaySchema";

const getWinners = (giveaway: GiveawaySchema, members: Array<{ key: any, value: any }>): Array<User> => {
    let winners = [];

    if (members.length <= giveaway.winnersCount)
        return members.map((u) => u.value);

    for (let i = 0; i < giveaway.winnersCount; i++)
    {
        const findWinner: number = randomizer(0, members.length - 1);

        if (!winners.includes(members[findWinner].value.user)) { winners.push(members[findWinner].value.user); continue };

        i--;
        continue;
    }

    return winners;
}

export default getWinners;