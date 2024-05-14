import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import randomizer from "../../Utils/Randomizer/Randomizer";

const commandName = "Work";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Получить деньги за работу."),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const usersCollection = database.collection("Users");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;
            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            if ((findUser.cooldown.work * 1000) > Date.now()) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Вы уже работали.\r\nСледующая возможность: <t:${findUser.cooldown.work}:f> ⏳`)], ephemeral: true }).catch((_) => { });

            const embed = new EmbedBuilder();

            embed.setTitle("**WORK**")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const workMoney = randomizer(getSettings.economy.work.min, getSettings.economy.work.max);
            const cooldown = Math.ceil((Date.now() + getSettings.economy.work.cooldown) / 1000);

            await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance + workMoney, "cooldown.work": cooldown } });

            embed
                .setDescription(`**Вы заработали: __\`${workMoney} 💵\`__\r\nСледующая возможность: <t:${cooldown}:f>⏳**`)

            interaction.reply({ embeds: [embed] }).catch((_) => { });
        }
    }
}