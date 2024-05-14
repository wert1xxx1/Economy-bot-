import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder, ButtonStyle, ComponentType, ButtonInteraction, GuildMemberRoleManager } from "discord.js";
import { Db } from "mongodb";

import GoodsSchema from "../../Types/MongoDB/Interface/GoodsSchema";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";

import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import ButtonParser from "../../Utils/ButtonParser/ButtonParser";

const commandName = "Shop";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Магазин ролей.")
            .addSubcommand((subcommand) =>
                subcommand.setName("open")
                    .setDescription("Открыть магазин."))
            .addSubcommand((subcommand) =>
                subcommand.setName("buy")
                    .setDescription("Купить роль")
                    .addStringOption((options) =>
                        options.setName("id")
                            .setDescription("ID роли которую вы хотите купить.")
                            .setRequired(true))),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {
            const shopCollection = database.collection("Shop");
            const usersCollection = database.collection("Users");

            if (await shopCollection.countDocuments() == 0) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Роли в магазине не обнаружены. Обратитесь к администрации.")] }).catch((_) => { });

            const allGoods = await shopCollection.find({}).toArray() as any as Array<GoodsSchema>;

            const embed = new EmbedBuilder();

            switch (interaction.options.getSubcommand())
            {
                case 'open':
                    const limitPerPage = 5;

                    let nextGoods = limitPerPage;
                    let pages = Math.ceil(allGoods.length / limitPerPage)
                    let currentPage = 1;

                    function getPage(): string {
                        const nextPage: number = Math.min(nextGoods, allGoods.length);

                        let page: string = "";

                        for (let i = nextGoods - limitPerPage; i < nextPage; i++)
                            page += `**>>> ID: __\`${allGoods[i].id}\`__\r\nРоль: <@&${allGoods[i].roleId}>\r\nЦена: __\`${allGoods[i].price} 💵\`__**\r\n`;

                        return page;
                    }

                    embed.setTitle("**SHOP**")
                        .setColor("#cf9a29")
                        .setDescription(getPage())
                        .setFooter({ text: `Страница: ${currentPage}/${pages}` })
                        .setTimestamp();

                    interaction.reply({ embeds: [embed], components: await ButtonParser({ rows: { first: [{ custom_id: "backward", style: ButtonStyle.Secondary, emoji: "⬅️", disabled: !Boolean(currentPage - 1) }, { custom_id: "close", style: ButtonStyle.Secondary, emoji: "❌" }, { custom_id: "forward", style: ButtonStyle.Secondary, emoji: "➡️", disabled: (currentPage === pages) }] } }) }).then((i) => {
                        const collector = i.createMessageComponentCollector({ componentType: ComponentType.Button });

                        const getClickOnButtons = async (i: ButtonInteraction) => {
                            if (interaction.user.id != i.user.id) { i.reply({ embeds: [simpleEmbeds("error", "Вы не открывали данный магазин.", i.user.username)], ephemeral: true }).catch((_) => { }); return; }

                            switch (i.customId)
                            {
                                case 'backward':
                                    nextGoods = Math.max(nextGoods - limitPerPage, 0);
                                    currentPage = Math.max(currentPage - 1, 1);

                                    embed.setDescription(getPage()).setFooter({ text: `Страница: ${currentPage}/${pages}` }).setTimestamp();

                                    i.update({ embeds: [embed], components: await ButtonParser({ rows: { first: [{ custom_id: "backward", style: ButtonStyle.Secondary, emoji: "⬅️", disabled: !Boolean(currentPage - 1) }, { custom_id: "close", style: ButtonStyle.Secondary, emoji: "❌" }, { custom_id: "forward", style: ButtonStyle.Secondary, emoji: "➡️", disabled: (currentPage === pages) }] } }) }).catch((_) => { });
                                    break;

                                case 'close':
                                    collector.off("collect", getClickOnButtons);
                                    i.message.delete().catch((_) => { });
                                    break;

                                case 'forward':
                                    nextGoods = nextGoods + limitPerPage;
                                    currentPage = Math.min(currentPage + 1, pages);

                                    embed.setDescription(getPage()).setFooter({ text: `Страница: ${currentPage}/${pages}` }).setTimestamp();

                                    i.update({ embeds: [embed], components: await ButtonParser({ rows: { first: [{ custom_id: "backward", style: ButtonStyle.Secondary, emoji: "⬅️", disabled: !Boolean(currentPage - 1) }, { custom_id: "close", style: ButtonStyle.Secondary, emoji: "❌" }, { custom_id: "forward", style: ButtonStyle.Secondary, emoji: "➡️", disabled: (currentPage === pages) }] } }) }).catch((_) => { });
                                    break;
                            }
                        }

                        collector.on("collect", getClickOnButtons);
                    }, (_) => { });
                    break;

                case 'buy':
                    const roleId = interaction.options.getString("id");
                    const getRole = allGoods.find(r => r.id == roleId);

                    const userRoles = interaction.member.roles as GuildMemberRoleManager;

                    if (!getRole) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Роль не найдена по указанному ID.")], ephemeral: true }).catch((_) => { });
                    if (!interaction.guild.roles.cache.get(getRole.roleId)) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Роль не обнаружена на сервере. Обратитесь к администраторам.")], ephemeral: true }).catch((_) => { });
                    if (userRoles.cache.has(getRole.roleId)) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас уже есть данная роль.")], ephemeral: true }).catch((_) => { });

                    const findUser = await usersCollection.findOne({ id: interaction.user.id });

                    if (findUser.balance < getRole.price) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег для покупки роли.")], ephemeral: true }).catch((_) => { });

                    embed.setTitle("ROLE")
                        .setColor("#cf9a29")
                        .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp();

                    await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance - getRole.price } });

                    userRoles.add(getRole.roleId)
                        .then((_) => {
                            embed.setDescription(`**Вы приобрели роль: <@&${getRole.roleId}>**`);

                            return interaction.reply({ embeds: [embed] }).catch((_) => { });
                        },
                            (_) => {
                                embed.setDescription(`**Вы приобрели роль: <@&${getRole.roleId}>\r\n\r\nПри выдаче роли возникла ошибка.\r\nОбратитесь к администрации.**`);

                                return interaction.reply({ embeds: [embed] }).catch((_) => { });
                            })
                    break;
            }
        }
    }
}