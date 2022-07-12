import { RemBg } from "./dist/index.js";
import sharp from "sharp";

(async () => {
	const input = sharp("test-input.jpg");

	const rembg = new RemBg({
		logging: true,
	});

	const output = await rembg.remove(input);
	await output.webp().toFile("test-output.webp");
})();
