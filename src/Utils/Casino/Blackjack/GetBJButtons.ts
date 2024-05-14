import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import ButtonParser from "../../ButtonParser/ButtonParser";

const getBJButtons = async (hit: boolean, stand: boolean, double: boolean, split: boolean, surrend: boolean): Promise<Promise<Array<ActionRowBuilder<ButtonBuilder>>>> => {
    const buttonsGroup = await ButtonParser(
        {
            rows:
            {
                first:
                    [
                        {
                            custom_id: "hit",
                            label: "Взять",
                            style: ButtonStyle.Secondary,
                            disabled: hit
                        },
                        {
                            custom_id: "stand",
                            label: "Оставить",
                            style: ButtonStyle.Secondary,
                            disabled: stand
                        },
                        {
                            custom_id: "double",
                            label: "Удвоение",
                            style: ButtonStyle.Secondary,
                            disabled: double
                        }
                    ],
                second:
                    [
                        {
                            custom_id: "split",
                            label: "Разделение",
                            style: ButtonStyle.Secondary,
                            disabled: split
                        },
                        {
                            custom_id: "_",
                            emoji: "❌",
                            style: ButtonStyle.Secondary,
                            disabled: true
                        },
                        {
                            custom_id: "surrend",
                            label: "Отказ",
                            style: ButtonStyle.Secondary,
                            disabled: surrend
                        }
                    ]
            }
        }
    );

    return buttonsGroup;
}

export default getBJButtons;