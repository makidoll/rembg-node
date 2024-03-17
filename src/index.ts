import * as fs from "fs/promises";
import { InferenceSession, Tensor } from "onnxruntime-node";
import * as os from "os";
import * as path from "path";
import * as sharp from "sharp";
import { gdown } from "./gdown";

function getMax(buffer: Buffer): number {
	let max = 0;
	for (let i = 0; i < buffer.length; i++) {
		if (buffer[i] > max) max = buffer[i];
	}
	return max;
}

function concatFloat32Array(arrays: Float32Array[]): Float32Array {
	let length = 0;
	for (const array of arrays) length += array.length;

	const output = new Float32Array(length);

	let outputIndex = 0;
	for (const array of arrays) {
		for (let n of array) {
			output[outputIndex] = n;
			outputIndex++;
		}
	}

	return output;
}

function binaryErosion(
	data: boolean[],
	width: number,
	height: number,
	erodeSize: number,
	borderValue = 0,
) {
	if (data.length != width * height) throw new Error("Invalid data length");

	const output: boolean[] = [];

	const sample = (x: number, y: number) => {
		if (x < 0 || x > width - 1) return borderValue;
		if (y < 0 || y > height - 1) return borderValue;
		return data[y * width + (x % width)];
	};

	for (let i = 0; i < data.length; i++) {
		const x = i % width;
		const y = Math.floor(i / width);

		let current = true;

		// size 3  size 4
		// x x x   x x x x
		// x @ x   x x x x
		// x x x   x x @ x
		//         x x x x

		for (
			let deltaX = -Math.floor(erodeSize / 2);
			deltaX < Math.ceil(erodeSize / 2);
			deltaX++
		) {
			for (
				let deltaY = -Math.floor(erodeSize / 2);
				deltaY < Math.ceil(erodeSize / 2);
				deltaY++
			) {
				if (sample(x + deltaX, y + deltaY) == false) {
					current = false;
					break;
				}
			}
			if (current == false) break;
		}

		output.push(current);
	}

	return output;
}

const exists = async (path: string) =>
	(await fs.stat(path).catch(() => {})) != null;

export class Rembg {
	private modelDownloaded = false;
	private promisesResolvesUntillDownloaded: ((value: unknown) => void)[] = [];

	private readonly u2netHome =
		process.env["U2NET_HOME"] ?? path.resolve(os.homedir(), ".u2net");

	readonly modelPath = path.resolve(this.u2netHome, "u2net.onnx");

	private log(message?: any) {
		if (this.options.logging === false) return;
		console.log(message);
	}

	constructor(private readonly options: { logging?: boolean } = {}) {
		this.ensureModelDownloaded();
	}

	private async ensureModelDownloaded() {
		// https://github.com/danielgatis/rembg/blob/9839adca961369e18f52e655d8a475acf07e7741/rembg/session_factory.py#L23

		if (await exists(this.modelPath)) {
			this.log("U2-Net model found!");
			this.modelDownloaded = true;
		} else {
			this.log("U2-Net model downloading...");

			if (!(await exists(this.u2netHome))) await fs.mkdir(this.u2netHome);
			await gdown(
				"1tCU5MM1LhRgGou5OpmpjBQbSrYIUoYab",
				this.modelPath,
				"60024c5c889badc19c04ad937298a77b",
			);

			this.log("U2-Net model downloaded!");

			this.modelDownloaded = true;
		}

		for (const resolve of this.promisesResolvesUntillDownloaded) {
			resolve(null);
		}
	}

