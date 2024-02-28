# Rembg Node

> ⚠️ This project is unmaintained. I wouldn't recommend using it either.<br>Some of the algorithms are missing and results are often not great.<br>I instead recommend you check out my other package:<br>https://github.com/makidoll/transparent-background-npm

---

[![](https://img.shields.io/npm/v/rembg-node)](https://www.npmjs.com/package/rembg-node)

Rembg lets you **easily remove backgrounds** from images using the [U2-Net AI model](https://github.com/xuebinqin/U-2-Net)

This is a loose port of the original [Rembg for Python](https://github.com/danielgatis/rembg), big thanks to [@danielgatis](https://github.com/danielgatis)

It uses [sharp](https://github.com/lovell/sharp) for input and output so you can easily integrate it

The masking algorithm isn't fully complete yet, but the results are pretty good already!

```bash
yarn add sharp rembg-node

npm install sharp rembg-node
```

## Example

<img height="180" src="https://user-images.githubusercontent.com/8362329/178584133-4aa2483a-8b9c-4f7b-a785-ddcba800e57f.png"/>

```ts
import { Rembg } from "rembg-node";
import sharp from "sharp";

// const { Rembg } = require("rembg-node");
// const sharp = require("sharp");

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
```
