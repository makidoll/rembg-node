import * as fs from "fs/promises";
import { IncomingMessage } from "http";
import * as https from "https";
// import * as stream from "stream";
// import * as util from "util";
import * as crypto from "crypto";

// const pipeline = util.promisify(stream.pipeline);

function request(options: https.RequestOptions): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		const req = https.request(options, res => {
			if (res.headers.location) {
				const url = new URL(res.headers.location);
				resolve(
					request({
						method: "GET",
						hostname: url.hostname,
						path: url.pathname + url.search,
					}),
				);
			} else {
				resolve(res);
			}
		});
		req.on("error", error => {
			reject(error);
		});
		req.end();
	});
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const data = [];
		stream.on("data", chunk => {
			data.push(chunk);
		});
		stream.on("end", () => {
			resolve(Buffer.concat(data));
		});
		stream.on("error", error => {
			reject(error);
		});
	});
}

function getMd5Hash(data: Buffer) {
	return crypto.createHash("md5").update(data).digest("hex").toLowerCase();
}

// super primitive lol but works for now
export async function gdown(id: string, savePath: string, md5?: string) {
	const url = new URL("https://drive.google.com/uc?id=" + id);

	const res = await request({
		method: "GET",
		hostname: url.hostname,
		path: url.pathname + url.search,
	});

	const downloadable = res.headers["content-disposition"] != null;

	const writeFile = async (resToWrite: IncomingMessage) => {
		// const fh = await fs.open(savePath, "w+");
		// await pipeline(resToWrite, fh.createWriteStream());
		// fh.close();

		const buffer = await streamToBuffer(resToWrite);

		if (md5 != null && getMd5Hash(buffer) != md5.trim().toLowerCase()) {
			throw new Error("Invalid md5 checksum");
		}

		await fs.writeFile(savePath, buffer);
	};

	if (downloadable) {
		await writeFile(res);
	} else {
		const html = (await streamToBuffer(res)).toString("utf8");

		const urlMatches = html.match(/action="([^]+?\/uc\?id=[^]+?)"/i);
		if (urlMatches == null)
			throw new Error("Failed to download gdrive link");

		const actualUrl = new URL(urlMatches[1].replace(/&amp;/g, "&"));
		const actualRes = await request({
			method: "POST",
			hostname: actualUrl.hostname,
			path: actualUrl.pathname + actualUrl.search,
		});

		const actualDownloadable =
			actualRes.headers["content-disposition"] != null;

		if (!actualDownloadable)
			throw new Error("Failed to download gdrive link");

		await writeFile(actualRes);
	}
}
