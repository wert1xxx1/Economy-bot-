import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import randomizer from "../../Utils/Randomizer/Randomizer";

const commandName = "Bonus";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Получить бонусные деньги."),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const usersCollection = database.collection("Users");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;

            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            if ((findUser.cooldown.bonus * 1000) > Date.now()) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Вы уже забирали бонус.\r\nСледующая возможность: <t:${findUser.cooldown.bonus}:f>`)], ephemeral: true }).catch((_) => { });;

            const embed = new EmbedBuilder();

            embed.setTitle("**BONUS**")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const bonusMoney = randomizer(getSettings.economy.bonus.min, getSettings.economy.bonus.max);
            const cooldown = Math.ceil((Date.now() + getSettings.economy.bonus.cooldown) / 1000);

            await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance + bonusMoney, "cooldown.bonus": cooldown } });

            embed
                .setDescription(`**Вы получили: __\`${bonusMoney} 💵\`__\r\n\r\nСледующая возможность: <t:${cooldown}:f>⏳**`)
                .setThumbnail("https://c.clc2l.com/t/l/u/lucky-money-bien-jouez-et-bien-profitez-qe45qu.png");

            interaction.reply({ embeds: [embed] }).catch((_) => { });
        }
    }
}