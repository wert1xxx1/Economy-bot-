export default interface GiveawaySchema {
    guildId: string,
    channelId: string,
    messageId: string,
    winnersCount: number,
    time: string | null,
    prize: string
}