import { Canvas, Image, CanvasRenderingContext2D } from "canvas";

const generateBanner = (canvas: Canvas, ctx: CanvasRenderingContext2D, image: Image, text: string): Buffer => {
    ctx.restore();

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    ctx.font = '86px "Montserrat"';
    ctx.fillStyle = "#FFFFFF"

    ctx.shadowBlur = 8;
    ctx.shadowColor = "#FFFFFF";

    ctx.textAlign = "center";

    ctx.fillText(text, 1740, 993);

    return canvas.toBuffer();
}

export default generateBanner;