import { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";

import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import ButtonParser from "../../Utils/ButtonParser/ButtonParser";

const commandName = "Reset";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Сбросить статистику пользователя или всего сервера.")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addUserOption((options) =>
                options.setName("user")
                    .setDescription("Пользователь, которому нужно сбросить все.")
                    .setRequired(false)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");

            const getUser = interaction.options.getUser("user");

            const embed = new EmbedBuilder();

            embed.setTitle("RESET")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (!getUser)
            {
                embed.setDescription(`**Данная команда сбросит __ВСЮ статистику сервера__.**`);

                interaction.reply({
                    embeds: [embed], components: await ButtonParser({
                        rows: {
                            first: [{ custom_id: "yes", label: "Сбросить", style: ButtonStyle.Success, emoji: "✅" },
                            { custom_id: "no", label: "Отменить", style: ButtonStyle.Danger, emoji: "⛔" }]
                        }
                    }),
                    ephemeral: true
                }).then((i) => {
                    const collector = i.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1 });

                    collector.once("collect", async (i) => {
                        switch (i.customId)
                        {
                            case "yes":
                                await usersCollection.updateMany({}, { $set: { balance: 0, bank_balance: 0, "cases": 0, "cooldown.bonus": 0, "cooldown.work": 0, "cooldown.crime": 0 } });

                                embed.setDescription(`**Сброс выполнен успешно.**`);

                                await i.update({ embeds: [embed], components: [] }).catch((_) => { });
                                break;

                            case "no":
                                embed.setDescription(`**Сброс отменен.**`);

                                i.update({ embeds: [embed], components: [] }).catch((_) => { });
                                break;
                        }
                    })
                }, (_) => { });
                return;
            }

            const findUser = usersCollection.findOne({ id: getUser.id });

            if (!findUser) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Данный пользователь не найден.")], ephemeral: true }).catch((_) => { });

            await usersCollection.updateOne({ id: getUser.id }, { $set: { balance: 0, bank_balance: 0, "cases": 0, "cooldown.bonus": 0, "cooldown.work": 0, "cooldown.crime": 0 } });

            embed.setDescription(`**Статистика пользователя: __${getUser}__ успешно сброшена.**`);

            interaction.reply({ embeds: [embed], ephemeral: true }).catch((_) => { });
        }
    }
}