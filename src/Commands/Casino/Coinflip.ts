import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import { CasinoSchema } from "../../Types/MongoDB/Interface/CasinoSchema";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";

import { CoinFlipNames, CoinFlipSides } from "../../Types/Bot/Enums/CoinflipEnums";

const commandName = "Coinflip";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Бросить монетку.")
            .addStringOption((options) =>
                options.setName("bet")
                    .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                    .setRequired(true))
            .addStringOption((options) =>
                options.setName("value")
                    .setDescription("Орёл или решка.")
                    .addChoices(
                        { name: "Орёл", value: "heads" },
                        { name: "Решка", value: "tails" })
                    .setRequired(true)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");
            const casinoCollection = database.collection("Casino");

            const casinoSettings = await casinoCollection.findOne({}) as any as CasinoSchema;
            if (!casinoSettings) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки казино не были обнаружены. Обратитесь к администрации.")], ephemeral: true }).catch((_) => { }); }

            const embed = new EmbedBuilder();

            embed.setTitle("COINFLIP")
                .setColor("#035afc")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const getChoice = interaction.options.getString("value");
            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            const getBet = isNaN(parseInt(interaction.options.getString("bet"))) ? getHalfOrAll(interaction.options.getString("bet"), findUser.balance) : parseInt(interaction.options.getString("bet"));

            if (getBet == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getBet < casinoSettings.coinflip.min_bet) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Минимальная ставка: __\`${casinoSettings.coinflip.min_bet} 💵\`__`)], ephemeral: true }).catch((_) => { });
            if (findUser.balance < getBet) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег.")], ephemeral: true }).catch((_) => { }); }

            const headsOrTails = Math.round(Math.random());
            const winOrLoose = getChoice == CoinFlipSides[headsOrTails];

            await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: winOrLoose ? findUser.balance + getBet : findUser.balance - getBet } });

            embed.setDescription(`**Выпал: __\`${CoinFlipNames[CoinFlipSides[headsOrTails]]}\`__\r\nВы ${winOrLoose ? "выиграли" : "проиграли"}: __\`${getBet} 💵\`__**`)
                .setThumbnail(winOrLoose ? "https://t3.ftcdn.net/jpg/03/14/56/66/360_F_314566645_UNHlYyGK2EVdGQ8MoNw95vvH44yknrc7.jpg" : "https://t3.ftcdn.net/jpg/03/64/29/38/360_F_364293854_HGxpAAsozaFukVCPt3LFBYRkeKtDbQkj.jpg");

            interaction.reply({ embeds: [embed] }).catch((_) => { });
        }
    }
}