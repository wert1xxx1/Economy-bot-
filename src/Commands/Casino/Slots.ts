import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import { CasinoSchema } from "../../Types/MongoDB/Interface/CasinoSchema";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import SlotItem from "../../Types/Bot/Interface/SlotItem";
import Users from "../../Types/MongoDB/Interface/Users";

import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import shuffleArray from "../../Utils/ShuffleArray/ShuffleArray";
import getSlotLine from "../../Utils/Casino/Slots/GetSlotLine";

const commandName = "Slots";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Сыграть в игровой автомат.")
            .addStringOption((options) =>
                options.setName("bet")
                    .setDescription("Сумма, которую вы хотите поставить.  Half - половина, All - все.")
                    .setRequired(true)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");
            const casinoCollection = database.collection("Casino");

            const casinoSettings = await casinoCollection.findOne({}) as any as CasinoSchema;
            if (!casinoSettings) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки казино не были обнаружены. Обратитесь к администрации.")], ephemeral: true }).catch((_) => { }); }

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            const getBet = isNaN(parseInt(interaction.options.getString("bet"))) ? getHalfOrAll(interaction.options.getString("bet"), findUser.balance) : parseInt(interaction.options.getString("bet"));

            if (getBet == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getBet < casinoSettings.slots.min_bet) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Минимальная ставка: __\`${casinoSettings.slots.min_bet} 💵\`__`)], ephemeral: true }).catch((_) => { });
            if (findUser.balance < getBet) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег.")], ephemeral: true }).catch((_) => { }); }

            const embed = new EmbedBuilder();
            const allSlotEmojis: Array<SlotItem> = shuffleArray(casinoSettings.slots.items);

            let spin = 1;

            let centerSlotLine = getSlotLine(allSlotEmojis, 3);
            let spinSlotsText = `\`◖ ${getSlotLine(allSlotEmojis, 3).map((e) => `${e.emoji}`).join(" ")} ◗\`\r\n__\`◖ ${centerSlotLine.map((e) => `${e.emoji}`).join(" ")} ◗\`__\r\n\`◖ ${getSlotLine(allSlotEmojis, 3).map((e) => `${e.emoji}`).join(" ")} ◗\``;

            embed.setTitle("**     • Slots •**")
                .setColor("#923939")
                .setDescription(spinSlotsText)
                .setFooter({ text: interaction.user.username })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] }).catch((_) => { });

            async function spinSlots() {
                centerSlotLine = getSlotLine(allSlotEmojis, 3);
                spinSlotsText = `\`◖ ${getSlotLine(allSlotEmojis, 3).map((e) => `${e.emoji}`).join(" ")} ◗\`\r\n__\`◖ ${centerSlotLine.map((e) => `${e.emoji}`).join(" ")} ◗\`__\r\n\`◖ ${getSlotLine(allSlotEmojis, 3).map((e) => `${e.emoji}`).join(" ")} ◗\``;

                embed.setDescription(spinSlotsText);

                await interaction.editReply({ embeds: [embed] }).catch((_) => { });

                if (spin < casinoSettings.slots.max_spins - 1) { spin++; setTimeout(() => { spinSlots(); }, casinoSettings.slots.delay_spins); return; };

                getResults();
            }

            function getResults() {
                setTimeout(async () => {
                    const getMultiplier = centerSlotLine[0].emoji == centerSlotLine[1].emoji || centerSlotLine[1].emoji == centerSlotLine[2].emoji
                        ?
                        centerSlotLine[1].multiplier * casinoSettings.slots.double_match_multiplier
                        :
                        centerSlotLine[0].emoji == centerSlotLine[1].emoji && centerSlotLine[1].emoji == centerSlotLine[2].emoji
                            ?
                            centerSlotLine[1].multiplier * casinoSettings.slots.triple_match_multiplier
                            :
                            null;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: getMultiplier ? findUser.balance + Math.round(getBet * getMultiplier) : findUser.balance - getBet } });

                    embed.setDescription(`${embed.data.description}\r\n\r\n**Вы ${getMultiplier ? `выиграли` : `проиграли`}: __\`${getMultiplier ? Math.round(getBet * getMultiplier) : getBet} 💵\`__**`);

                    return interaction.editReply({ embeds: [embed] });
                }, casinoSettings.slots.wait_after_spins);
            }

            setTimeout(() => { spinSlots(); }, casinoSettings.slots.delay_spins);
        }
    }
}