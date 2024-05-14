import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import getPicture from "../../Utils/GetCasePicture/GetCasePicture";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import randomizer from "../../Utils/Randomizer/Randomizer";

const commandName = "Case";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Магазин кейсов.")
            .addSubcommand((subcommand) =>
                subcommand.setName("show")
                    .setDescription("Посмотреть цену одного кейса."))
            .addSubcommand((subcommand) =>
                subcommand.setName("buy")
                    .setDescription("Купить кейс(ы).")
                    .addIntegerOption((options) =>
                        options.setName("number")
                            .setDescription("Количество кейсов, которых вы хотите купить.")
                            .setMinValue(1)
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("open")
                    .setDescription("Открыть кейс.")
                    .addIntegerOption((options) =>
                        options.setName("number")
                            .setDescription("Количество кейсов, которые вы хотите открыть.")
                            .setMinValue(1)
                            .setMaxValue(100)
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const usersCollection = database.collection("Users");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;
            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            const embed = new EmbedBuilder();

            embed.setTitle("CASE")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            switch (interaction.options.getSubcommand())
            {
                case 'show':
                    embed
                        .setDescription(`**Цена за один кейс: __\`${getSettings.economy.case.price} 💵\`__**`);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'buy':
                    const caseBuyNumber = interaction.options.getInteger("number");
                    const allCasePrice = caseBuyNumber * getSettings.economy.case.price;

                    if (findUser.balance < allCasePrice) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `У вас не хватает денег для покупки ${caseBuyNumber} кейс(-ов).`)], ephemeral: true }).catch((_) => { });

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance - allCasePrice, cases: findUser.cases + caseBuyNumber } });

                    embed.setDescription(`**Куплено: __\`${caseBuyNumber} кейс(-ов)\`__\r\n\r\nОплачено: __\`${allCasePrice} 💵\`__**`);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'open':
                    const caseNumber = interaction.options.getInteger("number");

                    if (findUser.cases < caseNumber) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `У вас не хватает кейсов для открытия.`)], ephemeral: true }).catch((_) => { });

                    let sumFromCases = 0;

                    for (let i = 0; i < caseNumber; i++)
                        sumFromCases += randomizer(getSettings.economy.case.min, getSettings.economy.case.max);

                    const randomNumber = Number((Math.random() * (getSettings.economy.case.max_compensation - getSettings.economy.case.min_compensation) + getSettings.economy.case.max_compensation).toPrecision(3));

                    if (caseNumber > 1) sumFromCases = Math.round(sumFromCases * randomNumber);

                    const getCasePicture = (getPicture(Math.round(caseNumber == 1 ? (sumFromCases / getSettings.economy.case.max) * 100 : ((sumFromCases / caseNumber) / sumFromCases) * 100)));

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance + sumFromCases, cases: findUser.cases - caseNumber } });

                    embed.setDescription(`**Открыто: __\`${caseNumber} кейс(-ов)\`__\r\n\r\nВыпало: __\`${sumFromCases} 💵\`__**`)
                        .setThumbnail(getCasePicture);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });
            }
        }
    }
}