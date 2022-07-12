# Rembg Node

Rembg lets you **easily remove backgrounds** from images using the [U2-Net AI model](https://github.com/xuebinqin/U-2-Net)

This is a loose port of the original [Rembg for Python](https://github.com/danielgatis/rembg), big thanks to [@danielgatis](https://github.com/danielgatis)

It uses [sharp](https://github.com/lovell/sharp) for input and output so you can easily integrate it

The masking algorithm isn't fully complete yet, but the results are pretty awesome already!

## Example

<img height="150" src="https://user-images.githubusercontent.com/8362329/178580004-9bf4f02c-13ad-404a-823a-47cc3e938fd7.png"/>

```ts
import { RemBg } from "rembg-node";
import sharp from "sharp";

// const { RemBg } = require("rembg-node");
// const sharp = require("sharp");

(async () => {
	const input = sharp("test-input.jpg");

	// optional arguments
	const rembg = new RemBg({
		logging: true,
	});

	const output = await rembg.remove(input);

	await output.webp().toFile("test-output.webp");

	// optionally you can use .trim() too!
	await output.trim().webp().toFile("test-output-trimmed.webp");
})();
```
