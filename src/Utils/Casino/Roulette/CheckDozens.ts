type column = "first" | "second" | "third";

const checkDozens = (number: number): column => {
    if (number == 0) return null;

    if (number >= 1 && number <= 12) return "first";
    if (number >= 13 && number <= 24) return "second";
    if (number >= 25 && number <= 36) return "third";
}

export default checkDozens;