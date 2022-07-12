# Rembg Node

Rembg lets you **easily remove backgrounds** from images using the [U2-Net ai model](https://github.com/xuebinqin/U-2-Net)

This is a loose port of the original [Rembg for Python](https://github.com/danielgatis/rembg), big thanks to [@danielgatis](https://github.com/danielgatis)

It uses [sharp](https://github.com/lovell/sharp) for input and output so you can easily integrate it

The masking algorithm isn't fully complete yet, but the results are pretty awesome already!

## Example (TypeScript)

```ts
import { RemBg } from "rembg-node";
import sharp from "sharp";

(async () => {
	const input = sharp("test-input.jpg");

	// optional arguments
	const rembg = new RemBg({
		logging: true,
	});

	const output = await rembg.remove(input);

	await output.webp().toFile("test-output.webp");
})();
```
