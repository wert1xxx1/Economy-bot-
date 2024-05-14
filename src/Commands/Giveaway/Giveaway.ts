import { SlashCommandBuilder, Client, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, TextChannel, AttachmentBuilder, ChannelType, Collection, GuildMember, Snowflake } from "discord.js";
import { unlinkSync, writeFileSync } from "fs";
import { Db } from "mongodb";

import msFn, { StringValue } from "../../Libraries/ms/src";

import GiveawaySchema from "../../Types/MongoDB/Interface/GiveawaySchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";

import createGiveawaySchema from "../../Utils/CreateSchema/CreateGiveawaySchema";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import getWinners from "../../Utils/GetWinners/GetWinners";

const commandName = "Giveaway";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Разыграть что-то между пользователей.")
            .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
            .addSubcommand((subcommand) =>
                subcommand.setName("create")
                    .setDescription("Создать розыгрыш на сервере.")
                    .addStringOption((options) =>
                        options.setName("prize")
                            .setDescription("Название приза, который будет разыгрываться.")
                            .setRequired(true))
                    .addNumberOption((options) =>
                        options.setName("count")
                            .setDescription("Количество участников, которое может победить.")
                            .setMinValue(1)
                            .setRequired(true))
                    .addStringOption((options) =>
                        options.setName("time")
                            .setDescription("Время, когда будет выполнен розыгрыш.")
                            .setRequired(false)))
            .addSubcommand((subcommand) =>
                subcommand.setName("roll")
                    .setDescription("Запустить розыгрыш.")
                    .addStringOption((options) =>
                        options.setName("id")
                            .setDescription("ID розыгрыша.")
                            .setRequired(true)))
            .addSubcommand((subcommand) =>
                subcommand.setName("remove")
                    .setDescription("Удалить розыгрыш.")
                    .addStringOption((options) =>
                        options.setName("id")
                            .setDescription("ID розыгрыша")
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const giveawayCollection = database.collection("Giveaway");

            const embed = new EmbedBuilder();

            embed.setTitle("GIVEAWAY 🎉")
                .setColor("#59e80c")
                .setTimestamp();

            switch (interaction.options.getSubcommand())
            {
                case 'create':
                    const getPrize = interaction.options.getString("prize");
                    const getCount = interaction.options.getNumber("count");
                    const getTime = interaction.options.getString("time") as StringValue ?? null;

                    if (getTime && !getTime.match(/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|months?|mh|years?|yrs?|y)$/i)) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы указали время в неверном формате.\r\nВерный формат: 1ms/s/m/h/d/w/mh/y")], ephemeral: true }).catch((_) => { });

                    embed
                        .setDescription(`**Приз: \`${getPrize}\`\r\nПобедителей: \`${getCount}\`\r\n\r\nСоздан: ${interaction.user}\r\n\r\nДля того чтобы принять участие, вам нужно находиться в голосовом канале!**`)
                        .setFooter({ text: `ID: soon...`, });

                    interaction.reply({ embeds: [embed], fetchReply: true }).then(async (msg) => {
                        const giveaway: GiveawaySchema = createGiveawaySchema(interaction.guild.id, msg.channel.id, msg.id, getCount, (getTime ? (msFn(getTime) + Date.now()).toString() : getTime as null), getPrize);
                        await giveawayCollection.insertOne(giveaway);

                        embed
                            .setFooter({ text: `ID: ${msg.id}` });

                        interaction.editReply({ embeds: [embed] });
                    }, (_) => { });
                    break;

                case 'roll':
                    const giveawayId = interaction.options.getString("id");

                    const getGiveaway = await giveawayCollection.findOne({ messageId: giveawayId }) as any as GiveawaySchema;
                    if (!getGiveaway) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Розыгрыш с указанным id не обнаружен.")], ephemeral: true }).catch((_) => { });

                    await interaction.deferReply().catch((_) => { });

                    await giveawayCollection.updateOne({ id: giveawayId }, { $set: { time: null } });

                    const guild = interaction.guild;

                    const membersInVoice = [];

                    const voiceChannels = guild.channels.cache.filter(c => c.type == ChannelType.GuildVoice && c.members.size > 0);

                    voiceChannels.forEach((c) => {
                        const members = c.members as Collection<Snowflake, GuildMember>;

                        members.forEach((u) => { membersInVoice.push({ key: u.id, value: u }) });
                    });

                    if (voiceChannels.size == 0 || membersInVoice.length == 0) return interaction.editReply({ embeds: [simpleEmbeds("error", commandName, "Войс каналов не обнаружено или никого нет в войс каналах.")] }).catch((_) => { });

                    const winners = getWinners(getGiveaway, membersInVoice);

                    embed
                        .setFooter({ text: `ID: ${giveawayId}`, })
                        .setTimestamp();

                    const getChannel = interaction.guild.channels.cache.get(getGiveaway.channelId) as TextChannel;
                    const getMessage = await getChannel.messages.fetch(getGiveaway.messageId);

                    const giveawayDescription = `**Приз: \`${getGiveaway.prize}\`\r\n\r\n${winners.length == 1 ? "Победитель" : "Победители"}🎉:\r\n${winners.map((u) => `${u}`).join('\r\n')}**`;

                    interaction.editReply({ embeds: [simpleEmbeds("info", commandName, `Победител${getGiveaway.winnersCount > 1 ? 'и' : 'ь'} успешно выбран${getGiveaway.winnersCount > 1 ? 'ы' : ''}.`)] }).catch((_) => { });

                    if (giveawayDescription.length > 2048)
                    {
                        const usernameWinners = winners.map((u) => `${u.username}`).join('\r\n');

                        writeFileSync(`./${giveawayId}.txt`, usernameWinners);

                        embed
                            .setDescription(`**Приз: \`${getPrize}\`\r\n\r\n${winners.length == 1 ? "Победитель" : "Победители"}🎉:\r\nСписок __победителей__ записан в файл.`)
                            .setTimestamp();

                        await getMessage.reply({ embeds: [embed], files: [new AttachmentBuilder(`./${giveawayId}.txt`, { name: 'winners.txt' })] }).catch((_) => { });

                        return unlinkSync(`./${giveawayId}.txt`);
                    }

                    embed
                        .setDescription(giveawayDescription)
                        .setTimestamp();

                    getMessage.reply({ embeds: [embed] }).catch((_) => { });
                    break;

                case 'remove':
                    const removeId = interaction.options.getString("id");

                    const removeGiveaway = await giveawayCollection.findOne({ messageId: removeId }) as any as GiveawaySchema;
                    if (!removeGiveaway) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Розыгрыш с указанным id не обнаружен.")], ephemeral: true }).catch((_) => { });

                    await giveawayCollection.deleteOne({ messageId: removeId });

                    interaction.reply({ embeds: [simpleEmbeds("info", commandName, `Розыгрыш успешно удален.`)], ephemeral: true }).catch((_) => { });
                    break;
            }
        }
    }
}