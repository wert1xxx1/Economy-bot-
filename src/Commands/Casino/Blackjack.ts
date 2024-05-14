import { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder, ComponentType, ButtonInteraction } from "discord.js";
import { Db } from "mongodb";

import { CardType, CasinoSchema } from "../../Types/MongoDB/Interface/CasinoSchema";

import BlackjackPlayerHands from "../../Types/Bot/Interface/BlackjackPlayer";
import SlashCommand from "../../Types/Bot/Interface/SlashCommand";
import Users from "../../Types/MongoDB/Interface/Users";

import generateFinalResult from "../../Utils/Casino/Blackjack/GenerateFinalResult";
import addDealerCards from "../../Utils/Casino/Blackjack/AddDealerCards";
import addPlayerCards from "../../Utils/Casino/Blackjack/AddPlayerCards";
import getCardPoints from "../../Utils/Casino/Blackjack/GetCardPoints";
import shuffleCards from "../../Utils/Casino/Blackjack/ShuffleCards";
import getBJButtons from "../../Utils/Casino/Blackjack/GetBJButtons";
import failedHands from "../../Utils/Casino/Blackjack/FailedHands";
import checkSplit from "../../Utils/Casino/Blackjack/CheckSplit";
import simpleEmbeds from "../../Utils/SimpleEmbeds/SimpleEmbeds";
import addAllSum from "../../Utils/Casino/Blackjack/AddAllSum";
import getHalfOrAll from "../../Utils/GetHalfOrAll/GetHalfOrAll";

const commandName = "Blackjack";

