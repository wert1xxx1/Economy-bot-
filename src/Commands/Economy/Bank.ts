import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";

const commandName = "Bank";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Положить/снять деньги в банке.")
            .addSubcommand((subcommand) =>
                subcommand.setName("deposit")
                    .setDescription("Положить деньги в банк.")
                    .addStringOption((options) =>
                        options.setName("value")
                            .setDescription("Сумма, которую вы хотите положить. Half - половина, All - все.")
                            .setRequired(true)
                    ))
            .addSubcommand((subcommand) =>
                subcommand.setName("withdraw")
                    .setDescription("Снять деньги с банка.")
                    .addStringOption((options) =>
                        options.setName("value")
                            .setDescription("Сумма, которую вы хотите снять. Half - половина, All - все.")
                            .setRequired(true)
                    )),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            const getSum = isNaN(parseInt(interaction.options.getString("value"))) ? getHalfOrAll(interaction.options.getString("value"), interaction.options.getSubcommand() == "deposit" ? findUser.balance : findUser.bank_balance) : parseInt(interaction.options.getString("value"));

            if (getSum == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getSum <= 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали ниже нуля или нуль.")], ephemeral: true }).catch((_) => { });

            const embed = new EmbedBuilder();

            embed.setTitle("BANK")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            switch (interaction.options.getSubcommand())
            {
                case "deposit":
                    if (getSum > findUser.balance) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали больше чем у вас есть.")], ephemeral: true }).catch((_) => { });

                    findUser.balance -= getSum;
                    findUser.bank_balance += getSum;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance, bank_balance: findUser.bank_balance } });

                    embed
                        .setDescription(`**Вы положили в банк: __\`${getSum} 💵\`__\r\n\r\nВаш баланс: __\`${findUser.balance} 💵\`__\r\nВ банке: __\`${findUser.bank_balance} 💵\`__**`)
                        .setThumbnail(`https://www.pngall.com/wp-content/uploads/1/Bank-Transparent.png`);

                    interaction.reply({ embeds: [embed] }).catch((_) => { });
                    break;

                case "withdraw":
                    if (getSum > findUser.bank_balance) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали больше чем у вас есть.")], ephemeral: true }).catch((_) => { });

                    findUser.balance += getSum;
                    findUser.bank_balance -= getSum;

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance, bank_balance: findUser.bank_balance } });

                    embed
                        .setDescription(`**Вы сняли с банка: __\`${getSum} 💵\`__\r\n\r\nВаш баланс: __\`${findUser.balance} 💵\`__\r\nВ банке: __\`${findUser.bank_balance} 💵\`__**`)
                        .setThumbnail(`https://www.pngall.com/wp-content/uploads/1/Bank-Transparent.png`);

                    interaction.reply({ embeds: [embed] }).catch((_) => { });
                    break;
            }
        }
    }
}