import { SlashCommandBuilder, Client, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import createUsersSchema from "../../Utils/CreateSchema/CreateUsersSchema";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";

const commandName = "Money";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Редактировать баланс пользователя.")
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
            .addSubcommand((subcommand) =>
                subcommand.setName("balance")
                    .setDescription("Сменить баланс пользователя.")
                    .addUserOption((options) =>
                        options.setName("user")
                            .setDescription("Пользователь, которому нужно снять или дать деньги.")
                            .setRequired(true))
                    .addIntegerOption((options) =>
                        options.setName("value")
                            .setDescription("Сумма снятия или добавления (отрицательное число для снятия).")
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("bank")
                    .setDescription("Сменить баланс пользователя в банке.")
                    .addUserOption((options) =>
                        options.setName("user")
                            .setDescription("Пользователь, которому нужно снять или дать деньги.")
                            .setRequired(true))
                    .addIntegerOption((options) =>
                        options.setName("value")
                            .setDescription("Сумма снятия или добавления (отрицательное число для снятия).")
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const usersCollection = database.collection("Users");

            const getUser = interaction.options.getUser("user");
            const getSum = interaction.options.getInteger("value");

            if (getSum === 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали нуль.")], ephemeral: true }).catch((_) => { });

            let findUser = await usersCollection.findOne({ id: getUser.id }) as any as Users;

            if (!findUser)
            {
                const userSchema: Users = createUsersSchema(getUser.id);
                await usersCollection.insertOne(userSchema);

                findUser = await usersCollection.findOne({ id: getUser.id }) as any as Users;
            }

            const embed = new EmbedBuilder();

            embed.setTitle("MONEY")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();


            switch (interaction.options.getSubcommand())
            {
                case "balance":

                    if (findUser.balance < Math.abs(getSum) && getSum < 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У данного пользователя баланс меньше, чем вы указали.")], ephemeral: true }).catch((_) => { });

                    findUser.balance += getSum;

                    await usersCollection.updateOne({ id: getUser.id }, { $set: { balance: findUser.balance } });

                    embed.setDescription(`**Пользователь: ${getUser}\r\n${getSum > 0 ? `Выдано` : `Снято`}: __\`${Math.abs(getSum)} 💵\`__\r\n\r\nБаланс пользователя: __\`${findUser.balance} 💵\`__**`)
                        .setThumbnail("https://i.imgur.com/LXJympr.png");

                    interaction.reply({ embeds: [embed] }).catch((_) => { });

                    break;

                case "bank":
                    if (findUser.bank_balance < Math.abs(getSum) && getSum < 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У данного пользователя баланс меньше, чем вы указали.")], ephemeral: true }).catch((_) => { });

                    findUser.bank_balance += getSum;

                    await usersCollection.updateOne({ id: getUser.id }, { $set: { bank_balance: findUser.bank_balance } });

                    embed.setDescription(`**Пользователь: ${getUser}\r\n${getSum > 0 ? `Выдано` : `Снято`}: __\`${Math.abs(getSum)} 💵\`__\r\n\r\nБаланс пользователя: __\`${findUser.bank_balance} 💵\`__**`)
                        .setThumbnail("https://i.imgur.com/LXJympr.png");

                    interaction.reply({ embeds: [embed] }).catch((_) => { });
                    break;
            }
        }
    }
}