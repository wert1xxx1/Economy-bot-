type color = "red" | "black" | "green";

const checkColor = (number: number): color => {
    if (number == 0) return "green";

    return (number % 2 == 0 ? "black" : "red");
}

export default checkColor;