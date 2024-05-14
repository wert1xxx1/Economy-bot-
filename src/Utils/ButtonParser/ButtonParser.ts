import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";

import ButtonParserParameters from "../../Types/Bot/Interface/ButtonParserParameters";

const ButtonParser = async (params: ButtonParserParameters): Promise<Array<ActionRowBuilder<ButtonBuilder>>> => {
    return new Promise((resolve, reject) => {
        try
        {
            var buttons: Array<ActionRowBuilder<ButtonBuilder>> = [], used_ids: Array<string> = [];

            for (let b_rows in params.rows)
            {
                if (params.rows[b_rows].length > 5) reject(`Param "${b_rows}" not array or "${b_rows}" length more than 5.`)

                const actionRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder();

                for (let i = 0; i < params.rows[b_rows].length; i++)
                {
                    const button: ButtonBuilder = new ButtonBuilder();

                    for (let k in params.rows[b_rows][i])
                    {
                        switch (k)
                        {
                            case 'custom_id':
                                if (!params.rows[b_rows][i][k] || params.rows[b_rows][i][k].length == 0) reject(`"${k}" cannot be undefined or empty.`);

                                if (used_ids.includes(params.rows[b_rows][i][k])) reject(`This id: "${params.rows[b_rows][i][k]}" already used.`);

                                used_ids.push(params.rows[b_rows][i][k]);

                                button.setCustomId(params.rows[b_rows][i][k]);
                                break;

                            case 'label':
                                if (!params.rows[b_rows][i][k] || params.rows[b_rows][i][k].length == 0) reject(`"${k}" cannot be undefined or empty.`);

                                button.setLabel(params.rows[b_rows][i][k]);
                                break;

                            case 'style':
                                button.setStyle(params.rows[b_rows][i][k]);
                                break;

                            case 'emoji':
                                if (!params.rows[b_rows][i][k] || params.rows[b_rows][i][k].length == 0) reject(`"${k}" cannot be undefined or empty.`);
                                if (!params.rows[b_rows][i][k].match(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])|([\w]{1,32}:[\d+]{1,32})/gmi)) reject(`Emoji format for button incorrect.`)

                                button.setEmoji(params.rows[b_rows][i][k]);
                                break;

                            case 'disabled':
                                button.setDisabled(params.rows[b_rows][i][k]);
                                break;

                            case 'url':
                                if (!params.rows[b_rows][i][k] || params.rows[b_rows][i][k].length == 0) reject(`"${k}" cannot be undefined or empty.`);

                                if (!button.data.style || button.data.style != ButtonStyle.Link) reject(`This button don't have a style: "link".`)

                                button.setURL(params.rows[b_rows][i][k]);
                                break;
                        }
                    }

                    actionRow.addComponents([button]);
                }
                buttons.push(actionRow);
            }

            resolve(buttons);
        } catch (err)
        {
            reject(`Error while generating buttons:\n\n${err.stack}`);
        }
    });
};

export default ButtonParser;