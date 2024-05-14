import { ButtonStyle } from "discord.js";

interface Button {
    custom_id: string,
    style: ButtonStyle,
    label?: string,
    emoji?: string,
    url?: string
    disabled?: boolean,
}

interface ButtonParserParameters {
    rows: Record<string, Array<Button>>
}

export default ButtonParserParameters;