	async remove(sharpInput: sharp.Sharp) {
		if (this.modelDownloaded == false) {
			await new Promise(resolve => {
				this.promisesResolvesUntillDownloaded.push(resolve);
			});
		}

		// https://github.com/danielgatis/rembg/blob/9839adca961369e18f52e655d8a475acf07e7741/rembg/session_simple.py#L15
		// https://github.com/danielgatis/rembg/blob/9839adca961369e18f52e655d8a475acf07e7741/rembg/session_base.py#L14

		const imageSize = 320;
		const { width, height } = await sharpInput.metadata();

		// 0 to 255
		let inputPixels = await sharpInput
			.clone()
			// lanczos2 is smooth, lanczos3 is sharp
			.resize(imageSize, imageSize, { kernel: "lanczos3", fit: "fill" })
			.removeAlpha()
			.raw()
			.toBuffer();

		const inputChannels = [
			new Float32Array(imageSize * imageSize),
			new Float32Array(imageSize * imageSize),
			new Float32Array(imageSize * imageSize),
		];

		const max = getMax(inputPixels);
		const mean = [0.485, 0.456, 0.406];
		const std = [0.229, 0.224, 0.225];

		for (let i = 0; i < inputPixels.length; i++) {
			const channel = i % 3;
			const channelIndex = Math.floor(i / 3);
			// TODO: look at this again
			inputChannels[channel][channelIndex] =
				(inputPixels[i] / max - mean[channel]) / std[channel];
		}

		const input = concatFloat32Array([
			inputChannels[2],
			inputChannels[0],
			inputChannels[1],
		]);

		console.log("process 1 passed")

		const session = await InferenceSession.create(this.modelPath);

		const results = await session.run({
			"input.1": new Tensor("float32", input, [1, 3, 320, 320]),
		});

		const mostPreciseOutputName = String(
			Math.min(...session.outputNames.map(name => +name)),
		);

		const outputMaskData = results[mostPreciseOutputName]
			.data as Float32Array;

		for (let i = 0; i < outputMaskData.length; i++) {
			outputMaskData[i] = outputMaskData[i] * 255;
		}

		console.log("process 2 passed")

		// will make [rgb rgb rgb] unfortunately
		const sharpMask = await sharp(outputMaskData, {
			raw: { channels: 1, width: imageSize, height: imageSize },
		})
			.resize(width, height, { fit: "fill" })
			.raw()
			.toBuffer();

		// width * height array of 0 to 255
		const maskData: number[] = [];
		for (let i = 0; i < sharpMask.length; i += 3)
			maskData.push(sharpMask[i]);

		// https://github.com/danielgatis/rembg/blob/main/rembg/bg.py#L43
		// my implementation isn't correct but it will do for now

		// const foregroundThreshold = 240;
		// const backgroundThreshold = 10;
		// const erosionSize = 10;

		// let isFg = maskData.map(pixel => pixel > foregroundThreshold);
		// let isBg = maskData.map(pixel => pixel < backgroundThreshold);

		// isFg = binaryErosion(isFg, width, height, erosionSize, 0);
		// isBg = binaryErosion(isBg, width, height, erosionSize, 1);

		// const trimap: number[] = [];
		// for (let i = 0; i < width * height; i++) {
		// 	trimap[i] = isFg[i] ? 255 : isBg[i] ? 0 : 128;
		// }

		// sharp(Buffer.from(trimap), {
		// 	raw: { channels: 1, width, height },
		// })
		// 	.png()
		// 	.toFile("trimap.png");

		// sharp(Buffer.from(maskData), {
		// 	raw: { channels: 1, width, height },
		// })
		// 	.png()
		// 	.toFile("mask.png");

		// test these values first

		console.log("process 3 passed")

		const finalPixels = await sharpInput
			.clone()
			.ensureAlpha()
			.raw({})
			.toBuffer();

		for (let i = 0; i < finalPixels.length / 4; i++) {
			let alpha = sharpMask[i * 3];
			// if (alpha < foregroundThreshold) alpha = 0;
			// let alpha = trimap[i];
			finalPixels[i * 4 + 3] = alpha;
		}

		console.log("process 4 passed")

		return sharp(finalPixels, {
			raw: { channels: 4, width, height },
		});
	}
}