export let command: SlashCommand = {
    settings: {
        name: commandName.toLowerCase(),
        command: new SlashCommandBuilder()
            .setName(commandName.toLowerCase())
            .setDescription("Сыграть в блекджек.")
            .addStringOption((options) =>
                options.setName("bet")
                    .setDescription("Сумма, которую вы хотите поставить. Half - половина, All - все.")
                    .setRequired(true)),
        run: async (_: Client<boolean>, interaction: ChatInputCommandInteraction, database: Db) => {

            const usersCollection = database.collection("Users");
            const casinoCollection = database.collection("Casino");

            const casinoSettings = await casinoCollection.findOne({}) as any as CasinoSchema;
            if (!casinoSettings) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Настройки казино не были обнаружены. Обратитесь к администрации.")], ephemeral: true }).catch((_) => { }); }

            const findUser = await usersCollection.findOne({ id: interaction.user.id }) as any as Users;

            const getBet = isNaN(parseInt(interaction.options.getString("bet"))) ? getHalfOrAll(interaction.options.getString("bet"), findUser.balance) : parseInt(interaction.options.getString("bet"));

            if (getBet == null) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "Вы не указали число/Half/All.")], ephemeral: true }).catch((_) => { });
            if (getBet < casinoSettings.blackjack.min_bet) return interaction.reply({ embeds: [simpleEmbeds("error", commandName, `Минимальная ставка: __\`${casinoSettings.blackjack.min_bet} 💵\`__`)], ephemeral: true }).catch((_) => { });
            if (findUser.balance < getBet) { return interaction.reply({ embeds: [simpleEmbeds("error", commandName, "У вас не хватает денег.")], ephemeral: true }).catch((_) => { }); }

            const embed = new EmbedBuilder();
            const cards = shuffleCards([...casinoSettings.cards.clubs, ...casinoSettings.cards.diamonds, ...casinoSettings.cards.hearts, ...casinoSettings.cards.spades]);

            let currentHand = 0;

            let dealerCards: Array<CardType> = cards.splice(0, 2);
            let playerCards: Array<BlackjackPlayerHands> = [{ bet: getBet, surrend: false, hand: cards.splice(0, 2) }];

            const dHandText = "Рука дилера:\r\n";
            const pHandText = "Ваша рука:\r\n";

            let dealerCardsText = `${dHandText}${dealerCards[0].emoji} ${casinoSettings.blackjack.opened ? dealerCards[1].emoji : casinoSettings.cards.hidden}: \`${casinoSettings.blackjack.opened ? dealerCards[0].points + dealerCards[1].points : dealerCards[0].points}\``;
            let playerCardsText = `${pHandText}${playerCards[currentHand].hand.map((c: CardType) => `${c.emoji}`).join(" ")}: \`${getCardPoints(playerCards[currentHand].hand, casinoSettings)}\``;

            embed
                .setTitle("**Blackjack**")
                .setDescription(`**${dealerCardsText}\r\n\r\n${playerCardsText}**`)
                .setColor("#035afc")
                .setFooter({ text: `Активная рука: ${currentHand + 1}` })
                .setTimestamp();

            findUser.balance -= getBet;

            await usersCollection.updateOne({ id: interaction.user.id, }, { $set: { balance: findUser.balance } });

            interaction.reply({ embeds: [embed], components: await getBJButtons(false, false, playerCards[currentHand].hand.length > casinoSettings.blackjack.disable_double_after, (!checkSplit(playerCards[currentHand].hand) || playerCards.length >= casinoSettings.blackjack.player.max_splits), casinoSettings.blackjack.player.always_surrend ? false : Boolean(playerCards[currentHand].hand.length > casinoSettings.blackjack.disable_surrend_after) || casinoSettings.blackjack.opened) }).then((i) => {

                const collector = i.createMessageComponentCollector({ componentType: ComponentType.Button });

                async function game(i: ButtonInteraction) {
                    if (i.user.id != interaction.user.id) { i.reply({ embeds: [simpleEmbeds("error", commandName, "Это не ваша игра.")], ephemeral: true }).catch((_) => { }); return; };

                    async function updateInteraction(increaseHand?: boolean, addComponents?: boolean): Promise<void> {
                        if (increaseHand) currentHand++;

                        i.update({ embeds: [embed], components: addComponents ? await getBJButtons(false, false, playerCards[currentHand].hand.length > casinoSettings.blackjack.disable_double_after, (!checkSplit(playerCards[currentHand].hand) || playerCards.length >= casinoSettings.blackjack.player.max_splits), casinoSettings.blackjack.player.always_surrend ? false : Boolean(playerCards[currentHand].hand.length > casinoSettings.blackjack.disable_surrend_after) || casinoSettings.blackjack.opened) : [] }).catch((_) => { });
                    }

                    async function updateBlackjackInfo(update: "player" | "dealer", failed?: boolean) {
                        if (update === "player")
                        {
                            playerCardsText = `${pHandText}`;
                            if (!failed) 
                            {
                                playerCards.forEach((h) => { playerCardsText += `${h.hand.map(c => `${c.emoji}`).join(" ")}: \`${getCardPoints(h.hand, casinoSettings)}\`\r\n`; });
                            }
                            else
                            {
                                playerCardsText = `${pHandText}${generateFinalResult(playerCards, getCardPoints(dealerCards, casinoSettings), casinoSettings)}`;
                            }
                        }

                        if (update === "dealer")
                        {
                            dealerCardsText = `${dHandText}${dealerCards.map(c => `${c.emoji}`).join(" ")}: \`${getCardPoints(dealerCards, casinoSettings)}\``;
                        }

                        embed.setDescription(`**${dealerCardsText}\r\n\r\n${playerCardsText}**`)
                            .setFooter({ text: `Активная рука: ${failed ? `-` : currentHand + 1}` });
                    }

                    switch (i.customId)
                    {
                        case "hit":
                            addPlayerCards(playerCards[currentHand], cards);

                            updateBlackjackInfo("player", false);

                            const hitSumOfPoints = getCardPoints(playerCards[currentHand].hand, casinoSettings);

                            if (hitSumOfPoints > casinoSettings.blackjack.max_value)
                            {
                                if (currentHand + 1 < playerCards.length) return updateInteraction(true, true);

                                collector.off("collect", game);

                                const getFailed = failedHands(playerCards, 0, casinoSettings);

                                updateBlackjackInfo("player", true);

                                const getAllSum = addAllSum(playerCards, getCardPoints(dealerCards, casinoSettings), casinoSettings);

                                updateInteraction(false, false);

                                if (getFailed < playerCards.length) await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findUser.balance + getAllSum } });

                                return;
                            }

                            updateInteraction(false, true);
                            break;

                        case "stand":
                            updateBlackjackInfo("player", false);

                            if (currentHand + 1 < playerCards.length) return updateInteraction(true, true);

                            collector.off("collect", game);

                            addDealerCards(dealerCards, cards, casinoSettings);

                            updateBlackjackInfo("player", true);
                            updateBlackjackInfo("dealer", true);

                            updateInteraction(false, false);

                            const standGetAllSum = addAllSum(playerCards, getCardPoints(dealerCards, casinoSettings), casinoSettings);

                            if (standGetAllSum > 0) await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findUser.balance + standGetAllSum } });

                            break;

                        case "double":
                            if (findUser.balance < playerCards[currentHand].bet * 2) { i.reply({ embeds: [simpleEmbeds("error", commandName, `У вас не хватает денег.`)], ephemeral: true }).catch((_) => { }); return; }

                            findUser.balance -= playerCards[currentHand].bet / 2;

                            await usersCollection.updateOne({ id: interaction.user.id }, { $set: { balance: findUser.balance } });

                            playerCards[currentHand].bet *= 2;

                            addPlayerCards(playerCards[currentHand], cards);

                            updateBlackjackInfo("player", false);

                            if (currentHand + 1 < playerCards.length) return updateInteraction(true, true);

                            collector.off("collect", game);

                            addDealerCards(dealerCards, cards, casinoSettings);

                            updateBlackjackInfo("player", true);
                            updateBlackjackInfo("dealer", true);

                            updateInteraction(false, false);

                            const getDoubleAllSum = addAllSum(playerCards, getCardPoints(dealerCards, casinoSettings), casinoSettings);

                            if (getDoubleAllSum > 0) await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findUser.balance + getDoubleAllSum } });
                            break;

                        case "split":
                            if (findUser.balance < getBet) { i.reply({ embeds: [simpleEmbeds("error", commandName, `У вас не хватает денег.`)], ephemeral: true }).catch((_) => { }); return; }
                            if (playerCards.length >= casinoSettings.blackjack.player.max_splits) { i.reply({ embeds: [simpleEmbeds("error", commandName, `Сплит запрещен. Максимум: ${casinoSettings.blackjack.player.max_splits}`)], ephemeral: true }).catch((_) => { }); return; }

                            findUser.balance -= getBet;

                            await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findUser.balance } });

                            playerCards.push({ bet: getBet, surrend: false, hand: playerCards[currentHand].hand.splice(0, 1) });

                            updateBlackjackInfo("player", false);
                            updateInteraction(false, true);
                            break;

                        case "surrend":
                            playerCards[currentHand].surrend = true;

                            if (currentHand + 1 < playerCards.length) return updateInteraction(true, true);

                            collector.off("collect", game);

                            updateBlackjackInfo("player", true);
                            updateInteraction(false, false);

                            const getAllSum = addAllSum(playerCards, getCardPoints(dealerCards, casinoSettings), casinoSettings);

                            if (getAllSum > 0) await usersCollection.updateOne({ id: i.user.id }, { $set: { balance: findUser.balance + getAllSum } });
                            break;
                    }
                }

                collector.on("collect", game);
            }, (_) => { });
        }
    }
}