import GiveawaySchema from "../../Types/MongoDB/Interface/GiveawaySchema";

const createGiveawaySchema = (guildId: string, channelId: string, messageId: string, winnersCount: number, time: string | null, prize: string) => {
    let giveawaysSchema: GiveawaySchema = { guildId, channelId, messageId, winnersCount, time, prize };
    return giveawaysSchema;
}

export default createGiveawaySchema;