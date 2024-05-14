import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import { CasinoSchema } from "../../Types/MongoDB/Interface/CasinoSchema";

import { RouletteColorNames } from "../../Types/Bot/Enums/RouletteEnums";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import checkDozens from "../../Utils/Casino/Roulette/CheckDozens";
import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import checkColor from "../../Utils/Casino/Roulette/CheckColor";
import checkHalf from "../../Utils/Casino/Roulette/CheckHalf";
import randomizer from "../../Utils/Randomizer/Randomizer";

const commandName = "Roulette";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Игровая рулетка.")
            .addSubcommand((subcommand) =>
                subcommand.setName("single")
                    .setDescription("Single number - x36")
                    .addStringOption((options) =>
                        options.setName("bet")
                            .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                            .setRequired(true))
                    .addIntegerOption((options) =>
                        options.setName("number")
                            .setDescription("Число, которое выпадет.")
                            .setMinValue(0)
                            .setMaxValue(36)
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("dozens")
                    .setDescription("Dozens (1-12, 13-24, 25-36) - x3")
                    .addStringOption((options) =>
                        options.setName("bet")
                            .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                            .setRequired(true))
                    .addStringOption((options) =>
                        options.setName("dozen")
                            .setDescription("Диапазон, в котором выпадет число.")
                            .addChoices(
                                {
                                    name: "1-12",
                                    value: "first"
                                },
                                {
                                    name: "13-24",
                                    value: "second"
                                },
                                {
                                    name: "25-36",
                                    value: "third"
                                })
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("halves")
                    .setDescription("Halves (1-18, 19-36) - x2")
                    .addStringOption((options) =>
                        options.setName("bet")
                            .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                            .setRequired(true))
                    .addStringOption((options) =>
                        options.setName("half")
                            .setDescription("Половина, в которой выпадет число.")
                            .addChoices(
                                {
                                    name: "1-18",
                                    value: "first"
                                },
                                {
                                    name: "19-36",
                                    value: "second"
                                }
                            )
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("oddoreven")
                    .setDescription("Odd/Even - 2x")
                    .addStringOption((options) =>
                        options.setName("bet")
                            .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                            .setRequired(true))
                    .addStringOption((options) =>
                        options.setName("value")
                            .setDescription("Выпадет четное или нечетное.")
                            .addChoices(
                                {
                                    name: "четное",
                                    value: "even"
                                },
                                {
                                    name: "нечетное",
                                    value: "odd"
                                }
                            )
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("colours")
                    .setDescription("Colours (red, black, green) - x2")
                    .addStringOption((options) =>
                        options.setName("bet")
                            .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                            .setRequired(true))
                    .addStringOption((options) =>
                        options.setName("color")
                            .setDescription("Цвет, на которое выпадет число.")
                            .addChoices(
                                {
                                    name: "красный",
                                    value: "red"
                                },
                                {
                                    name: "чёрный",
                                    value: "black"
                                },
                                {
                                    name: "зелёный",
                                    value: "green"
                                }
                            )
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");
            const casinoCollection = database.collection("Casino");

            const casinoSettings = await casinoCollection.findOne({}) as any as CasinoSchema;
            if (!casinoSettings) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки казино не были обнаружены. Обратитесь к администрации.")], ephemeral: true }).catch((_) => { }); }

            const embed = new EmbedBuilder();

            embed.setTitle("ROULETTE")
                .setColor("#035afc")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;
            const getBet = isNaN(parseInt(interaction.options.getString("bet"))) ? getHalfOrAll(interaction.options.getString("bet"), findUser.balance) : parseInt(interaction.options.getString("bet"));

            if (getBet == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getBet < casinoSettings.roulette.min_bet) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Минимальная ставка: __\`${casinoSettings.roulette.min_bet} 💵\`__`)], ephemeral: true }).catch((_) => { });
            if (findUser.balance < getBet) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег.")], ephemeral: true }).catch((_) => { }); }

            const randomNumber = randomizer(0, 36);

            embed.setDescription(`**Число: __\`${randomNumber}\`__\r\nЦвет: __\`${RouletteColorNames[checkColor(randomNumber)]}\`__\r\nЧетность: __\`${randomNumber % 2 == 0 ? "Четное" : "Нечетное"}\`__\r\n\r\n`);

            function updateEmbedDescription(win: boolean, money: number) {
                embed.setDescription(`${embed.data.description}Вы ${win ? `выиграли` : `проиграли`}: __\`${money} 💵\`__**`)
                    .setThumbnail(win ? "https://t3.ftcdn.net/jpg/03/14/56/66/360_F_314566645_UNHlYyGK2EVdGQ8MoNw95vvH44yknrc7.jpg" : "https://t3.ftcdn.net/jpg/03/64/29/38/360_F_364293854_HGxpAAsozaFukVCPt3LFBYRkeKtDbQkj.jpg");
            }

            switch (interaction.options.getSubcommand())
            {
                case 'single':
                    const getNumber = interaction.options.getInteger("number");
                    const singleMultipleNumber = Math.round(getBet * casinoSettings.roulette.single.multiplier);

                    const singleWinOrLoose = randomNumber == getNumber;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: singleWinOrLoose ? findUser.balance + singleMultipleNumber : findUser.balance - getBet } });

                    updateEmbedDescription(singleWinOrLoose, singleWinOrLoose ? singleMultipleNumber : getBet);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'dozens':
                    const getDozen = interaction.options.getString("dozen");
                    const dozenMultipleNumber = Math.round(getBet * casinoSettings.roulette.dozens.multiplier);

                    const checkDozen = checkDozens(randomNumber);
                    const dozensWinOrLoose = getDozen == checkDozen;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: dozensWinOrLoose ? findUser.balance + dozenMultipleNumber : findUser.balance - getBet } });

                    updateEmbedDescription(dozensWinOrLoose, dozensWinOrLoose ? dozenMultipleNumber : getBet);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'halves':
                    const getHalf = interaction.options.getString("half");
                    const halvesMultipleNumber = Math.round(getBet * casinoSettings.roulette.halves.multiplier);

                    const checkHalves = checkHalf(randomNumber);
                    const halvesWinOrLoose = checkHalves == getHalf;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: halvesWinOrLoose ? findUser.balance + halvesMultipleNumber : findUser.balance - getBet } });

                    updateEmbedDescription(halvesWinOrLoose, halvesWinOrLoose ? halvesMultipleNumber : getBet);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'oddoreven':
                    const getOddOrEven = interaction.options.getString("value");
                    const oddOrEvenMultipleNumber = Math.round(getBet * casinoSettings.roulette.oddoreven.multiplier);

                    const checkOddOrEven = randomNumber % 2 == 0 ? "even" : "odd";
                    const oddOrEvenWinOrLoose = checkOddOrEven == getOddOrEven;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: oddOrEvenWinOrLoose ? findUser.balance + oddOrEvenMultipleNumber : findUser.balance - getBet } });

                    updateEmbedDescription(oddOrEvenWinOrLoose, oddOrEvenWinOrLoose ? oddOrEvenMultipleNumber : getBet);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });

                case 'colours':
                    const getColor = interaction.options.getString("color");
                    const colorMultipleNumber = Math.round(getBet * casinoSettings.roulette.colours.multiplier);

                    const checkColours = checkColor(randomNumber);
                    const coloursWinOrLoose = checkColours == getColor;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: coloursWinOrLoose ? findUser.balance + colorMultipleNumber : findUser.balance - getBet } });

                    updateEmbedDescription(coloursWinOrLoose, coloursWinOrLoose ? colorMultipleNumber : getBet);

                    return interaction.reply({ embeds: [embed] }).catch((_) => { });
            }
        }
    }
}