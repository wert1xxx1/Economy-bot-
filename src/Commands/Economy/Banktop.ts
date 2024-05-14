import { Db } from "mongodb";
import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

const commandName = "Banktop";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Узнать топ 10 по балансу в банке."),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");

            const embed = new EmbedBuilder();

            embed.setTitle("**BANK TOP**")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const users = await usersCollection.find({ bank_balance: { $gt: -1 } }).sort({ bank_balance: -1 }).limit(10).toArray() as any as Array<Users>;
            const parsedUsers: Array<string> = [];
            const emojis = ["👑", "🔥", "😎", "🌟", "💎", "⚡", "🤟", "💥", "✨", "🍀"];

            for (let i = 0; i < 10; i++)
                parsedUsers.push(`${emojis[i]} ${!users[i] ? "N/A" : `<@${users[i].id}>`} ${emojis[i]}\r\n\r\nБаланс: __\`${users[i]?.bank_balance ?? "N/A"} 💵\`__`);

            embed.setDescription(`**${parsedUsers.join('\r\n\r\n')}**`)
                .setImage("https://media.tenor.com/dQPyPkRVHcAAAAAM/ray-bans-glasses.gif");

            interaction.reply({ embeds: [embed] }).catch((_) => { });
        }
    }
}