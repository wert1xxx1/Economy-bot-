import { EmbedBuilder } from "discord.js";

const simpleEmbeds = (type: "info" | "warn" | "error", name: string, message: string): EmbedBuilder => {
    const embed = new EmbedBuilder();
    const color = type == "info" ? "#0090ff" : type == "warn" ? "#feff00" : "#ff0000";

    return embed.setColor(color).setTitle(`**[${type.charAt(0).toUpperCase() + type.slice(1)}] - ${name}**`).setDescription(`**${message}**`).setTimestamp();
};

export default simpleEmbeds;