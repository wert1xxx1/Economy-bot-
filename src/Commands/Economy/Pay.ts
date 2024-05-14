import { Client, SlashCommandBuilder, ChatInputCommandInteraction, ComponentType, ButtonStyle, EmbedBuilder, ButtonInteraction } from "discord.js";
import { Db } from "mongodb";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import createUsersSchema from "../../Utils/CreateSchema/CreateUsersSchema";
import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import ButtonParser from "../../Utils/ButtonParser/ButtonParser";

const commandName = "Pay";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Передать деньги с кошелька другому пользователю.")
            .addUserOption((options) =>
                options.setName("user")
                    .setDescription("Пользователь, которому вы хотите передать деньги.")
                    .setRequired(true))
            .addStringOption((options) =>
                options.setName("value")
                    .setDescription("Сумма, которую вы хотите отправить. Half - половина, All - все.")
                    .setRequired(true)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const usersCollection = database.collection("Users");

            const getUser = interaction.options.getUser("user");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;
            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            if (interaction.user.id === getUser.id) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали самого себя.")], ephemeral: true }).catch((_) => { });

            const findFirstUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;
            let findSecondUser = await usersCollection.findOne({ id: getUser.id }) as any as Users;

            if (!findSecondUser)
            {
                const userSchema: Users = createUsersSchema(getUser.id);
                await usersCollection.insertOne(userSchema);

                findSecondUser = await usersCollection.findOne({ id: getUser.id }) as any as Users;
            }

            const getSum = isNaN(parseInt(interaction.options.getString("value"))) ? getHalfOrAll(interaction.options.getString("value"), findFirstUser.balance) : parseInt(interaction.options.getString("value"));

            if (getSum == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getSum <= 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали ниже нуля или нуль.")], ephemeral: true }).catch((_) => { });

            if (findFirstUser.balance < getSum) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег.")], ephemeral: true }).catch((_) => { });

            const embed = new EmbedBuilder();

            embed.setTitle("PAY")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            const sumWithComission = Math.floor(getSum - ((getSum / 100) * getSettings.economy.pay.comission));

            embed.setDescription(`**Получатель: ${getUser}\r\nСумма: __\`${getSum} 💵\`__\r\n\r\nКомиссия: __\`${getSettings.economy.pay.comission}%\`__ (__\`${sumWithComission} 💵\`__)**`);

            interaction.reply({
                embeds: [embed], components: await ButtonParser({
                    rows: {
                        first: [{ custom_id: "yes", label: "Да", style: ButtonStyle.Success, emoji: "✅" },
                        { custom_id: "no", label: "Нет", style: ButtonStyle.Danger, emoji: "⛔" }]
                    }
                }), ephemeral: true
            }).then((i) => {
                const collector = i.createMessageComponentCollector({ componentType: ComponentType.Button, max: 1, time: 30 * 1000 });

                async function warningMessage(i: ButtonInteraction) {
                    switch (i.customId)
                    {
                        case "yes":
                            await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findFirstUser.balance - getSum } });
                            await usersCollection.updateOne({ id: getUser.id }, { $set: { balance: findSecondUser.balance + sumWithComission } });

                            await i.update({ embeds: [simpleEmbeds("info", commandName, "Перевод успешно выполнен.")], components: [] }).catch((_) => { });

                            embed.setDescription(`**Отправитель: ${interaction.user}\r\nПолучатель: ${getUser}\r\nСумма: __\`${sumWithComission} 💵\`__\r\n\r\nКомиссия: __\`${getSettings.economy.pay.comission}%\`__**`)
                                .setThumbnail("https://i.imgur.com/LXJympr.png");

                            await i.followUp({ embeds: [embed] }).catch((_) => { });
                            break;

                        case "no":
                            embed.setDescription(`**Перевод отменен.**`);

                            i.update({ embeds: [embed], components: [] }).catch((_) => { });
                            break;
                    }
                };

                collector.once("collect", warningMessage).once("end", (c) => {
                    if (c.size == 0) 
                    {
                        collector.off("collect", warningMessage);
                        embed.setDescription(`**Время на ответ истекло.**`);

                        if (interaction.isRepliable())
                            interaction.editReply({ embeds: [embed], components: [] }).catch((_) => { });
                    };
                });
            }, (_) => { })
        }
    }
}