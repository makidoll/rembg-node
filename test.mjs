import { Rembg } from "./dist/index.js";
import sharp from "sharp";

(async () => {
	const input = sharp("test-input.jpg");

	// optional arguments
	const rembg = new Rembg({
		logging: true,
	});

	const output = await rembg.remove(input);

	await output.webp().toFile("test-output.webp");

	// optionally you can use .trim() too!
	await output.trim().webp().toFile("test-output-trimmed.webp");
})();
