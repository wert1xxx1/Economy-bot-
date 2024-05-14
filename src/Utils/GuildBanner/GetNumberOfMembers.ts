import { ChannelType, Collection, GuildBasedChannel } from "discord.js";

const getNumberOfMembers = (channels: Collection<string, GuildBasedChannel>): string => {
    return channels.filter((ch) => ch.type === ChannelType.GuildVoice).reduce((acc, ch) => { acc.push(ch.members); return acc; }, []).reduce((acc, ch) => acc + ch.size, 0).toString() ?? "0";
}

export default getNumberOfMembers;