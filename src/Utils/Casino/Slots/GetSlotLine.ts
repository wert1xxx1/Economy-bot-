import SlotItem from "../../../Types/Bot/Interface/SlotItem";

const getSlotLine = (emojis: Array<SlotItem>, lineSize: number) => {
    let slotLine: Array<SlotItem> = [];

    for (let i = 0; i < lineSize; i++) slotLine.push(emojis[Math.floor(Math.random() * (emojis.length - 1))]);

    return slotLine;
}

export default getSlotLine;