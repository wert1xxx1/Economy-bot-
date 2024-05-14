import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Db } from "mongodb";

import SettingsSchema from "../../Types/MongoDB/Interface/SettingsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import createUsersSchema from "../../Utils/CreateSchema/CreateUsersSchema";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import randomizer from "../../Utils/Randomizer/Randomizer";

const commandName = "Crime";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Do a crime :)")
            .addUserOption((options) =>
                options.setName("user")
                    .setDescription("Пользователь, у которого вы хотите украсть деньги.")
                    .setRequired(true)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const settingsCollection = database.collection("Settings");
            const usersCollection = database.collection("Users");

            const getSettings = await settingsCollection.findOne({}) as any as SettingsSchema;
            if (!getSettings) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки бота не обнаружены. Обратитесь к администрации сервера.")], ephemeral: true }).catch((_) => { });

            const getVictim = interaction.options.getUser("user");

            if (interaction.user.id === getVictim.id) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали самого себя.")], ephemeral: true }).catch((_) => { });

            const findFirstUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;
            let findSecondUser = await usersCollection.findOne({ id: getVictim.id }) as any as Users;

            if (!findSecondUser)
            {
                const userSchema: Users = createUsersSchema(getVictim.id);
                await usersCollection.insertOne(userSchema);

                findSecondUser = await usersCollection.findOne({ id: getVictim.id }) as any as Users;
            }

            const embed = new EmbedBuilder();

            embed.setTitle("CRIME")
                .setColor("#cf9a29")
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if ((findFirstUser.cooldown.crime * 1000) > Date.now()) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Вы уже грабили человека.\r\nСледующая возможность: <t:${findFirstUser.cooldown.crime}:f>`)], ephemeral: true }).catch((_) => { });

            if (findSecondUser.balance < getSettings.economy.crime.min_balance) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `У данного пользователя не хватает денег.\r\nМинимальный баланс: __\`${getSettings.economy.crime.min_balance} 💵\`__`)], ephemeral: true }).catch((_) => { });

            const cooldown = Math.ceil((Date.now() + getSettings.economy.crime.cooldown) / 1000);

            const stolenMoney = Math.floor((findSecondUser.balance / 100) * getSettings.economy.crime.max_percent);
            const stolenPercent = randomizer(0, stolenMoney);
            const grabChance = randomizer(0, 100);

            await usersCollection.updateOne({ id: interaction.user.id }, { $set: { "cooldown.crime": cooldown } });

            const successfullGrab = grabChance <= getSettings.economy.crime.chance && stolenPercent > 0;

            if (successfullGrab)
            {
                await usersCollection.updateOne({ id: getVictim.id }, { $set: { balance: findSecondUser.balance - stolenPercent } });
                await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findFirstUser.balance + stolenPercent, "cooldown.crime": cooldown } });
            }

            embed
                .setDescription(`**Вор: ${interaction.user}\r\nЖертва: ${getVictim}\r\n\r\nСумма: __\`${stolenPercent} 💵\`__\r\nПопытка: __\`${successfullGrab ? "Удачно ✅" : "Провал ❌"}\`__\r\n\r\nСледующая возможность: __<t:${cooldown}:f>⏳__**`)
                .setThumbnail(`https://static.thenounproject.com/png/2060045-200.png`);

            interaction.reply({ embeds: [embed] }).catch((_) => { });
        }
    }
}