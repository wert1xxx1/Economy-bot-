type half = "first" | "second"

const checkHalf = (number: number): half => {
    if (number == 0) return null;

    if (number >= 1 && number <= 18) return "first";
    if (number >= 19 && number <= 36) return "second";
}

export default checkHalf;